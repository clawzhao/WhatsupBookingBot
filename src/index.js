require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initWhatsApp } = require('./whatsapp');
const { initTelegram } = require('./telegram');
const { getAllBookings } = require('./booking');
const { loadConfig, saveConfig } = require('./config');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Admin Dashboard Endpoints

app.get('/api/config', (req, res) => {
  const config = loadConfig();
  if (config) {
    res.json(config);
  } else {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.post('/api/config', (req, res) => {
  const newConfig = req.body;
  if (saveConfig(newConfig)) {
    res.json({ success: true, message: 'Configuration updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

module.exports = { app };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    // Initialize messaging platforms
    const waEnabled = process.env.WHATSAPP_ENABLED !== 'false';
    if (waEnabled) {
      console.log('Initializing WhatsApp Client...');
      initWhatsApp();
    } else {
      console.log('WhatsApp disabled (set WHATSAPP_ENABLED=true to enable)');
    }

    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    if (tgToken) {
      console.log('Initializing Telegram Bot...');
      initTelegram(tgToken);
    } else {
      console.log('Telegram disabled (set TELEGRAM_BOT_TOKEN to enable)');
    }
  });
}
