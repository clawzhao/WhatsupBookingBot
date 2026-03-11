# WhatsApp & Telegram Booking Demo

A Node.js + Express multi-platform booking bot for restaurants. Supports both WhatsApp (via `whatsapp-web.js`) and Telegram (via `node-telegram-bot-api`) with a shared backend and SQLite persistence.

## Features
- **Interactive keyboard menu** - No need to type commands; just tap buttons.
- View menu and prices.
- Make reservations with guided steps.
- Cancel reservations.
- Admin dashboard to view bookings and manage configuration.
- Works on **WhatsApp** and **Telegram** simultaneously.

## Requirements
- Node.js (v14+)
- For WhatsApp: A WhatsApp account to link via QR code.
- For Telegram: A Telegram bot token from [@BotFather](https://t.me/BotFather).

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `PORT` (default: 3000)
   - `WHATSAPP_ENABLED=true|false` (default: true)
   - `TELEGRAM_BOT_TOKEN=your_telegram_bot_token` (optional; leave empty to disable Telegram)

3. Configure your restaurant:
   - Edit `config/restaurant.json` to set your restaurant name, opening hours, menu, etc.

4. Start the application:
   ```bash
   npm start
   ```

## Platform Setup

### WhatsApp
- When the server starts, a QR code will be displayed in the terminal.
- Open WhatsApp on your phone → Linked Devices → Link Device.
- Scan the QR code to authenticate the bot.
- The bot will stay logged in (session stored in `.wwebjs_auth`).

### Telegram
1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot` and follow instructions to create your bot.
3. Copy the bot token (format: `123456:ABC-...`).
4. Set `TELEGRAM_BOT_TOKEN` in your `.env` file.
5. Restart the server.
6. Open a chat with your bot on Telegram and send any message. The bot will show a **main menu with buttons**.
7. Just tap buttons to navigate: Menu → Book a Table → Cancel Booking.

**Optional:** Restrict Telegram access to specific users by setting `TELEGRAM_ALLOWED_USERS` in `.env` with comma-separated numeric user IDs.

## Telegram Interactive Menu

**Main Menu:**
- 📋 Menu — Shows the restaurant menu
- 📅 Book a Table — Guides you through selecting party size, date (next 7 days), and available time slots
- ❌ Cancel Booking — Lists your upcoming bookings; tap one to cancel
- 📋 View My Bookings — See all your active reservations

All actions are done with buttons—no typing required!

## Admin Dashboard

Access `http://localhost:3000` to:
- View all bookings (active and cancelled).
- Edit the configuration JSON (menu, opening hours, etc.) on the fly.
- Changes apply immediately to both bots.

## How to Test Manually

1. **Configure** both `.env` and `config/restaurant.json`.
2. **Start** the server (`npm start`).
3. **WhatsApp**: Scan QR and tap the bot menu (WhatsApp bot doesn't have buttons; you can still type `menu`, `book 2 on 2026-04-20 at 20:00`, etc.).
4. **Telegram**: You'll see a keyboard with buttons:
   - Tap 📋 Menu to see your menu.
   - Tap 📅 Book a Table → pick party size → pick a date (next 7 days) → pick an available time slot → confirm.
   - Tap ❌ Cancel Booking → select a booking to cancel.
5. Check the admin dashboard (`http://localhost:3000`) to see updates.

## Project Structure
```
├── src/
│   ├── index.js       # Express server & startup
│   ├── whatsapp.js    # WhatsApp handler (whatsapp-web.js)
│   ├── telegram.js    # Telegram handler (node-telegram-bot-api) with interactive menus
│   ├── booking.js     # Booking logic & SQLite
│   ├── menu.js        # Menu formatter
│   └── config.js      # Config loader/saver
├── config/
│   └── restaurant.json
├── data/
│   └── bookings.db    # SQLite database (auto-created)
├── public/             # Admin dashboard (HTML/JS)
├── test/               # E2E & unit tests (29 tests passing)
├── .env                # Your environment variables
├── README.md
└── SETUP.md            # Detailed platform setup guide
```

## Notes
- WhatsApp uses `whatsapp-web.js` which requires Chromium; first run may download it.
- Telegram bots are real-time via polling; no extra setup beyond a bot token.
- Both bots share the same database and configuration.

## License
MIT
