import { Client, Events, Routes, EmbedBuilder } from '@fluxerjs/core';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

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

    // Command: j!create or j!c
    // Strict match: j!create or j!c followed by space or end of string
    if (/^j!(create|c)(\s|$)/i.test(message.content)) {
        const argsString = message.content.replace(/^j!(create|c)\s*/i, '').trim();

        if (!argsString) {
            return message.reply("**Jester Creation**\nUsage: `j!create <Name> <Prefix:msg>`\nExample: `j!c \"My Jester\" MJ:msg`\n\nYou can attach an image to set the avatar!");
        }

        let name = '';
        let trigger = '';

        // Manually parse to detect unbalanced quotes
        if (argsString.startsWith('"')) {
            const closingQuoteIndex = argsString.indexOf('"', 1);
            if (closingQuoteIndex === -1) {
                return message.reply("Name Error: Name has no end (missing closing quote).");
            }
            name = argsString.substring(1, closingQuoteIndex);
            trigger = argsString.substring(closingQuoteIndex + 1).trim();

            if (!trigger) {
                return message.reply("Invalid format. Missing prefix trigger.\nUsage: `j!c <Name> <Prefix:msg>`");
            }
            // Check for too many arguments (spaces in the remaining part)
            // We expect strictly one token for the prefix trigger
            if (trigger.includes(' ')) {
                return message.reply("Error: Too many arguments. Usage: `j!c <Name> <Prefix:msg>`");
            }

        } else {
            // No quotes, split by space
            const parts = argsString.split(/\s+/);
            if (parts.length > 2) {
                return message.reply("Error: Too many arguments. Usage: `j!c <Name> <Prefix:msg>`. If your name has spaces, use quotes.");
            }
            name = parts[0];
            trigger = parts[1];
        }

        if (!name || !trigger) {
            return message.reply("Invalid format. Please provide a name and a prefix trigger.\nUsage: `j!c <Name> <Prefix:msg>`");
        }

        // Validate trigger format: Prefix + Separator + msg
        // Regex: (prefix) (separator) (msg)
        // Separator is any special char: [^a-zA-Z0-9\s]
        const triggerMatch = trigger.match(/^(.+?)([^a-zA-Z0-9\s])(msg)$/i);

        if (!triggerMatch) {
            // Check if it's missing the 'msg' part specifically or the separator
            if (!trigger.toLowerCase().endsWith('msg')) {
                return message.reply("Prefix Error: The trigger must end with 'msg' (e.g. `Prefix:msg`).");
            }
            return message.reply("Invalid prefix format. It must contain a separator (like `:`, `-`, `.`, etc) followed by `msg`.\nExample: `MJ:msg`, `MJ-text` is NOT valid (must be msg). Wait, user said ONLY msg.");
        }

        const prefix = triggerMatch[1]; // The part before separator

        // Prepare form data
        const form = new FormData();
        form.append('name', name);
        form.append('prefix', prefix);
        form.append('user_id', message.author.id); // Set owner to command sender

        const attachment = message.attachments.first();
        console.log(`[DEBUG] Attachments info: Size=${message.attachments.size}, Type=${message.attachments.constructor.name}`);
        if (message.attachments.size > 0) {
            const firstKey = message.attachments.keys().next().value;
            console.log('[DEBUG] First attachment:', message.attachments.get(firstKey));
        }

        const isImage = attachment && (
            (attachment.contentType && attachment.contentType.startsWith('image/')) ||
            (attachment.url && /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(attachment.url))
        );

        if (isImage) {
            console.log(`[DEBUG] Valid image found: ${attachment.url}`);
            try {
                const imageResponse = await axios.get(attachment.url, { responseType: 'stream' });
                console.log(`[DEBUG] Downloaded image stream. Appending to form.`);
                form.append('avatar', imageResponse.data, attachment.name);
            } catch (err) {
                console.error("[DEBUG] Failed to download attachment:", err);
                return message.reply("Failed to download attached image.");
            }
        } else {
            console.log("[DEBUG] No valid image attachment found (Check content-type or extension).");
            if (attachment) console.log(`[DEBUG] Attachment details: Type=${attachment.contentType}, URL=${attachment.url}`);
        }

        try {
            const response = await axios.post(`${API_URL}/`, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            // Invalidate cache for this user so valid jester list is fetched next time
            tupperCache.delete(message.author.id);

            return message.reply(`Successfully created Jester **${response.data.name}** with prefix \`${response.data.prefix}\`!`);
        } catch (error) {
            console.error('Creation failed:', error.response ? error.response.data : error.message);
            let errorMsg = "Please try again.";

            if (error.response && error.response.data && error.response.data.detail) {
                errorMsg = typeof error.response.data.detail === 'string'
                    ? error.response.data.detail
                    : JSON.stringify(error.response.data.detail);
            }

            return message.reply(`Failed to create Jester. ${errorMsg}`);
        }
    }


    // Command: j!info or j!i
    // Strict match: j!info or j!i followed by space or end of string
    if (/^j!(info|i)(\s|$)/i.test(message.content)) {
        let queryName = message.content.replace(/^j!(info|i)\s*/i, '').trim();

        // Handle quotes if present (strip surrounding quotes)
        if (queryName.startsWith('"') && queryName.endsWith('"')) {
            queryName = queryName.slice(1, -1);
        } else if (queryName.startsWith("'") && queryName.endsWith("'")) {
            queryName = queryName.slice(1, -1);
        }

        if (!queryName) {
            return message.reply(`Usage: \`j!info <Jester Name>\`\nExample: \`j!i "My Jester"\` or \`j!info MyJester\``);
        }

        // Fetch jesters for this user if not cached
        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                console.error('Failed to fetch jesters for info:', error.message);
                return message.reply("Failed to fetch your Jesters. Please try again later.");
            }
        }

        if (!jesters || jesters.length === 0) {
            return message.reply("You don't have any Jesters yet.");
        }

        const target = queryName.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (exactMatch) {
            const embed = new EmbedBuilder()
                .setTitle(exactMatch.name)
                .addFields(
                    { name: 'Prefix', value: `\`${exactMatch.prefix}\``, inline: true }
                );

            if (exactMatch.discord_avatar_url) {
                embed.setThumbnail(exactMatch.discord_avatar_url);
            } else if (exactMatch.avatar_url) {
                const avatarUrl = exactMatch.avatar_url.startsWith('http')
                    ? exactMatch.avatar_url
                    : `${API_URL.replace('/api/jesters', '')}${exactMatch.avatar_url}`;
                embed.setThumbnail(avatarUrl);
            }

            return message.reply({ embeds: [embed] });
        }

        // No exact match, search for similarities
        const candidates = jesters.filter(j => {
            const name = j.name.toLowerCase();
            return name.includes(target) || levenshteinDistance(name, target) <= 2;
        });

        if (candidates.length > 0) {
            const similarNames = [...new Set(candidates.map(c => c.name))].join(', ');
            return message.reply(`Jester doesn't exist. Similar Jester(s) found: ${similarNames}`);
        }

        return message.reply("Jester doesn't exist.");
    }

    // Command: j!help or j!h
    if (/^j!(help|h)(\s|$)/i.test(message.content)) {
        const helpEmbed = new EmbedBuilder()
            .setTitle("Jester Bot Help")
            .setDescription("Here are the available commands:")
            .addFields(
                {
                    name: '🎭 Create a Jester',
                    value: '`j!create <Name> <Prefix:msg>`\nExample: `j!c "My Jester" MJ:msg`\n*(Attach an image to set avatar)*'
                },
                {
                    name: 'ℹ️ Jester Info',
                    value: '`j!info <Name>`\nExample: `j!i "My Jester"`'
                },
                {
                    name: '❓ Help',
                    value: '`j!help`'
                }
            )
            .setFooter({ text: 'Fluxer Jester Bot' });

        return message.reply({ embeds: [helpEmbed] });
    }

    // Catch-all for unknown j! commands
    if (message.content.toLowerCase().startsWith('j!')) {
        return message.reply("Unknown command.");
    }

    // Fetch jesters for this user
    let jesters = tupperCache.get(message.author.id);

    if (!jesters) {
        try {
            const response = await axios.get(`${API_URL}/user/${message.author.id}`);
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

            // Priority:
            // 1. Validate 'discord_avatar_url' if present.
            // 2. If valid, use it.
            // 3. If invalid or missing, use 'local_avatar_url', upload it, and update DB.

            let avatarUrl = matchedJester.discord_avatar_url;
            let needsUpload = false;

            if (avatarUrl) {
                try {
                    console.log(`Validating existing avatar URL: ${avatarUrl}`);
                    await axios.head(avatarUrl);
                    console.log("Avatar URL is valid.");
                } catch (err) {
                    console.warn(`Avatar URL validation failed (${err.response ? err.response.status : err.message}). Falling back to local upload.`);
                    avatarUrl = null;
                    needsUpload = true;
                }
            } else {
                needsUpload = true;
            }

            if (needsUpload) {
                // Fallback to local path if available
                const localUrl = matchedJester.local_avatar_url;

                if (localUrl && localUrl.startsWith('/media')) {
                    const cacheKey = localUrl;

                    let cachedUrl = uploadedAvatarUrls.get(cacheKey);
                    if (cachedUrl) {
                        avatarUrl = cachedUrl;
                        console.log(`Found in session cache: ${avatarUrl}`);
                        try {
                            await axios.patch(`${API_URL}/${matchedJester.id}`, { discord_avatar_url: avatarUrl });
                        } catch (e) {
                            console.error("Failed to patch DB from cache:", e.message);
                        }
                    } else {
                        try {
                            const localPath = path.resolve(__dirname, '..', 'web', '.' + localUrl);
                            console.log(`Attempting upload from local path: ${localPath}`);

                            if (fs.existsSync(localPath)) {
                                const fileBuffer = fs.readFileSync(localPath);
                                const fileName = path.basename(localPath);

                                console.log('Searching for storage channel: jesters-image-gallery');
                                let storageChannel = client.channels.cache.find(c => c.name === 'jesters-image-gallery');

                                if (!storageChannel) {
                                    console.warn("Could not find 'jesters-image-gallery' channel in cache!");
                                    storageChannel = message.channel;
                                }

                                const attachmentMsgData = await client.rest.post(Routes.channelMessages(storageChannel.id), {
                                    body: { content: `Avatar storage for Jester: ${matchedJester.name}` },
                                    files: [{ name: fileName, data: fileBuffer }]
                                });

                                const attachment = attachmentMsgData.attachments && attachmentMsgData.attachments[0];
                                if (attachment) {
                                    avatarUrl = attachment.url;
                                    uploadedAvatarUrls.set(cacheKey, avatarUrl);
                                    console.log(`Uploaded and cached: ${avatarUrl}`);

                                    try {
                                        await axios.patch(`${API_URL}/${matchedJester.id}`, {
                                            discord_avatar_url: avatarUrl
                                        });
                                        console.log('Saved Fluxer Avatar URL to database!');
                                    } catch (dbErr) {
                                        console.error('Failed to save avatar URL to DB:', dbErr.message);
                                    }

                                    if (storageChannel.id === message.channel.id) {
                                        try {
                                            await client.rest.delete(Routes.channelMessage(message.channel.id, attachmentMsgData.id));
                                        } catch (delErr) { console.warn('Failed to delete temp message'); }
                                    }
                                }
                            } else {
                                console.warn(`Local file not found: ${localPath}`);
                            }
                        } catch (uploadErr) {
                            console.error('Upload failed:', uploadErr);
                        }
                    }
                }
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

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
