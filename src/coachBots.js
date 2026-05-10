/**
 * Coach Telegram Bots Service
 * 
 * Manages multiple Telegram bots — one per coach.
 * Each coach has their own bot token. When a customer books a session,
 * the coach's bot sends them a notification.
 * 
 * Coach data is stored in SQLite (coaches table), not in JSON config.
 */

const TelegramBot = require('node-telegram-bot-api');
const coachService = require('./coachService');

/** Map of coachId -> TelegramBot instance */
const coachBots = new Map();

/** Map of coachId -> coach data object (with chat_id) */
const coachData = new Map();

/**
 * Initialize Telegram bots for all coaches that have a bot token configured.
 * Each bot listens for /start to capture the coach's chat ID.
 */
async function initCoachBots() {
  let coaches;
  try {
    coaches = await coachService.getAllCoaches();
  } catch (err) {
    console.error('[CoachBots] Failed to load coaches from DB:', err.message);
    return;
  }

  if (coaches.length === 0) {
    console.log('[CoachBots] No coaches in database. Skipping coach bot initialization.');
    return;
  }

  let initializedCount = 0;

  for (const coach of coaches) {
    if (!coach.telegram_bot_token) {
      console.log(`[CoachBots] Coach "${coach.name}" (${coach.id}) has no bot token. Skipping.`);
      continue;
    }

    try {
      const bot = new TelegramBot(coach.telegram_bot_token, { polling: true });
      coachBots.set(coach.id, bot);
      coachData.set(coach.id, coach);

      // Register /start handler to capture the coach's chat ID
      bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const coachName = coach.name;

        // Persist the chat ID to SQLite
        coachService.updateCoachChatId(coach.id, String(chatId))
          .then(() => {
            coach.telegram_chat_id = String(chatId);
            console.log(`[CoachBots] Coach "${coachName}" chat ID saved: ${chatId}`);
          })
          .catch(err => {
            console.error(`[CoachBots] Failed to save chat ID for "${coachName}":`, err.message);
          });

        bot.sendMessage(
          chatId,
          `👋 Welcome Coach ${coachName}!\n\n`
          + `You are now connected to the booking system. `
          + `You will receive notifications here when a customer books a session with you.\n\n`
          + `Use /status to check your connection status.`
        );
      });

      // /status command
      bot.onText(/\/status/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
          chatId,
          `✅ *Coach Bot Active*\n\n`
          + `Name: ${coach.name}\n`
          + `ID: ${coach.id}\n`
          + `Chat ID: ${chatId}\n`
          + `Status: Connected and receiving notifications`,
          { parse_mode: 'Markdown' }
        );
      });

      // Log polling errors without crashing
      bot.on('polling_error', (error) => {
        console.error(`[CoachBots] Polling error for coach "${coach.name}" (${coach.id}):`, error.message);
      });

      initializedCount++;
      console.log(`[CoachBots] Bot initialized for coach "${coach.name}" (${coach.id})`);
    } catch (err) {
      console.error(`[CoachBots] Failed to initialize bot for coach "${coach.name}" (${coach.id}):`, err.message);
    }
  }

  console.log(`[CoachBots] Initialized ${initializedCount}/${coaches.length} coach bots`);
}

/**
 * Send a notification to a specific coach's Telegram bot.
 * 
 * @param {string} coachId - The coach ID (e.g., "coach-1")
 * @param {string} message - The message text to send
 * @returns {Promise<boolean>} - Whether the notification was sent successfully
 */
async function notifyCoach(coachId, message) {
  const bot = coachBots.get(coachId);
  const coach = coachData.get(coachId);

  if (!bot) {
    console.warn(`[CoachBots] No bot found for coach "${coachId}". Cannot send notification.`);
    return false;
  }

  if (!coach || !coach.telegram_chat_id) {
    console.warn(`[CoachBots] Coach "${coachId}" has no chat ID. Coach must start the bot first with /start.`);
    return false;
  }

  try {
    await bot.sendMessage(coach.telegram_chat_id, message, { parse_mode: 'Markdown' });
    console.log(`[CoachBots] Notification sent to coach "${coachId}" (${coach.name})`);
    return true;
  } catch (err) {
    console.error(`[CoachBots] Failed to send notification to coach "${coachId}":`, err.message);
    return false;
  }
}

/**
 * Send a booking notification to the assigned coach.
 * 
 * @param {object} booking - The booking object { id, phone, partySize, date, time }
 * @param {string} coachId - The coach ID to notify
 */
async function notifyCoachOfBooking(booking, coachId) {
  const coach = coachData.get(coachId);
  const coachName = coach?.name || coachId;

  const message =
    `📢 *New Booking Notification*\n\n`
    + `🏊 Coach: ${coachName}\n`
    + `📅 Date: ${booking.date}\n`
    + `⏰ Time: ${booking.time}\n`
    + `👤 Customer Phone: ${booking.phone}\n`
    + `👥 Party Size: ${booking.partySize}\n`
    + `🔖 Booking ID: \`${booking.id}\``;

  return notifyCoach(coachId, message);
}

/**
 * Send a cancellation notification to the assigned coach.
 * 
 * @param {object} booking - The cancelled booking object
 * @param {string} coachId - The coach ID to notify
 */
async function notifyCoachOfCancellation(booking, coachId) {
  const coach = coachData.get(coachId);
  const coachName = coach?.name || coachId;

  const message =
    `❌ *Booking Cancelled*\n\n`
    + `🏊 Coach: ${coachName}\n`
    + `📅 Date: ${booking.date}\n`
    + `⏰ Time: ${booking.time}\n`
    + `👤 Customer Phone: ${booking.phone}\n`
    + `🔖 Booking ID: \`${booking.id}\``;

  return notifyCoach(coachId, message);
}

/**
 * Get the list of initialized coach bots (for status/debugging).
 */
function getCoachBotStatus() {
  const statuses = [];
  for (const [coachId, bot] of coachBots) {
    const coach = coachData.get(coachId);
    statuses.push({
      id: coachId,
      name: coach?.name || 'Unknown',
      hasChatId: !!(coach?.telegram_chat_id),
      chatId: coach?.telegram_chat_id || null,
      botActive: true
    });
  }
  return statuses;
}

module.exports = {
  initCoachBots,
  notifyCoach,
  notifyCoachOfBooking,
  notifyCoachOfCancellation,
  getCoachBotStatus
};