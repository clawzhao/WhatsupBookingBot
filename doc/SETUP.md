# Platform Setup Guide

## WhatsApp Setup

1. Run the server:
   ```bash
   npm start
   ```

2. Look for the QR code in the terminal output.

3. On your phone:
   - Open WhatsApp
   - Tap **Settings** → **Linked Devices** → **Link Device**
   - Scan the QR code

4. The bot is now connected. Send `menu` to test.

**Notes:**
- The session persists in `.wwebjs_auth/` directory; you only need to scan once.
- If you want to switch WhatsApp accounts, delete `.wwebjs_auth/` and restart.

## Telegram Setup

1. **Create a Bot:**
   - Open Telegram and search for **[@BotFather](https://t.me/BotFather)**.
   - Send `/newbot`
   - Choose a name for your bot (e.g., "Restaurant Bookings").
   - Choose a username (must end with `bot`, e.g., `myrestobookbot`).
   - BotFather will reply with a **token** (looks like `1234567890:ABCdefGHI...`). Save it.

2. **Configure the bot:**
   - Copy `.env.example` to `.env`
   - Set: `TELEGRAM_BOT_TOKEN=your_token_here`
   - (Optional) Restrict users: set `TELEGRAM_ALLOWED_USERS` with your numeric Telegram user ID(s), comma-separated.
     - To get your numeric ID, send a message to [@userinfobot](https://t.me/userinfobot) or use any ID reveal bot.

3. **Restart the server** (if it was running):
   ```bash
   npm start
   ```

4. **Activate the bot:**
   - Open Telegram and search for your bot by username.
   - Send `/start` (or any message). The bot will reply with the help text.
   - You can now send `menu`, `book ...`, `cancel ...`.

5. **Optional: Set bot commands menu (nice UX):**
   - Send `/setcommands` to @BotFather
   - Select your bot
   - Provide these commands (one per line):
     ```
     menu - View restaurant menu
     book - Make a reservation (e.g., book 4 on 2026-04-15 at 19:00)
     cancel - Cancel a booking (e.g., cancel 1)
     ```
   - The commands will appear in the Telegram chat input field.

## Testing Both Platforms

1. Ensure your `.env` has:
   ```
   WHATSAPP_ENABLED=true
   TELEGRAM_BOT_TOKEN=your_telegram_token
   ```

2. Start the server; both bots will initialize.

3. In WhatsApp: Scan QR and send test messages.

4. In Telegram: Send messages to your bot.

5. Bookings made on either platform appear in:
   - Bot confirmation messages
   - Admin dashboard at `http://localhost:3000`

6. Canceling works either way as well (by booking ID).

## Common Issues

### WhatsApp
- **"Failed to launch browser"**: The server needs Chrome/Chromium. Install `libnss3`, `libgconf-2-4`, or on Ubuntu/Debian: `sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2`.
- **QR code doesn't work**: Ensure your phone's WhatsApp is connected to internet and not in "linked devices" limit (max 4). Reload the QR by restarting the server.

### Telegram
- **Bot not responding**: Check token is correct and bot is started (`polling: true`). The console should show "Telegram Bot is ready".
- **"Forbidden: bot was blocked by the user"**: You blocked the bot. Unblock it in Telegram.
- **"Bad Request: chat not found"**: You're sending to a user ID without having started a chat first. Have the user send `/start` to the bot.

## Admin Dashboard

Visit `http://localhost:3000` to see real-time bookings and edit menus. Changes are immediate for both bots.

Enjoy testing!
