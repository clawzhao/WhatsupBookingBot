const Database = require('better-sqlite3');
const db = new Database('data/bookings.db');
const coaches = db.prepare('SELECT id, name, telegram_bot_token FROM coaches').all();
console.log('Coaches and Tokens:');
coaches.forEach(c => {
    console.log(`- ${c.name} (${c.id}): token=${c.telegram_bot_token ? c.telegram_bot_token.slice(0, 10) + '...' : 'none'}`);
});
