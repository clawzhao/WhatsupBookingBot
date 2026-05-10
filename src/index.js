require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initWhatsApp } = require('./whatsapp');
const { initTelegram } = require('./telegram');
const { initCoachBots, getCoachBotStatus } = require('./coachBots');
const { getAllBookings, dbReady } = require('./booking');
const { loadConfig, saveConfig } = require('./config');
const { getPendingQuestions, getAllQuestions, markAsAnswered } = require('./unanswered');

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

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

// Coach Bot Status Endpoint
app.get('/api/coach-bots/status', (req, res) => {
  const statuses = getCoachBotStatus();
  res.json({ coachBots: statuses });
});

// Chatbot Proxy Endpoints - disabled for stability; call chatbot directly
// const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:8000';
// ... (endpoints commented out)


// ============ UNANSWERED QUESTIONS ENDPOINTS ============

// Get all unanswered questions (paginated)
app.get('/api/unanswered-questions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const questions = await getAllQuestions(limit, offset);
    res.json(questions);
  } catch (error) {
    console.error('Error fetching unanswered questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get only pending questions
app.get('/api/unanswered-questions/pending', async (req, res) => {
  try {
    const questions = await getPendingQuestions();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ error: 'Failed to fetch pending questions' });
  }
});

// Mark a question as answered with staff response
app.post('/api/unanswered-questions/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    
    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response message is required' });
    }
    
    await markAsAnswered(id, response);
    res.json({ success: true, message: 'Question marked as answered' });
  } catch (error) {
    console.error('Error responding to question:', error);
    res.status(500).json({ error: 'Failed to respond to question' });
  }
});

module.exports = { app };

if (require.main === module) {
  app.listen(port, async () => {
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

    // Wait for database tables to be ready before initializing coach bots
    // Coach data is stored in SQLite (coaches table), not in JSON config
    console.log('Waiting for database initialization...');
    await dbReady;
    console.log('Database ready. Initializing Coach Telegram Bots...');
    await initCoachBots();
  });
}

// Test endpoint for Telegram connectivity
app.post('/api/test-telegram', async (req, res) => {
  try {
    const { message, chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({
        error: 'chatId required. Start a telegram conversation with the bot first to get your chat ID.'
      });
    }

    const { getBot } = require('./telegram');
    const bot = getBot();
    
    if (!bot) {
      return res.status(503).json({ error: 'Telegram bot not initialized' });
    }

    await bot.sendMessage(chatId, message || '✅ Test message from Swimming Booking System!');
    res.json({ success: true, message: 'Message sent to Telegram' });
  } catch (error) {
    console.error('[Test Telegram] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
