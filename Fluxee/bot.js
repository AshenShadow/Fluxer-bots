import 'dotenv/config';
import { Client, Events } from '@fluxerjs/core';

// ==========================================
// CONFIGURATION
// ==========================================
const client = new Client({
    intents: 0,
    suppressIntentWarning: true,
});

const prefix = "ee!";

// ==========================================
// LOGGING & DEBUGGING
// ==========================================
client.once(Events.Ready, () => {
    console.log(`[BOOT] Ready! Logged in as ${client.user ? client.user.tag : 'Fluxee'}`);
});

client.on(Events.Error, (err) => {
    console.error('[BOT ERROR]', err?.message ?? err);
});

// We keep specific console logging wrappers up here so they are out of the way
const logBumpAttempt = (url) => {
    console.log(`[BUMP] Sending POST request to: ${url}`);
};

const logBumpResponse = (status, text) => {
    console.log(`[BUMP] API Response (${status}):`, text);
};

const logBumpError = (err) => {
    console.error('[BUMP ERROR]', err);
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
// Prevent the bot from crashing if it lacks permissions to reply
const safeReply = async (message, text) => {
    try {
        await message.reply(text);
    } catch (e) {
        console.error(`[REPLY ERROR] Missing permissions to send message in this channel:`, e.message);
    }
};

// ==========================================
// COMMAND HANDLERS
// ==========================================
client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (!message || !message.author || message.author.bot) return;

    // --- Ping Command ---
    if (message.content === `${prefix}ping`) {
        return safeReply(message, 'Pong! 🏓');
    }

    // --- Bump Command ---
    if (message.content === `${prefix}bump`) {
        if (!message.guild || !message.guild.name) {
            return safeReply(message, `This command can only be used inside a server/community!`);
        }

        const communityName = message.guild.name;

        try {
            // 1. Search for the community by name on Fluxee
            const searchRes = await fetch(`https://fluxee.org/discover/?q=${encodeURIComponent(communityName)}`);
            const searchHtml = await searchRes.text();

            const blocks = searchHtml.split('<div class="listing-card">');
            let targetSlug = null;

            for (let i = 1; i < blocks.length; i++) {
                const titleMatch = /<h3 class="card-title">\s*(.*?)\s*<\/h3>/s.exec(blocks[i]);
                if (titleMatch) {
                    // Remove HTML tags (like the Verified Checkmark) and decode HTML entities
                    let cleanTitle = titleMatch[1]
                        .replace(/<[^>]+>/g, '')
                        .replace(/&#x27;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .trim();

                    if (cleanTitle === communityName) {
                        const slugMatch = /<a href="\/listing\/([^\/]+)\/"[^>]*>View<\/a>/.exec(blocks[i]);
                        if (slugMatch) {
                            targetSlug = slugMatch[1];
                            break;
                        }
                    }
                }
            }

            if (!targetSlug) {
                return safeReply(message, `Could not find a Fluxee listing that matches the name **${communityName}** exactly!`);
            }

            // 2. Extract the actual Integer Listing ID from the listing page
            const detailRes = await fetch(`https://fluxee.org/listing/${targetSlug}/`);
            const detailHtml = await detailRes.text();
            const idMatch = /action="\/listing\/(\d+)\/report\/"/.exec(detailHtml);

            if (!idMatch) {
                return safeReply(message, `Found the community on Fluxee, but could not extract the Listing ID!`);
            }

            const listingId = idMatch[1];

            // 3. Send the bump request
            const bumpUrl = `https://fluxee.org/api/listings/bump/${listingId}`;
            logBumpAttempt(bumpUrl);
            
            const res = await fetch(bumpUrl, {
                method: 'POST'
            });

            const responseText = await res.text();
            logBumpResponse(res.status, responseText);

            let data = null;
            try {
                data = JSON.parse(responseText);
            } catch (e) { }

            if (data && data.success === false) {
                return safeReply(message, `Failed to bump. Reason: ${data.error || 'Unknown error'}`);
            }

            if (res.ok) {
                return safeReply(message, `Listing **${communityName}** bumped successfully! 🚀`);
            } else {
                let errorMsg = data ? (data.error || data.detail || data.message || 'Failed to bump') : 'Failed to bump';
                return safeReply(message, `Error bumping **${communityName}**: \`${errorMsg}\` (Status: ${res.status})`);
            }
        } catch (err) {
            logBumpError(err);
            return safeReply(message, 'An unexpected error occurred while bumping the listing!');
        }
    }
});

// ==========================================
// START BOT
// ==========================================
client.login(process.env.FLUXER_TOKEN);
