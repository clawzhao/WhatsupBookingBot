const Database = require('better-sqlite3');
const db = new Database('data/bookings.db');
const coaches = db.prepare('SELECT id, name, telegram_bot_token, telegram_chat_id FROM coaches').all();
console.log('Coaches Data:');
coaches.forEach(c => {
    console.log(`- ${c.name} (${c.id}):\n  Token: ${c.telegram_bot_token ? c.telegram_bot_token.slice(0, 10) + '...' : 'NONE'}\n  Chat ID: ${c.telegram_chat_id || 'NONE'}`);
});
