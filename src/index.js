require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initWhatsApp } = require('./whatsapp');
const { initTelegram } = require('./telegram');
const { initCoachBots, getCoachBotStatus } = require('./coachBots');
const {
  getAllBookings,
  updateBookingCoach,
  createUnavailability,
  getUnavailability,
  deleteUnavailability,
  dbReady,
  refreshCoachCache
} = require('./booking');
const coachService = require('./coachService');
const { loadConfig, saveConfig } = require('./config');
const { getPendingQuestions, getAllQuestions, markAsAnswered } = require('./unanswered');
const { getConversations, getMessages } = require('./chatlog');

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
    // Set Gemini API key to environment if provided
    if (newConfig?.restaurant?.aiApiKey) {
      process.env.GOOGLE_GEMINI_API_KEY = newConfig.restaurant.aiApiKey;
      console.log('[Config] Gemini API key updated in environment');
    }
    res.json({ success: true, message: 'Configuration updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// Check if AI feature is enabled (premium feature flag from .env)
app.get('/api/ai-enabled', (req, res) => {
  const aiEnabled = process.env.AI_ENABLED === 'true';
  res.json({ aiEnabled });
});

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Coaches (SQLite — not stored in config.json)
app.get('/api/coaches', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1';
    const rows = includeInactive
      ? await coachService.getAllCoachesAnyStatus()
      : await coachService.getAllCoaches();
    const list = rows.map((row) => {
      const pub = coachService.coachRowToPublic(row);
      return {
        ...pub,
        has_notification_bot: !!(row.telegram_bot_token && String(row.telegram_bot_token).trim()),
        coach_telegram_linked: !!(row.telegram_chat_id && String(row.telegram_chat_id).trim())
      };
    });
    res.json(list);
  } catch (error) {
    console.error('[API /coaches GET]', error);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

app.get('/api/coaches/:id', async (req, res) => {
  try {
    const row = await coachService.getCoach(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    const pub = coachService.coachRowToPublic(row);
    const hasTok = !!(row.telegram_bot_token && String(row.telegram_bot_token).trim());
    res.json({
      ...pub,
      has_notification_bot: hasTok,
      coach_telegram_linked: !!(row.telegram_chat_id && String(row.telegram_chat_id).trim())
    });
  } catch (error) {
    console.error('[API /coaches/:id GET]', error);
    res.status(500).json({ error: 'Failed to load coach' });
  }
});

/**
 * Send a one-off test message using the coach's notification bot (token + saved chat_id from /start).
 * Uses HTTPS API so it works even if the bot was not loaded at server startup.
 */
app.post('/api/coaches/:id/test-notification', async (req, res) => {
  try {
    const axios = require('axios');
    const row = await coachService.getCoach(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    const token = (row.telegram_bot_token || '').trim();
    const chatId = (row.telegram_chat_id || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'No Telegram bot token configured. Paste a token in the coach form and save.' });
    }
    if (!chatId) {
      return res.status(400).json({
        error:
          'Coach chat ID not registered yet. Open this coach’s bot in Telegram and send /start, then try again.'
      });
    }
    const text =
      (req.body && req.body.message) ||
      '✅ Test notification: your coach booking bot is reaching you. Bookings will appear here.';
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text
    });
    res.json({ success: true, message: 'Test message sent via coach bot' });
  } catch (error) {
    const msg = error.response?.data?.description || error.message;
    console.error('[API /coaches/:id/test-notification]', msg);
    res.status(500).json({ error: msg || 'Failed to send test message' });
  }
});

app.post('/api/coaches', async (req, res) => {
  try {
    const body = req.body || {};
    const id = (body.id || '').trim();
    const name = (body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const coachId = id || `coach_${Date.now()}`;
    const availability = body.availability && typeof body.availability === 'object' ? body.availability : {};
    const specialties = Array.isArray(body.specialties) ? body.specialties : [];
    const profile_json = JSON.stringify({
      specialties,
      availability,
      email: body.email || ''
    });
    const is_active = body.status === 'unavailable' ? 0 : 1;

    const payload = {
      id: coachId,
      name,
      phone: body.phone || '',
      email: body.email || '',
      profile_json,
      is_active
    };
    if (body.clear_coach_bot_token === true) {
      payload.telegram_bot_token = '';
    } else if (typeof body.telegram_bot_token === 'string' && body.telegram_bot_token.trim() !== '') {
      payload.telegram_bot_token = body.telegram_bot_token.trim();
    }

    await coachService.upsertCoach(payload);
    refreshCoachCache();
    res.json({ success: true, id: coachId });
  } catch (error) {
    console.error('[API /coaches POST]', error);
    res.status(500).json({ error: error.message || 'Failed to save coach' });
  }
});

app.delete('/api/coaches/:id', async (req, res) => {
  try {
    const ok = await coachService.setCoachActive(req.params.id, false);
    if (!ok) return res.status(404).json({ error: 'Coach not found' });
    refreshCoachCache();
    res.json({ success: true });
  } catch (error) {
    console.error('[API /coaches DELETE]', error);
    res.status(500).json({ error: 'Failed to remove coach' });
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

// ============ CHAT HISTORY ENDPOINTS ============

app.get('/api/chat-history', async (req, res) => {
  try {
    const conversations = await getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/chat-history/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { platform } = req.query;
    const messages = await getMessages(chatId, platform || null);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Emergency: Mark coach as unavailable and get affected bookings
app.post('/api/coach-emergency', async (req, res) => {
  try {
    const { coachId, date, reason = 'Unavailable' } = req.body;
    
    if (!coachId || !date) {
      return res.status(400).json({ error: 'coachId and date are required' });
    }

    // Get all bookings
    const bookings = await getAllBookings();
    
    // Find affected bookings for this coach on this date
    const affectedBookings = bookings.filter(b => 
      b.coach_id === coachId && 
      b.date === date && 
      b.status === 'confirmed'
    );

    // Extract unique customer chat IDs and phone numbers
    const affectedCustomers = affectedBookings.map(b => ({
      chatId: b.chat_id,
      phone: b.phone,
      bookingId: b.id,
      bookingTime: b.time,
      bookingDate: b.date
    }));

    res.json({
      success: true,
      coachId,
      date,
      reason,
      affectedBookings: affectedBookings.length,
      affectedCustomers,
      message: `Coach marked unavailable for ${date}. ${affectedBookings.length} booking(s) affected.`
    });
  } catch (error) {
    console.error('[Coach Emergency] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send emergency notifications to customers
app.post('/api/coach-emergency/notify', async (req, res) => {
  try {
    const { coachName, date, affectedCustomers, action = 'reschedule' } = req.body;
    
    if (!coachName || !affectedCustomers || !Array.isArray(affectedCustomers)) {
      return res.status(400).json({ error: 'coachName and affectedCustomers array are required' });
    }

    const { getBot } = require('./telegram');
    const bot = getBot();
    
    if (!bot) {
      return res.status(503).json({ error: 'Telegram bot not initialized' });
    }

    let notificationsSent = 0;
    let notificationsFailed = 0;
    const failedList = [];

    for (const customer of affectedCustomers) {
      try {
        if (customer.chatId) {
          const message = 
            `⚠️ *Important Notice*\n\n` +
            `Your coach ${coachName} is unavailable on ${date}.\n\n` +
            `Your booking at ${customer.bookingTime} on ${customer.bookingDate} is affected.\n\n` +
            `Options:\n` +
            `1️⃣ Reschedule to a different date/time\n` +
            `2️⃣ Switch to a different coach\n` +
            `3️⃣ Cancel this booking\n\n` +
            `Please reply with your preference or contact us for assistance.\n` +
            `Reservation ID: ${customer.bookingId}`;
          
          await bot.sendMessage(customer.chatId, message, { parse_mode: 'Markdown' });
          notificationsSent++;
        }
      } catch (err) {
        console.error(`Failed to notify customer ${customer.chatId}:`, err);
        notificationsFailed++;
        failedList.push({ chatId: customer.chatId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Notifications sent: ${notificationsSent}, Failed: ${notificationsFailed}`,
      notificationsSent,
      notificationsFailed,
      failedList: failedList.length > 0 ? failedList : undefined
    });
  } catch (error) {
    console.error('[Coach Emergency Notify] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { app };

// ============ ASSIGN COACH TO BOOKING ============

app.patch('/api/bookings/:id/assign-coach', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { coachId, coachName } = req.body;
    if (!coachId || !coachName) {
      return res.status(400).json({ error: 'coachId and coachName are required' });
    }
    const result = await updateBookingCoach(id, coachId, coachName);
    if (!result.success) return res.status(404).json({ error: result.message });
    res.json({ success: true });
  } catch (error) {
    console.error('[Assign Coach] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ COACH UNAVAILABILITY ============

app.post('/api/coach-unavailability', async (req, res) => {
  try {
    const { coachId, coachName, reason, type, startDate, endDate, startTime, endTime } = req.body;
    if (!coachId || !type || !startDate) {
      return res.status(400).json({ error: 'coachId, type, and startDate are required' });
    }
    const end = endDate || startDate;
    const record = await createUnavailability(coachId, coachName, reason, type, startDate, end, startTime, endTime);

    // Find bookings affected by this unavailability window
    const allBookings = await getAllBookings();
    const affected = allBookings.filter(b => {
      if (b.coach_id !== coachId || b.status !== 'confirmed') return false;
      if (b.date < startDate || b.date > end) return false;
      if (type === 'am') return b.time < '12:00';
      if (type === 'pm') return b.time >= '12:00';
      if (type === 'custom') {
        if (b.date === startDate && startTime && b.time < startTime) return false;
        if (b.date === end && endTime && b.time > endTime) return false;
      }
      return true;
    });

    res.json({
      success: true,
      id: record.id,
      affectedBookings: affected.map(b => ({
        id: b.id,
        chatId: b.chat_id,
        phone: b.phone,
        date: b.date,
        time: b.time
      }))
    });
  } catch (error) {
    console.error('[Coach Unavailability] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coach-unavailability', async (req, res) => {
  try {
    const { coachId } = req.query;
    const records = await getUnavailability(coachId || null);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/coach-unavailability/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await deleteUnavailability(id);
    if (!result.success) return res.status(404).json({ error: result.message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/coach-unavailability/notify', async (req, res) => {
  try {
    const { coachName, reason, affectedBookings } = req.body;
    if (!coachName || !Array.isArray(affectedBookings)) {
      return res.status(400).json({ error: 'coachName and affectedBookings array are required' });
    }

    const { getBot } = require('./telegram');
    const bot = getBot();
    if (!bot) return res.status(503).json({ error: 'Telegram bot not initialized' });

    let sent = 0, failed = 0;
    for (const b of affectedBookings) {
      if (!b.chatId) continue;
      try {
        const msg =
          `⚠️ *Schedule Change Notice*\n\n` +
          `Your coach *${coachName}* is unavailable on *${b.date}* at *${b.time}*.\n\n` +
          `📋 Reason: ${reason || 'Unavailable'}\n` +
          `📌 Booking ID: ${b.id}\n\n` +
          `Please reply or contact us to reschedule or choose another coach.`;
        await bot.sendMessage(b.chatId, msg, { parse_mode: 'Markdown' });
        sent++;
      } catch (err) {
        console.error(`Failed to notify chatId ${b.chatId}:`, err.message);
        failed++;
      }
    }
    res.json({ success: true, sent, failed });
  } catch (error) {
    console.error('[Coach Unavailability Notify] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    const config = loadConfig();
    if (config?.restaurant?.aiApiKey && config.restaurant.aiEnabled) {
      process.env.GOOGLE_GEMINI_API_KEY = config.restaurant.aiApiKey;
      console.log('[Config] Gemini AI enabled and API key loaded from config');
    }

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
