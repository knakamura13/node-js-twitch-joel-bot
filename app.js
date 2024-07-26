/**
 * app.js - Twitch Chat Bot Script
 *
 * This script sets up a Twitch chatbot that sends periodic messages to a specified channel.
 * The bot only sends messages under the following conditions:
 * 1. The current time is between 8:45am and 2pm.
 * 2. The stream is active, meaning there has been at least one chat message from a user (non-bot) in the past 60 seconds.
 *
 * The script also listens to incoming chat messages and updates the stream's activity status based on received messages.
 * If no messages are received within the past 60 seconds, the bot considers the stream inactive and stops sending messages.
 *
 * Key Functions:
 * - getFormattedTime(): Returns the current time as a formatted string.
 * - isWithinTimeRange(): Checks if the current time is between 8:50am and 1pm.
 * - sendJoelMessage(): Sends a predefined message to the chat if the stream is active and within the time range.
 * - checkInactivity(): Checks for chat inactivity and updates the stream's activity status.
 * - shouldMessageBeIgnored(): Determines if an incoming message should be ignored based on certain criteria (e.g., from a bot, a command, etc.).
 * - startJoeling(): Initializes the periodic message sending and inactivity checking.
 * - chat.on('PRIVMSG', ...): Event listener for incoming chat messages that updates the last message timestamp and stream activity status.
 */
import colors from 'chalk'
import dotenv from 'dotenv'
import TwitchJs from 'twitch-js'
import moment from 'moment-timezone';

dotenv.config()

const TWITCH_PREFERENCES = {
    channels: [process?.env?.JOEL_CHANNEL ?? 'northernlion'],
    credentials: {
        username: process?.env?.TWITCH_USERNAME?.toLowerCase() ?? '',
        token: process?.env?.TWITCH_PASSWORD ?? ''
    }
};

const JOEL_INTERVAL_SECONDS = 30.1;
const INACTIVITY_THRESHOLD_SECONDS = 60;
const USER_IGNORE_LIST = ['nightbot'];

let streamIsActive = true;
let lastMessageTimestamp = Date.now();
let lastMessageUsername = '';

const chat = new TwitchJs.Chat({
    username: TWITCH_PREFERENCES.credentials.username,
    token: TWITCH_PREFERENCES.credentials.token,
    log: { level: 'error' }
});

/** Returns the current time as a string, formatted with hours, minutes, seconds, and period. */
const getFormattedTime = () =>
    `[${new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}]`

/** Checks if the current time is between 8:50am and 1pm on weekdays. */
const isWithinTimeRange = () => {
    const now = moment().tz('America/Los_Angeles');
    const startTime = moment.tz('America/Los_Angeles').set({ hour: 8, minute: 45, second: 0, millisecond: 0 });
    const endTime = moment.tz('America/Los_Angeles').set({ hour: 14, minute: 0, second: 0, millisecond: 0 });

    const isWeekday = now.day() >= 1 && now.day() <= 5; // Monday to Friday

    return isWeekday && now.isBetween(startTime, endTime);
}

/** Send a Joel message. */
function sendJoelMessage() {
    if (streamIsActive && isWithinTimeRange()) {
        const message = process?.env?.JOEL_MESSAGE ?? 'Joel';
        for (const channel of TWITCH_PREFERENCES.channels) {
            console.log(`${colors.gray(getFormattedTime())} '${channel}': "${message}".`);
            chat.send(`PRIVMSG #${channel} :${message}`);
            lastMessageUsername = TWITCH_PREFERENCES.credentials.username;
        }
    }
}

/** Checks for chat inactivity. */
function checkInactivity() {
    const currentTime = Date.now();
    const wasActive = streamIsActive;
    streamIsActive = currentTime - lastMessageTimestamp <= INACTIVITY_THRESHOLD_SECONDS * 1000;

    // Check if the last message was sent by the bot
    if (lastMessageUsername.toLowerCase() === TWITCH_PREFERENCES.credentials.username.toLowerCase()) {
        streamIsActive = false;
    }

    if (wasActive !== streamIsActive) {
        console.log(`${colors.gray(getFormattedTime())} Stream activity status changed: ${streamIsActive ? 'active' : 'inactive'}.`);
    }
}

/** Determines if the message should be ignored. */
function shouldMessageBeIgnored(channel, username, message, isModerator) {
    // Ignore if the message is from a bot, self, a moderator, or is a command
    return isModerator
        || USER_IGNORE_LIST.includes(username.toLowerCase())
        || username.toLowerCase() === TWITCH_PREFERENCES.credentials.username.toLowerCase()
        || message.charAt(0) === '!';
}

function startJoeling() {
    sendJoelMessage();
    setInterval(sendJoelMessage, JOEL_INTERVAL_SECONDS * 1000);
    setInterval(checkInactivity, INACTIVITY_THRESHOLD_SECONDS * 1000);
}


chat.on('PRIVMSG', (msg) => {
    msg.channel = msg.channel.replace('#', '');

    lastMessageUsername = msg.username;

    if (shouldMessageBeIgnored(msg.channel, msg.username, msg.message, msg.isModerator)) {
        return;
    }

    const wasActive = streamIsActive;
    lastMessageTimestamp = Date.now();
    streamIsActive = true;

    if (wasActive !== streamIsActive) {
        console.log(`${colors.gray(getFormattedTime())} Stream activity status changed: ${streamIsActive ? 'active' : 'inactive'}.`);
    }
});

chat.connect()
    .then(() => {
        for (const channel of TWITCH_PREFERENCES.channels) {
            chat.join(channel);
        }
        console.clear();
        console.log(colors.greenBright(`Connection established as @${TWITCH_PREFERENCES.credentials.username}.`));
    }).finally(startJoeling);