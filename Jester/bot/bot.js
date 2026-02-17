import { Client, Events, Routes } from '@fluxerjs/core';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: 32767,
});

const API_URL = 'http://127.0.0.1:8000/api/jesters';

// Map<UserId, List[Jester]>
const tupperCache = new Map();
// Map<LocalPath, PublicUrl>
const uploadedAvatarUrls = new Map();

client.on(Events.Ready, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === 'j!ping') {
        await message.reply('Pong!');
        return;
    }

    // Fetch jesters for this user
    let jesters = tupperCache.get(message.author.id);

    if (!jesters) {
        try {
            const response = await axios.get(`${API_URL}/${message.author.id}`);
            jesters = response.data;
            tupperCache.set(message.author.id, jesters);
            setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
        } catch (error) {
            // console.error('Failed to fetch jesters:', error.message); 
            // Suppress 404 logs to keep console clean if user has no jesters
            return;
        }
    }

    if (!jesters || jesters.length === 0) return;

    const content = message.content;
    const matchedJester = jesters.find(j => content.startsWith(j.prefix + ":") || content.startsWith(j.prefix + " :"));

    if (matchedJester) {
        let innerContent = content.substring(matchedJester.prefix.length).trim();
        while (innerContent.startsWith(":")) {
            innerContent = innerContent.substring(1).trim();
        }

        try {
            // Find or create webhook
            const webhooks = await message.channel.fetchWebhooks();
            let webhook = webhooks.find(w => w.name === 'Jester Proxy');

            if (!webhook) {
                webhook = await message.channel.createWebhook({
                    name: 'Jester Proxy',
                });
            }

            // Resolve Avatar URL
            // The API now returns 'discord_avatar_url' if set, otherwise 'avatar_url' (the local path)
            // But wait, our API schema logic says resolve_avatar_url returns discord_url if present, else local.
            // So 'matchedJester.avatar_url' should ALREADY be the correct one!
            let avatarUrl = matchedJester.avatar_url;
            console.log(`Matched Jester: ${matchedJester.name}, Avatar URL from API: ${avatarUrl}`);

            // If it's a local path (starts with /media), we try to convert it to a Discord URL
            if (avatarUrl && avatarUrl.startsWith('/media')) {
                const cacheKey = avatarUrl;
                let cachedUrl = uploadedAvatarUrls.get(cacheKey);
                console.log(`Checking cache for key: ${cacheKey}, Found: ${cachedUrl}`);

                if (!cachedUrl) {
                    try {
                        // Construct absolute local path
                        // project_root/web/media/...
                        // __dirname is .../Jester/bot
                        const localPath = path.resolve(__dirname, '..', 'web', '.' + avatarUrl);
                        console.log(`Attempting upload from local path: ${localPath}`);

                        if (fs.existsSync(localPath)) {
                            const fileBuffer = fs.readFileSync(localPath);
                            const fileName = path.basename(localPath);

                            // Send file to channel to get a URL using direct REST call to avoid library bug
                            const attachmentMsgData = await client.rest.post(Routes.channelMessages(message.channel.id), {
                                body: {
                                    content: 'Uploading avatar...'
                                },
                                files: [{
                                    name: fileName,
                                    data: fileBuffer
                                }]
                            });

                            const attachment = attachmentMsgData.attachments && attachmentMsgData.attachments[0];
                            if (attachment) {
                                avatarUrl = attachment.url;
                                uploadedAvatarUrls.set(cacheKey, avatarUrl);
                                console.log(`Uploaded and cached: ${avatarUrl}`);

                                // SAVE TO DATABASE
                                try {
                                    await axios.patch(`${API_URL}/${matchedJester.id}`, {
                                        discord_avatar_url: avatarUrl
                                    });
                                    console.log('Saved Fluxer Avatar URL to database!');
                                } catch (dbErr) {
                                    console.error('Failed to save avatar URL to DB:', dbErr.message);
                                }

                                // Delete the temp message
                                // await client.rest.delete(Routes.channelMessage(message.channel.id, attachmentMsgData.id));
                            }
                        } else {
                            console.warn(`Local avatar file not found: ${localPath}`);
                            avatarUrl = null; // Fallback to default
                        }
                    } catch (uploadErr) {
                        console.error('Failed to upload local avatar:', uploadErr);
                        avatarUrl = null; // Fallback
                    }
                } else {
                    avatarUrl = cachedUrl;
                }
            } else if (avatarUrl && !avatarUrl.startsWith('http')) {
                // Unknown format, maybe relative but not /media?
                console.warn(`Unknown avatar URL format: ${avatarUrl}`);
                avatarUrl = null;
            }

            console.log(`Final avatar URL sent to webhook: ${avatarUrl}`);

            // Send as Jester using direct REST call to ensure params are passed correctly
            await client.rest.post(Routes.webhookExecute(webhook.id, webhook.token), {
                body: {
                    username: matchedJester.name,
                    avatar_url: avatarUrl || undefined,
                    content: innerContent
                },
                auth: false // Webhook execution doesn't use bot token auth
            });

            // Delete original message
            try {
                await message.delete();
            } catch (delErr) {
                console.warn('Failed to delete original message:', delErr.message);
            }

        } catch (err) {
            console.error('Error proxying message:', err);
        }
    }
});

client.login(process.env.FLUXER_BOT_TOKEN);
