const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { getMenuText } = require('./menu');
const { createBooking, cancelBooking } = require('./booking');
const moment = require('moment-timezone');
const { loadConfig } = require('./config');

let client;

function initWhatsApp() {
  const config = loadConfig();
  if (!config) {
    console.error('Config not loaded. Cannot start WhatsApp.');
    return;
  }

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });

  client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('Scan the QR Code below to authenticate:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp Bot is ready and listening!');
  });

  client.on('message', async (msg) => {
    const text = msg.body.trim().toLowerCase();
    const phone = msg.from; // Sender's ID

    if (text === 'menu') {
      const menuResponse = getMenuText();
      await client.sendMessage(msg.from, menuResponse);
      return;
    }

    // Command: cancel [id]
    if (text.startsWith('cancel ')) {
      const parts = text.split(' ');
      if (parts.length === 2) {
        const id = parts[1];
        const res = await cancelBooking(phone, id);
        await client.sendMessage(msg.from, res.message);
        return;
      }
    }

    // Command: book [N] on [day] at [time]
    // Example: book 2 on 2026-04-15 at 18:30
    const bookRegex = /^book\s+(\d+)\s+on\s+(\S+)\s+at\s+(\S+)$/i;
    const match = text.match(bookRegex);
    if (match) {
      const partySize = parseInt(match[1], 10);
      const date = match[2]; // Expecting YYYY-MM-DD
      const time = match[3]; // Expecting HH:mm

      if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
        await client.sendMessage(msg.from, 'Invalid date format. Please use YYYY-MM-DD (e.g., 2026-04-15).');
        return;
      }
      if (!moment(time, 'HH:mm', true).isValid()) {
        await client.sendMessage(msg.from, 'Invalid time format. Please use HH:mm (e.g., 18:30).');
        return;
      }

      const res = await createBooking(phone, partySize, date, time);
      await client.sendMessage(msg.from, res.message);
      return;
    }

    // Welcome or Help message
    const helpMsg = `Welcome to ${config.restaurant.name}! 🍽️

Commands you can use:
- "menu": View our menu and prices.
- "book [partySize] on [YYYY-MM-DD] at [HH:mm]": Make a reservation. (e.g., book 4 on ${moment().format('YYYY-MM-DD')} at 19:00)
- "cancel [id]": Cancel an existing reservation.`;

    await client.sendMessage(msg.from, helpMsg);
  });

  client.initialize();
}

module.exports = {
  initWhatsApp
};
