import colors from 'chalk'
import dotenv from 'dotenv'
import TwitchJs from 'twitch-js'

dotenv.config()

const TWITCH_PREFERENCES = {
    channels: [process?.env?.JOEL_CHANNEL ?? 'northernlion'],
    credentials: {
        username: process?.env?.TWITCH_USERNAME?.toLowerCase() ?? '',
        token: process?.env?.TWITCH_PASSWORD ?? ''
    }
};

const JOEL_INTERVAL_SECONDS = 30.1;

const chat = new TwitchJs.Chat({
    username: TWITCH_PREFERENCES.credentials.username,
    token: TWITCH_PREFERENCES.credentials.token,
    log: {level: 'error'}
});

/** Returns the current time as a string, formatted with hours, minutes, seconds, and period. */
const getFormattedTime = () =>
    `[${new Date().toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true})}]`

/** Send a Joel message. */
function sendJoelMessage(channel) {
    const message = process?.env?.JOEL_MESSAGE ?? 'Joel';
    for (const channel of TWITCH_PREFERENCES.channels) {
        console.log(`${colors.gray(getFormattedTime())} '${channel}': "${message}".`);
        chat.send(`PRIVMSG #${channel} :${message}`)
    }
}

function startJoeling() {
    sendJoelMessage();
    setInterval(sendJoelMessage, JOEL_INTERVAL_SECONDS * 1000);
}

chat.connect()
    .then(() => {
        for (const channel of TWITCH_PREFERENCES.channels)
            chat.join(channel);
        console.clear();
        console.log(colors.greenBright(`Connection established as @${TWITCH_PREFERENCES.credentials.username}.`));
    }).finally(startJoeling);
