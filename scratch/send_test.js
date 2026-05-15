const TelegramBot = require('node-telegram-bot-api');
const token = '8038527489:AAFZa_Th9D0_umoDDBVvdBGIs8EUufvrLGI';
const chatId = '8383381149';
const bot = new TelegramBot(token, { polling: false });

bot.sendMessage(chatId, 'Hello! 👋 This is a test message from Antigravity (your AI Coding Assistant). I have successfully verified that your Telegram bot is connected and working!')
    .then(() => {
        console.log('Message sent successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error sending message:', err.message);
        process.exit(1);
    });
