const Database = require('better-sqlite3');
const db = new Database('data/bookings.db');
const chats = db.prepare("SELECT DISTINCT chat_id, platform FROM chat_logs WHERE platform = 'telegram'").all();
console.log('Telegram Chats:', chats);
