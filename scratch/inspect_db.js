const Database = require('better-sqlite3');
const db = new Database('data/bookings.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

tables.forEach(t => {
    try {
        const count = db.prepare(`SELECT count(*) as count FROM ${t.name}`).get();
        console.log(`Table ${t.name}: ${count.count} rows`);
        if (t.name === 'coaches') {
            const rows = db.prepare('SELECT id, name, telegram_chat_id FROM coaches').all();
            console.log('Coaches:', rows);
        }
    } catch (e) {
        console.log(`Error reading ${t.name}: ${e.message}`);
    }
});
