const TelegramBot = require('node-telegram-bot-api');
const token = '8038527489:AAFZa_Th9D0_umoDDBVvdBGIs8EUufvrLGI';
const bot = new TelegramBot(token, { polling: true });

console.log('Polling started...');

bot.on('message', (msg) => {
    console.log('Message received:', msg.text);
});

bot.on('polling_error', (err) => {
    console.error('Polling error:', err.message);
});

setTimeout(() => {
    console.log('Timed out after 30s');
    process.exit(0);
}, 30000);
