import 'dotenv/config';
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
    waitForGuilds: true,
});

const API_URL = 'http://127.0.0.1:8000/api/jesters';

// Map<UserId, List[Jester]>
const tupperCache = new Map();
// Map<LocalPath, PublicUrl>
const uploadedAvatarUrls = new Map();

client.on(Events.Ready, () => {
    // client.user might be undefined in some versions of Fluxer if not fully ready, but typically it is.
    console.log(`Logged in as ${client.user ? client.user.tag : 'Bot'}!`);
});

// Helper to send embeds
const sendEmbed = (message, title, description, color = '#9b59b6') => {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: 'Fluxer Jester Bot' });
    return message.reply({ embeds: [embed] });
};

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === 'j!ping') {
        return sendEmbed(message, '🏓 Pong!', 'The bot is active and listening.');
    }

    // Command: j!create or j!c
    if (/^j!(create|c)(\s|$)/i.test(message.content)) {
        const argsString = message.content.replace(/^j!(create|c)\s*/i, '').trim();

        if (!argsString) {
            return sendEmbed(message, '🎭 Create a Jester', "Usage: `j!create <Name> <Prefix:msg>`\nExample: `j!c \"My Jester\" MJ:msg`\n\nYou can attach an image to set the avatar!");
        }

        let name = '';
        let trigger = '';

        if (argsString.startsWith('"')) {
            const closingQuoteIndex = argsString.indexOf('"', 1);
            if (closingQuoteIndex === -1) {
                return sendEmbed(message, '❌ Error', "Name has no end (missing closing quote).", '#f04747');
            }
            name = argsString.substring(1, closingQuoteIndex);
            trigger = argsString.substring(closingQuoteIndex + 1).trim();

            if (!trigger) {
                return sendEmbed(message, '❌ Error', "Missing prefix trigger.\nUsage: `j!c <Name> <Prefix:msg>`", '#f04747');
            }
            if (trigger.includes(' ')) {
                return sendEmbed(message, '❌ Error', "Too many arguments. Usage: `j!c <Name> <Prefix:msg>`", '#f04747');
            }

        } else {
            const parts = argsString.split(/\s+/);
            if (parts.length > 2) {
                return sendEmbed(message, '❌ Error', "Too many arguments.\nUsage: `j!c <Name> <Prefix:msg>`\nIf your name has spaces, use quotes.", '#f04747');
            }
            name = parts[0];
            trigger = parts[1];
        }

        if (!name || !trigger) {
            return sendEmbed(message, '❌ Error', "Please provide a name and a prefix trigger.\nUsage: `j!c <Name> <Prefix:msg>`", '#f04747');
        }

        const triggerMatch = trigger.match(/^(.+?)([^a-zA-Z0-9\s])(msg)$/i);

        if (!triggerMatch) {
            if (!trigger.toLowerCase().endsWith('msg')) {
                return sendEmbed(message, '❌ Prefix Error', "The trigger must end with 'msg' (e.g. `Prefix:msg`).", '#f04747');
            }
            return sendEmbed(message, '❌ Prefix Error', "Invalid format. It must contain a separator (like `:`, `-`) followed by `msg`.\nExample: `MJ:msg`", '#f04747');
        }

        const prefix = triggerMatch[1]; // The part before separator

        const form = new FormData();
        form.append('name', name);
        form.append('prefix', prefix);
        form.append('user_id', message.author.id);

        const attachment = message.attachments.first();
        const isImage = attachment && (
            (attachment.contentType && attachment.contentType.startsWith('image/')) ||
            (attachment.url && /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(attachment.url))
        );

        if (isImage) {
            try {
                const imageResponse = await axios.get(attachment.url, { responseType: 'stream' });
                form.append('avatar', imageResponse.data, attachment.name);
            } catch (err) {
                return sendEmbed(message, '❌ Error', "Failed to download attached image.", '#f04747');
            }
        }

        try {
            const response = await axios.post(`${API_URL}/`, form, {
                headers: { ...form.getHeaders() }
            });

            tupperCache.delete(message.author.id);
            return sendEmbed(message, '✅ Jester Created', `**Name:** ${response.data.name}\n**Prefix:** \`${response.data.prefix}\``, '#43b581');

        } catch (error) {
            console.error('Creation failed:', error.response ? error.response.data : error.message);
            let errorMsg = "Please try again.";
            if (error.response && error.response.data && error.response.data.detail) {
                errorMsg = typeof error.response.data.detail === 'string'
                    ? error.response.data.detail
                    : JSON.stringify(error.response.data.detail);
            }
            return sendEmbed(message, '❌ Creation Failed', errorMsg, '#f04747');
        }
    }

    // Command: j!delete
    if (/^j!(delete|del|d)(\s|$)/i.test(message.content)) {
        let queryName = message.content.replace(/^j!(delete|del|d)\s*/i, '').trim();

        if (queryName.startsWith('"') && queryName.endsWith('"')) {
            queryName = queryName.slice(1, -1);
        } else if (queryName.startsWith("'") && queryName.endsWith("'")) {
            queryName = queryName.slice(1, -1);
        }

        if (!queryName) {
            return sendEmbed(message, '🗑️ Delete Jester', "Usage: `j!delete <Name>`\nExample: `j!d \"My Jester\"`");
        }

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters. Please try again later.", '#f04747');
            }
        }

        if (!jesters || jesters.length === 0) {
            return sendEmbed(message, '❌ Error', "You don't have any Jesters to delete.", '#f04747');
        }

        const target = queryName.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (exactMatch) {
            try {
                await axios.delete(`${API_URL}/${exactMatch.id}`);
                tupperCache.delete(message.author.id);
                return sendEmbed(message, '🗑️ Jester Deleted', `Successfully deleted **${exactMatch.name}**.`, '#f04747');
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to delete Jester. Please try again.", '#f04747');
            }
        }

        const candidates = jesters.filter(j => {
            const name = j.name.toLowerCase();
            return name.includes(target) || levenshteinDistance(name, target) <= 2;
        });

        if (candidates.length > 0) {
            const similarNames = [...new Set(candidates.map(c => c.name))].map(n => `\`${n}\``).join(', ');
            return sendEmbed(message, '🔍 Not Found', `Jester "**${queryName}**" not found.\nDid you mean: ${similarNames}?`, '#f04747');
        }

        return sendEmbed(message, '❌ Not Found', `Jester "**${queryName}**" does not exist.`, '#f04747');
    }

    // Command: j!info (j!i) or j!list (j!l)
    if (/^j!(info|i|list|l)(\s|$)/i.test(message.content)) {
        const command = message.content.match(/^j!(info|i|list|l)/i)[1].toLowerCase();
        let query = message.content.replace(/^j!(info|i|list|l)\s*/i, '').trim();

        // Handle quotes
        if (query.startsWith('"') && query.endsWith('"')) {
            query = query.slice(1, -1);
        } else if (query.startsWith("'") && query.endsWith("'")) {
            query = query.slice(1, -1);
        }

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters.", '#f04747');
            }
        }

        if (!jesters || jesters.length === 0) {
            return sendEmbed(message, 'ℹ️ Info', "You don't have any Jesters yet.");
        }

        // Logic split:
        // 1. If command is 'list' or 'l', show paginated list. Query treated as page number if numeric.
        // 2. If command is 'info' or 'i':
        //    a. If query is empty -> Show paginated list (Page 1).
        //    b. If query is NOT empty -> Show info for that Jester.

        let showList = false;
        let page = 1;
        const perPage = 10;

        if (command === 'list' || command === 'l') {
            showList = true;
            if (query && /^\d+$/.test(query)) {
                page = parseInt(query, 10);
            }
        } else {
            // j!info or j!i
            if (!query) {
                showList = true;
            }
        }

        if (showList) {
            const totalJesters = jesters.length;
            const totalPages = Math.ceil(totalJesters / perPage);

            if (page < 1) page = 1;
            if (page > totalPages) page = totalPages;

            const start = (page - 1) * perPage;
            const end = start + perPage;
            const jestersOnPage = jesters.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(`🎭 Your Jesters (Page ${page}/${totalPages})`)
                .setColor('#9b59b6')
                .setFooter({ text: `Total: ${totalJesters} Jesters • Fluxer Jester Bot` });

            let description = "";
            jestersOnPage.forEach(j => {
                description += `**${j.name}**: \`${j.prefix}\`\n`;
            });

            embed.setDescription(description || "No jesters on this page.");
            return message.reply({ embeds: [embed] });
        }

        // --- Show Info for specific Jester ---

        const target = query.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (exactMatch) {
            const embed = new EmbedBuilder()
                .setTitle(exactMatch.name)
                .setDescription(`**Prefix:** \`${exactMatch.prefix}\`\n**ID:** \`${exactMatch.id}\``)
                .setColor('#9b59b6')
                .setFooter({ text: 'Fluxer Jester Bot' });

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

        const candidates = jesters.filter(j => {
            const name = j.name.toLowerCase();
            return name.includes(target) || levenshteinDistance(name, target) <= 2;
        });

        if (candidates.length > 0) {
            const similarNames = [...new Set(candidates.map(c => c.name))].map(n => `\`${n}\``).join(', ');
            return sendEmbed(message, '🔍 Not Found', `Did you mean: ${similarNames}?`, '#f04747');
        }

        return sendEmbed(message, '❌ Not Found', `Jester "${query}" doesn't exist.`, '#f04747');
    }

    // Command: j!rename or j!re
    if (/^j!(rename|re)(\s|$)/i.test(message.content)) {
        const argsStr = message.content.replace(/^j!(rename|re)\s*/i, '').trim();
        const args = argsStr.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (!args || args.length < 2) {
            return sendEmbed(message, '📝 Rename Jester', "Usage: `j!rename <OldName> <NewName>`\nExample: `j!rename \"Old Name\" \"New Name\"`");
        }
        const oldName = args[0].replace(/^"|"$/g, '');
        const newName = args[1].replace(/^"|"$/g, '');

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters.", '#f04747');
            }
        }

        const target = oldName.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (!exactMatch) {
            return sendEmbed(message, '❌ Not Found', `Jester "**${oldName}**" does not exist.`, '#f04747');
        }

        try {
            await axios.patch(`${API_URL}/${exactMatch.id}`, { name: newName });
            tupperCache.delete(message.author.id);
            return sendEmbed(message, '✅ Renamed', `Successfully renamed **${exactMatch.name}** to **${newName}**.`);
        } catch (error) {
            return sendEmbed(message, '❌ Error', "Failed to rename Jester.", '#f04747');
        }
    }

    // Command: j!prefix or j!pre
    if (/^j!(prefix|pre)(\s|$)/i.test(message.content)) {
        const argsStr = message.content.replace(/^j!(prefix|pre)\s*/i, '').trim();
        const args = argsStr.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (!args || args.length < 2) {
            return sendEmbed(message, '📝 Change Prefix', "Usage: `j!prefix <Name> <NewPrefix:msg>`\nExample: `j!prefix \"My Jester\" new:msg`");
        }
        const name = args[0].replace(/^"|"$/g, '');
        let newTrigger = args[1].replace(/^"|"$/g, '');

        const triggerMatch = newTrigger.match(/^(.+?)([^a-zA-Z0-9\s])(msg)$/i);
        if (!triggerMatch) {
            return sendEmbed(message, '❌ Prefix Error', "Invalid format. It must contain a separator followed by `msg`.\nExample: `new:msg`", '#f04747');
        }
        const newPrefix = triggerMatch[1];

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters.", '#f04747');
            }
        }

        const target = name.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (!exactMatch) {
            return sendEmbed(message, '❌ Not Found', `Jester "**${name}**" does not exist.`, '#f04747');
        }

        try {
            await axios.patch(`${API_URL}/${exactMatch.id}`, { prefix: newPrefix });
            tupperCache.delete(message.author.id);
            return sendEmbed(message, '✅ Prefix Changed', `Successfully changed prefix for **${exactMatch.name}** to \`${newPrefix}:\` (trigger: \`${newTrigger}\`).`);
        } catch (error) {
            return sendEmbed(message, '❌ Error', "Prefix may already be in use or an error occurred.", '#f04747');
        }
    }

    // Command: j!avatar or j!a
    if (/^j!(avatar|a)(\s|$)/i.test(message.content)) {
        let queryName = message.content.replace(/^j!(avatar|a)\s*/i, '').trim();
        if (queryName.startsWith('"') && queryName.endsWith('"')) {
            queryName = queryName.slice(1, -1);
        } else if (queryName.startsWith("'") && queryName.endsWith("'")) {
            queryName = queryName.slice(1, -1);
        }

        if (!queryName) {
            return sendEmbed(message, '🖼️ Change Avatar', "Usage: `j!avatar <Name>` (Attach an image file!)\nExample: `j!a \"My Jester\"`");
        }

        const attachment = message.attachments.first();
        if (!attachment) {
            return sendEmbed(message, '❌ Missing Image', "You must attach an image file to this message to change the avatar.", '#f04747');
        }

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters.", '#f04747');
            }
        }

        const target = queryName.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (!exactMatch) {
            return sendEmbed(message, '❌ Not Found', `Jester "**${queryName}**" does not exist.`, '#f04747');
        }

        try {
            const form = new FormData();
            const imageResponse = await axios.get(attachment.url, { responseType: 'stream' });
            form.append('avatar', imageResponse.data, attachment.filename || attachment.name || 'avatar.png');

            await axios.post(`${API_URL}/${exactMatch.id}/avatar`, form, {
                headers: { ...form.getHeaders() }
            });

            // Delete cache
            tupperCache.delete(message.author.id);
            if (exactMatch.avatar_url) {
                uploadedAvatarUrls.delete(exactMatch.avatar_url);
            }
            return sendEmbed(message, '✅ Avatar Changed', `Successfully updated the avatar for **${exactMatch.name}**.`);
        } catch (error) {
            return sendEmbed(message, '❌ Error', "Failed to upload new avatar image.", '#f04747');
        }
    }

    // Command: j!stick or j!s
    if (/^j!(stick|s)(\s|$)/i.test(message.content)) {
        const argsStr = message.content.replace(/^j!(stick|s)\s*/i, '').trim();
        const args = argsStr.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (!args || args.length < 2) {
            return sendEmbed(message, '📌 Autoproxy (Stick)', "Usage: `j!stick <Jester Name> <Channel>`\nExample: `j!stick \"My Jester\" #general`");
        }

        const name = args[0].replace(/^"|"$/g, '');
        const channelArg = args[1].replace(/^"|"$/g, '');

        // Extract channel ID from <#id> format or just accept the id
        const channelMatch = channelArg.match(/<#(\d+)>/);
        const targetChannelId = channelMatch ? channelMatch[1] : channelArg;

        let jesters = tupperCache.get(message.author.id);
        if (!jesters) {
            try {
                const response = await axios.get(`${API_URL}/user/${message.author.id}`);
                jesters = response.data;
                tupperCache.set(message.author.id, jesters);
                setTimeout(() => tupperCache.delete(message.author.id), 5 * 60 * 1000);
            } catch (error) {
                return sendEmbed(message, '❌ Error', "Failed to fetch your Jesters.", '#f04747');
            }
        }

        const target = name.toLowerCase();
        const exactMatch = jesters.find(j => j.name.toLowerCase() === target);

        if (!exactMatch) {
            return sendEmbed(message, '❌ Not Found', `Jester "**${name}**" does not exist.`, '#f04747');
        }

        try {
            await axios.post(`${API_URL}/autoproxy/${message.author.id}/${targetChannelId}`, { name: exactMatch.name });
            return sendEmbed(message, '📌 Autoproxy Set', `Successfully stuck **${exactMatch.name}** in <#${targetChannelId}>. Any message you send there without a prefix will automatically proxy as them.`);
        } catch (error) {
            return sendEmbed(message, '❌ Error', "Failed to set up autoproxy.", '#f04747');
        }
    }

    // Command: j!unstick or j!u
    if (/^j!(unstick|u)(\s|$)/i.test(message.content)) {
        const channelArg = message.content.replace(/^j!(unstick|u)\s*/i, '').trim();
        if (!channelArg) {
            return sendEmbed(message, '📌 Remove Autoproxy', "Usage: `j!unstick <Channel>`\nExample: `j!u #general`");
        }

        const channelMatch = channelArg.match(/<#(\d+)>/);
        const targetChannelId = channelMatch ? channelMatch[1] : channelArg;

        try {
            await axios.delete(`${API_URL}/autoproxy/${message.author.id}/${targetChannelId}`);
            return sendEmbed(message, '✅ Autoproxy Removed', `Removed autoproxy for <#${targetChannelId}>.`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return sendEmbed(message, 'ℹ️ Not Stuck', `You don't have an autoproxy set for <#${targetChannelId}>.`);
            }
            return sendEmbed(message, '❌ Error', "Failed to remove autoproxy.", '#f04747');
        }
    }

    // Command: j!help or j!h
    if (/^j!(help|h)(\s|$)/i.test(message.content)) {
        const category = message.content.replace(/^j!(help|h)\s*/i, '').trim().toLowerCase();

        if (!category) {
            const embed = new EmbedBuilder()
                .setTitle(`🎭 Jester Bot Help`)
                .setDescription("To view commands for a specific category, use `j!help <Category>`.\n\n**Categories:**\n• `Global` - Core proxy and management commands\n• `Editing` - Commands to modify your Jesters\n• `Autoproxy` - Commands for the autoproxy system\n• `Reactions` - Modify Jester messages with reactions")
                .setColor('#9b59b6')
                .setFooter({ text: 'Fluxer Jester Bot' });
            return message.reply({ embeds: [embed] });
        }

        const helpEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setFooter({ text: 'Fluxer Jester Bot' });

        if (category === 'global' || category === 'core' || category === 'general') {
            helpEmbed.setTitle(`🎭 Jester Bot Help - Global`)
                .setDescription("Manage your roleplay proxies easily. **Global Commands:**")
                .addFields(
                    { name: '✨ Create', value: '`j!create <Name> <Prefix:msg>`\nExample: `j!c "My Char" MC:msg`' },
                    { name: '📜 List', value: '`j!list [page]` or `j!l`' },
                    { name: 'ℹ️ Info', value: '`j!info <Name>` or `j!i <Name>`' },
                    { name: '🗑️ Delete', value: '`j!delete <Name>` or `j!d <Name>`' }
                );
        } else if (category === 'editing' || category === 'edit') {
            helpEmbed.setTitle(`🎭 Jester Bot Help - Editing`)
                .setDescription("**Editing Jesters:**")
                .addFields(
                    { name: '📝 Rename', value: '`j!rename <OldName> <NewName>`\nExample: `j!re "Old" "New"`' },
                    { name: '📝 Change Prefix', value: '`j!prefix <Name> <NewPrefix:msg>`\nExample: `j!pre "My Jester" new:msg`' },
                    { name: '🖼️ Change Avatar', value: '`j!avatar <Name>` or `j!a <Name>`\n**Attach an image to the message!**' }
                );
        } else if (category === 'autoproxy' || category === 'auto') {
            helpEmbed.setTitle(`🎭 Jester Bot Help - Autoproxy`)
                .setDescription("**Autoproxy Configuration:**")
                .addFields(
                    { name: '📌 Stick (Autoproxy)', value: '`j!stick <Jester Name> <Channel>`\nExample: `j!s "My Jester" #general`\nSends messages in that channel as the Jester automatically without needing the prefix.' },
                    { name: '📌 Unstick', value: '`j!unstick <Channel>`\nExample: `j!u #general`\nRemoves the autoproxy from the channel.' }
                );
        } else if (category === 'reactions' || category === 'reaction') {
            helpEmbed.setTitle(`🎭 Jester Bot Help - Reactions`)
                .setDescription("**Reactions:**\nYou can manage the messages sent by your Jesters by reacting to them directly.")
                .addFields(
                    { name: '❌ Delete Message', value: 'React with ❌ to a Jester\'s message to immediately delete it.' },
                    { name: '~~✏️ Edit Message~~', value: '~~React with ✏️ to a Jester\'s message to edit it. The bot will DM you the original message so you can fix typos and send the corrections directly back to the bot.~~ (I\'m working on it)' }
                );
        } else {
            return sendEmbed(message, '❌ Unknown Category', "That category doesn't exist. Type `j!help` to see a list of categories.", '#f04747');
        }

        return message.reply({ embeds: [helpEmbed] });
    }

    if (message.content.toLowerCase().startsWith('j!')) {
        return sendEmbed(message, '❓ Unknown Command', "Type `j!help` for a list of commands.", '#f04747');
    }

    // ... Proxy logic remains unchanged ...

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
    let matchedJester = jesters.find(j => content.startsWith(j.prefix + ":") || content.startsWith(j.prefix + " :"));

    // Autoproxy Check (if no prefix match)
    if (!matchedJester) {
        try {
            const proxyChannel = message.channel || await message.resolveChannel().catch(() => null);
            if (proxyChannel) {
                const autoRes = await axios.get(`${API_URL}/autoproxy/${message.author.id}`);
                const activeAutoproxies = autoRes.data;
                const channelAutoproxy = activeAutoproxies.find(ap => ap.channel_id === proxyChannel.id);

                if (channelAutoproxy) {
                    matchedJester = jesters.find(j => j.id === channelAutoproxy.jester_id);
                }
            }
        } catch (autoErr) {
            // Ignore if autoproxy lookup fails or user has 0 autoproxies
        }
    }

    if (matchedJester) {
        let innerContent = content;

        // Only strip prefix if it actually started with the prefix
        if (content.startsWith(matchedJester.prefix + ":") || content.startsWith(matchedJester.prefix + " :")) {
            innerContent = content.substring(matchedJester.prefix.length).trim();
            while (innerContent.startsWith(":")) {
                innerContent = innerContent.substring(1).trim();
            }
        }

        try {
            // Find or create webhook
            const proxyChannel = message.channel || await message.resolveChannel().catch(() => null);
            if (!proxyChannel) return;

            const webhooks = await proxyChannel.fetchWebhooks();
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
                                    storageChannel = proxyChannel;
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

                                    if (storageChannel.id === proxyChannel.id) {
                                        try {
                                            await client.rest.delete(Routes.channelMessage(proxyChannel.id, attachmentMsgData.id));
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
            // Prepare webhook body
            const webhookBody = {
                username: matchedJester.name,
                avatar_url: avatarUrl || undefined,
                content: innerContent
            };

            // Handle Replies (Manual Format)
            const ref = message.messageReference || message.reference;

            if (ref) {
                const msgId = ref.messageId || ref.message_id;
                if (msgId) {
                    try {
                        // Attempt to fetch the referenced message to get content and author
                        const refMsg = await proxyChannel.messages.fetch(msgId);

                        if (refMsg) {
                            let replyToUser = refMsg.author ? `<@${refMsg.author.id}>` : 'Unknown User';

                            // If replying to a webhook (another Jester), find the actual owner
                            if (refMsg.author && refMsg.author.bot) {
                                try {
                                    const allRes = await axios.get(`${API_URL}/all`);
                                    const allJesters = allRes.data;
                                    const matchedJesterUser = allJesters.find(j => j.name === refMsg.author.username);
                                    if (matchedJesterUser) {
                                        replyToUser = `<@${matchedJesterUser.user_id}>`;
                                    }
                                } catch (e) {
                                    console.warn('Failed to fetch jester owners for reply resolution:', e.message);
                                }
                            }

                            let replyContent = refMsg.content || '*[Attachment/Embed]*';

                            // Truncate if too long (Discord limits)
                            if (replyContent.length > 50) {
                                replyContent = replyContent.substring(0, 50) + '...';
                            }
                            // Escape quotes or special chars if needed, but usually simple quoting is fine
                            replyContent = replyContent.replace(/\n/g, ' '); // Flatten newlines for the quote

                            // Update the content to include the manual reply block without the extra line and wrapper
                            webhookBody.content = `${replyToUser}\n> ${replyContent}\n${webhookBody.content}`;
                        }
                    } catch (fetchErr) {
                        console.warn('Failed to fetch referenced message for reply formatting:', fetchErr.message);
                        // Fallback if fetch fails (e.g. message deleted or not found)
                        webhookBody.content = `<@Unknown>\n> *Message could not be loaded*\n${webhookBody.content}`;
                    }
                }
            }

            // Send as Jester using direct REST call
            console.log('[DEBUG v3.6] Final Webhook Body:', JSON.stringify(webhookBody, null, 2));
            try {
                // Force wait=true to get the message object back
                const route = Routes.webhookExecute(webhook.id, webhook.token) + '?wait=true';
                const response = await client.rest.post(route, {
                    body: webhookBody,
                    auth: false
                });
                console.log('[DEBUG v3.5] Webhook executed successfully. Response:', JSON.stringify(response, null, 2));

                // Only delete the original message if the webhook succeeds
                try {
                    await message.delete();
                } catch (delErr) {
                    console.warn('Failed to delete original message:', delErr.message);
                }

            } catch (webhookErr) {
                console.error('[DEBUG v3.5] Webhook execution failed:', webhookErr);

                // Try to infer status/code safely
                const errStatus = webhookErr.status || webhookErr.statusCode;
                const errCode = webhookErr.code || (webhookErr.rawError ? webhookErr.rawError.code : null);

                // Handle 504 Gateway Timeout or specifically the FluxerAPIError code
                if (errStatus === 504 || errCode === 'GATEWAY_TIMEOUT' || errCode === 504 || webhookErr.message?.includes('Gateway timeout')) {
                    try {
                        const errMsg = await proxyChannel.send(`⚠️ **Jester Timeout:** <@${message.author.id}>, your message as \`${matchedJester.name}\` encountered a 504 Gateway Timeout while sending to Fluxer.`);
                        // Auto-delete to keep chat clean
                        setTimeout(() => errMsg.delete().catch(() => { }), 15000);
                    } catch (e) {
                        console.error('Failed to send timeout warning message:', e.message);
                    }
                }
            }

        } catch (err) {
            console.error('Error proxying message:', err);
            // Catch edge cases where FluxerAPIError bubbles up
            const errStatus = err.status || err.statusCode;
            const errCode = err.code || (err.rawError ? err.rawError.code : null);
            if (errStatus === 504 || errCode === 'GATEWAY_TIMEOUT' || errCode === 504 || err.message?.includes('Gateway timeout')) {
                try {
                    const proxyChannel = message.channel || await message.resolveChannel().catch(() => null);
                    if (proxyChannel) {
                        const errMsg = await proxyChannel.send(`⚠️ **Jester Timeout:** <@${message.author.id}>, your message as \`${matchedJester?.name || 'Unknown'}\` encountered a 504 Gateway Timeout.`);
                        setTimeout(() => errMsg.delete().catch(() => { }), 15000);
                    }
                } catch (sendErr) {
                    console.error('Also failed to send generic timeout warning:', sendErr.message);
                }
            }
        }
    }
});

// Reaction listener for deleting or editing Jester messages
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    // Fetch partials if needed
    if (reaction && reaction.partial) {
        try { await reaction.fetch(); } catch (e) { return; }
    }

    // Uncached messages do not have `reaction.message` populated
    let message = reaction.message;
    if (!message) {
        try {
            message = await reaction.fetchMessage();
        } catch (e) {
            console.error('Failed to fetch reaction message:', e.message);
            return;
        }
    } else if (message.partial) {
        try {
            await message.fetch();
        } catch (e) { return; }
    }

    // Only handle webhook messages
    if (!message.webhookId) return;

    const emojiName = reaction.emoji.name;
    if (emojiName !== '❌' && emojiName !== '✏️') return;

    // Fetch user jesters from tupperCache or API
    let jesters = tupperCache.get(user.id);
    if (!jesters) {
        try {
            const response = await axios.get(`${API_URL}/user/${user.id}`);
            jesters = response.data;
            tupperCache.set(user.id, jesters);
            setTimeout(() => tupperCache.delete(user.id), 5 * 60 * 1000);
        } catch (error) {
            return;
        }
    }

    if (!jesters || jesters.length === 0) return;

    // Check if the webhook author name matches any of the user's jesters
    const matchedJester = jesters.find(j => j.name === message.author.username);
    if (!matchedJester) return;

    // ❌ -> Delete message
    if (emojiName === '❌') {
        try {
            await message.delete();
        } catch (err) {
            console.error('Failed to delete message via reaction:', err);
        }
    }
    // ✏️ -> Edit message via DM
    else if (emojiName === '✏️') {
        try {
            const dmChannel = await user.createDM();
            await dmChannel.send(`\`\`\`\n${message.content}\n\`\`\`\n\nType the new message and send it to me to edit the original message`);
            await dmChannel.send('Message editing doesn\'t work as of now. Please be patient, I\'ll resolve this issue as soon as I can.');

            // Wait for user's response in DMs (30s) manually since awaitMessages doesn't exist in @fluxerjs
            const newContent = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client.removeListener(Events.MessageCreate, listener);
                    reject(new Error('time'));
                }, 30000);

                const listener = async (msg) => {
                    // Check if it's the correct user and in a DM channel (no guild)
                    if (msg.author.id === user.id && !msg.guildId) {
                        clearTimeout(timeout);
                        client.removeListener(Events.MessageCreate, listener);
                        resolve(msg.content);
                    }
                };
                client.on(Events.MessageCreate, listener);
            });

            // Fetch the webhook to edit the message
            // If the message is in a thread, the webhook belongs to the parent channel
            let proxyChannel = message.channel;
            let threadId = null;

            if (proxyChannel && proxyChannel.isThread && proxyChannel.isThread()) {
                threadId = proxyChannel.id;
                proxyChannel = proxyChannel.parent;
            }

            if (!proxyChannel) {
                await dmChannel.send('❌ Could not find the channel this message belongs to.');
                return;
            }

            const webhooks = await proxyChannel.fetchWebhooks();
            const webhook = webhooks.find(w => w.id === message.webhookId);

            if (webhook && webhook.token) {
                // @fluxerjs REST endpoint to edit webhook messages
                let route = Routes.webhookExecute(webhook.id, webhook.token) + `/messages/${message.id}?wait=true`;
                if (threadId) {
                    route += `&thread_id=${threadId}`;
                }

                console.log(`[DEBUG Webhook Edit] Route: ${route}`);
                console.log(`[DEBUG Webhook Edit] Webhook ID: ${webhook.id}, Message ID: ${message.id}`);

                await client.rest.patch(route, {
                    body: { content: newContent },
                    auth: false
                });
                await dmChannel.send('✅ Message edited successfully!');
            } else {
                await dmChannel.send('❌ Cannot edit this message. (No webhook token available)');
            }
        } catch (err) {
            if (err instanceof Map || err.size === 0 || (err.message && err.message.includes('time'))) {
                user.send('⏳ Edit timed out (30 seconds limit reached).').catch(() => null);
            } else {
                console.error('Failed during message edit reaction:', err);
                user.send('❌ An error occurred while editing the message.').catch(() => null);
            }
        }
    }
});

client.login(process.env.FLUXER_BOT_TOKEN);
console.log('Jester Bot v3.5 Starting...');

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
