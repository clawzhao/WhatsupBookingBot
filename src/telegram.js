const TelegramBot = require('node-telegram-bot-api');
const { getMenuText } = require('./menu');
const { createBooking, cancelBooking, getAllBookings } = require('./booking');
const { loadConfig } = require('./config');
const moment = require('moment-timezone');

console.log('[Telegram] Bot module loaded - v2'); // version marker

let bot = null;
const userSessions = {};

function initTelegram(token) {
  if (!token) {
    console.warn('Telegram bot token not provided. Skipping Telegram initialization.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  const ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS
    ? process.env.TELEGRAM_ALLOWED_USERS.split(',').map(id => id.trim())
    : [];

  function isAllowedUser(chat) {
    if (ALLOWED_USERS.length === 0) return true;
    return ALLOWED_USERS.includes(String(chat.id));
  }

  // Main menu keyboard (reply)
  const mainMenuKeyboard = {
    reply_markup: {
      keyboard: [
        ['📋 Menu', '📅 Book a Table'],
        ['❌ Cancel Booking', '📋 My Bookings']
      ],
      resize_keyboard: true
    }
  };

  function showMainMenu(chatId, message = 'Welcome! Please choose an option:') {
    bot.sendMessage(chatId, message, mainMenuKeyboard);
  }

  function editOrSend(chatId, messageId, text, options = {}) {
    if (messageId) {
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        ...options
      }).catch(() => {
        bot.sendMessage(chatId, text, options);
      });
    } else {
      bot.sendMessage(chatId, text, options);
    }
  }

  function getSummaryCard(session) {
    if (!session || !session.date || !session.time || !session.partySize) {
      return null;
    }
    const displayDate = moment(session.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
    return `📄 *Current Selection*\n\n📅 ${displayDate}\n⏰ ${session.time}\n👥 ${session.partySize} ${session.partySize === 1 ? 'person' : 'people'}`;
  }

  // Calendar with today's date highlighted
  function generateCalendar(year, month, selectedDate = null) {
    const config = loadConfig();
    const timezone = config?.restaurant?.timezone || 'UTC';
    const firstDay = moment.tz([year, month], timezone).startOf('month');
    const lastDay = moment.tz([year, month], timezone).endOf('month');
    const startWeekday = firstDay.day();
    const daysInMonth = lastDay.date();
    const today = moment.tz(timezone).startOf('day');
    const maxDate = moment.tz(timezone).add(90, 'days');

    const buttons = [];
    // Weekday headers
    buttons.push(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => ({ text: `<b>${d}</b>`, callback_data: 'ignore' })));

    // Empty cells
    let row = [];
    for (let i = 0; i < startWeekday; i++) {
      row.push({ text: ' ', callback_data: 'ignore' });
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = moment.tz([year, month, day], timezone);
      const dateStr = date.format('YYYY-MM-DD');
      const isToday = date.isSame(today, 'day');
      const isSelected = selectedDate === dateStr;

      if (date.isBefore(today, 'day')) {
        // Past dates are greyed out
        row.push({ text: `▪${day}▪`, callback_data: 'ignore' });
      } else if (date.isAfter(maxDate, 'day')) {
        // Dates beyond 90 days are greyed out
        row.push({ text: `▪${day}▪`, callback_data: 'ignore' });
      } else {
        let label = `${day}`;
        if (isToday) label = `✅${day}`;
        if (isSelected) label = `🔘${day}`;
        const dayName = date.format('ddd');
        row.push({ text: `${label}\n${dayName}`, callback_data: `date_${dateStr}` });
      }

      if (row.length === 7) {
        buttons.push(row);
        row = [];
      }
    }

    // Complete last row with empty cells if needed
    while (row.length > 0 && row.length < 7) {
      row.push({ text: ' ', callback_data: 'ignore' });
    }
    if (row.length === 7) {
      buttons.push(row);
    }

    // Navigation
    const prevMonth = moment.tz([year, month], timezone).subtract(1, 'month');
    const nextMonth = moment.tz([year, month], timezone).add(1, 'month');
    buttons.push([
      { text: '◀️', callback_data: `calendar_${prevMonth.year()}_${prevMonth.month()}` },
      { text: `<b>${moment([year, month]).format('MMM YYYY')}</b>`, callback_data: 'ignore' },
      { text: '▶️', callback_data: `calendar_${nextMonth.year()}_${nextMonth.month()}` }
    ]);

    buttons.push([{ text: '🔙 Main Menu', callback_data: 'main_menu' }]);

    return { inline_keyboard: buttons };
  }

  // Time slots with smart suggestion
  function generateTimeSlots(dateStr, includeBack = true) {
    const config = loadConfig();
    const restaurant = config?.restaurant || {};
    const timezone = restaurant.timezone || 'UTC';
    const dayName = moment.tz(dateStr, 'YYYY-MM-DD', timezone).format('dddd');
    const dayHours = restaurant.openingHours?.[dayName];

    if (!dayHours) {
      return { inline_keyboard: [[{ text: `Closed on ${dayName}`, callback_data: 'ignore' }]] };
    }

    const open = dayHours.open.split(':').map(Number);
    const close = dayHours.close.split(':').map(Number);
    const startMin = open[0] * 60 + open[1];
    const endMin = close[0] * 60 + close[1];
    const slotDuration = restaurant.slotDuration || 30;

    // Check if date is today - using restaurant's timezone
    const now = moment.tz(timezone);
    const selectedDate = moment.tz(dateStr, 'YYYY-MM-DD', timezone);
    const isToday = selectedDate.isSame(now, 'day');
    const currentMin = isToday ? now.hours() * 60 + now.minutes() : -1; // -1 means not today
    let suggestedMin = null;

    const buttons = [];
    let firstFutureMin = null;

    for (let min = startMin; min < endMin; min += slotDuration) {
      // If today, skip times that have already passed (add 1 hour buffer for booking)
      if (isToday && min < currentMin + 60) {
        continue; // Skip past times
      }

      // Track first available future time for suggestion
      if (firstFutureMin === null) {
        firstFutureMin = min;
        suggestedMin = min;
      }

      const hh = Math.floor(min / 60).toString().padStart(2, '0');
      const mm = (min % 60).toString().padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      const label = (min === suggestedMin) ? `⭐ ${timeStr}` : timeStr;
      buttons.push([{ text: label, callback_data: `time_${dateStr}_${timeStr}` }]);
    }

    // If today but no future times available
    if (isToday && buttons.length === 0) {
      return { inline_keyboard: [[{ text: '❌ No available slots for today', callback_data: 'ignore' }], [{ text: '🔙 Back to Date', callback_data: 'back_to_date' }]] };
    }

    if (includeBack) {
      buttons.push([{ text: '🔙 Back to Date', callback_data: 'back_to_date' }]);
    }

    return { inline_keyboard: buttons };
  }

  // /start command
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();

    if (!isAllowedUser(msg.chat)) {
      bot.sendMessage(chatId, '⛔ You are not authorized to use this bot.');
      return;
    }

    if (text === '/start') {
      delete userSessions[chatId];
      showMainMenu(chatId, 'Welcome! Use the buttons below to navigate:');
    }
  });

  // Callback query handler
  bot.on('callback_query', async (query) => {
    try {
      const chatId = query.message.chat.id;
      const data = query.data;
      const userId = query.from.id; // use the user who pressed the button

      if (!isAllowedUser(query.message.chat)) {
        await bot.answerCallbackQuery(query.id, { text: '⛔ Not authorized', show_alert: true });
        return;
      }

      await bot.answerCallbackQuery(query.id);

      if (data === 'ignore' || data === 'error') return;

    // Main menu
    if (data === 'main_menu') {
      delete userSessions[chatId];
      bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
      showMainMenu(chatId);
      return;
    }

    // Calendar navigation
    if (data.startsWith('calendar_')) {
      const [_, yearStr, monthStr] = data.split('_');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const session = userSessions[chatId] || {};
      session.year = year;
      session.month = month;
      session.step = 'booking_date';
      userSessions[chatId] = session;
      editOrSend(chatId, query.message.message_id, `📅 Select a date:`, generateCalendar(year, month, session.date));
      return;
    }

    // Date selected
    if (data.startsWith('date_')) {
      const dateStr = data.substring(5);
      const session = userSessions[chatId] || {};
      session.date = dateStr;
      session.step = 'booking_time';
      userSessions[chatId] = session;

      const displayDate = moment(dateStr, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
      editOrSend(chatId, query.message.message_id, `📅 Selected: ${displayDate}\n\nPick a time slot:`, {
        reply_markup: generateTimeSlots(dateStr),
        parse_mode: 'HTML'
      });
      return;
    }

    // Back to date selection
    if (data === 'back_to_date') {
      const session = userSessions[chatId];
      if (session) {
        session.step = 'booking_date';
        showCalendar(chatId, session.year, session.month);
      }
      return;
    }

    // Time selected
    if (data.startsWith('time_')) {
      const [, dateStr, timeStr] = data.split('_');
      const session = userSessions[chatId] || {};
      session.time = timeStr;
      session.step = 'booking_party';
      userSessions[chatId] = session;

      const config = loadConfig();
      const maxParty = config?.restaurant?.maxPartySize || 10;
      const partyRows = [];
      for (let i = 1; i <= Math.min(maxParty, 6); i++) {
        partyRows.push([{ text: `${i} ${i === 1 ? 'person' : 'people'}`, callback_data: `party_${i}` }]);
      }
      if (maxParty > 6) {
        partyRows.push([{ text: `${maxParty}+ (large party)`, callback_data: `party_${maxParty}` }]);
      }
      partyRows.push([{ text: '🔙 Back to Time', callback_data: 'back_to_time' }]);

      const displayDate = moment(dateStr, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
      const text = `📅 Date: ${displayDate}\n⏰ Time: ${timeStr}\n\n👥 How many people? (max ${maxParty})`;

      editOrSend(chatId, query.message.message_id, text, {
        reply_markup: { inline_keyboard: partyRows }
      });
      return;
    }

    // Back to time selection
    if (data === 'back_to_time') {
      const session = userSessions[chatId];
      if (session) {
        session.step = 'booking_time';
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        bot.sendMessage(chatId, 'Pick a time slot:', {
          reply_markup: generateTimeSlots(session.date, true),
          parse_mode: 'HTML'
        });
      }
      return;
    }

    // Party size selected
    if (data.startsWith('party_')) {
      const partySize = parseInt(data.split('_')[1], 10);
      const session = userSessions[chatId] || {};
      session.partySize = partySize;
      session.step = 'booking_confirm';
      userSessions[chatId] = session;

      const summary = getSummaryCard(session);
      const text = `Please confirm your booking:\n\n${summary}\n\n✅ Confirm or ❌ Cancel`;

      editOrSend(chatId, query.message.message_id, text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirm', callback_data: 'confirm_yes' }, { text: '❌ Cancel', callback_data: 'confirm_no' }]
          ]
        }
      });
      return;
    }

    // Confirmation
    if (data === 'confirm_yes') {
      const session = userSessions[chatId];
      if (!session) {
        bot.sendMessage(chatId, 'Session expired. Please start again.');
        showMainMenu(chatId);
        return;
      }

      // Use chatId as phone (consistent identifier)
      const phone = chatId.toString();

      try {
        const result = await createBooking(phone, session.partySize, session.date, session.time);
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

        if (result.success) {
          bot.sendMessage(chatId, `✅ *Booking confirmed!*\nReservation ID: \`${result.id}\``, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `❌ Booking failed: ${result.message}`);
        }
      } catch (err) {
        console.error('Booking error:', err);
        bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
      }

      delete userSessions[chatId];
      showMainMenu(chatId);
      return;
    }

    if (data === 'confirm_no') {
      bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
      bot.sendMessage(chatId, 'Booking cancelled.');
      delete userSessions[chatId];
      showMainMenu(chatId);
      return;
    }

    // Cancel confirmation buttons
    if (data === 'cancel_confirm_yes') {
      const session = userSessions[chatId];
      if (!session || !session.cancelBookingId) {
        bot.sendMessage(chatId, 'No cancellation pending. Please start again.');
        showMainMenu(chatId);
        return;
      }

      const { cancelBookingId, cancelBookingDetails } = session;
      const phoneChatId = chatId.toString();
      const dbPhone = String(cancelBookingDetails.phone);
      const phoneToUse = dbPhone;

      try {
        const result = await cancelBooking(phoneToUse, cancelBookingId);
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

        if (result.success) {
          const displayDate = moment(cancelBookingDetails.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
          const summary = `✅ *Booking Cancelled*\n\n📅 Date: ${displayDate}\n⏰ Time: ${cancelBookingDetails.time}\n👥 Party: ${cancelBookingDetails.partySize}\n📌 Reservation ID: ${cancelBookingId}\n\nThis booking has been cancelled.`;
          bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `❌ Could not cancel: ${result.message}`);
        }
      } catch (err) {
        console.error('Cancel error:', err);
        bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
      }

      delete userSessions[chatId];
      showMainMenu(chatId);
      return;
    }

    if (data === 'cancel_confirm_no') {
      bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
      bot.sendMessage(chatId, 'Cancellation aborted. Booking remains active.');
      delete userSessions[chatId];
      showMainMenu(chatId);
      return;
    }

    // Cancel booking from inline list
    if (data.startsWith('cancel_')) {
      const id = parseInt(data.split('_')[1], 10);
      const phoneChatId = chatId.toString();
      const username = query.message.chat.username ? `@${query.message.chat.username}` : null;
      const allBookings = await getAllBookings();
      const targetBooking = allBookings.find(b => b.id === id);

      if (!targetBooking) {
        await bot.answerCallbackQuery(query.id, { text: 'Booking not found.', show_alert: true });
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        showMainMenu(chatId);
        return;
      }

      // Verify ownership: booking phone must match either chatId or username
      const dbPhone = String(targetBooking.phone);
      if (dbPhone !== phoneChatId && (!username || dbPhone !== username)) {
        console.log(`[Cancel] Ownership mismatch: booking phone=${targetBooking.phone}, chatId=${phoneChatId}, username=${username}`);
        await bot.answerCallbackQuery(query.id, { text: 'You can only cancel your own bookings.', show_alert: true });
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        showMainMenu(chatId);
        return;
      }

      // Store in session and ask for confirmation
      const session = userSessions[chatId] || {};
      session.cancelBookingId = id;
      session.cancelBookingDetails = targetBooking;
      session.step = 'cancel_confirm';
      userSessions[chatId] = session;

      const displayDate = moment(targetBooking.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
      const confirmText = `⚠️ *Cancel Booking Confirmation*\n\n📅 Date: ${displayDate}\n⏰ Time: ${targetBooking.time}\n👥 Party: ${targetBooking.partySize}\n\nAre you sure you want to cancel this reservation?`;
      editOrSend(chatId, query.message.message_id, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Yes, Cancel', callback_data: 'cancel_confirm_yes' }, { text: '❌ No, Keep It', callback_data: 'cancel_confirm_no' }]
          ]
        }
      });
      return;
    }
    } catch (err) {
      console.error('[Callback Query] Error:', err.message);
      console.error(err.stack);
      try {
        bot.answerCallbackQuery(query.id, { text: '❌ Error processing request', show_alert: true });
      } catch (e) {
        console.error('[Callback Query] Error sending error message:', e.message);
      }
    }
  });

  // Text message handler (main menu buttons and typed fallback)
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = (msg.text || '').trim();

    if (!text) return;

    // Authorization
    if (!isAllowedUser(msg.chat)) {
      bot.sendMessage(chatId, '⛔ You are not authorized to use this bot.');
      return;
    }

    // DEBUG command - show all bookings with phone IDs
    if (text === '/debug') {
      const all = await getAllBookings();
      const myPhone = chatId.toString();
      const response = `📊 Debug Info\nYour chat ID (phone): ${myPhone}\nTotal bookings in DB: ${all.length}\n\nAll bookings:\n${all.map(b => `ID ${b.id}: phone=${b.phone}, date=${b.date}, time=${b.time}, status=${b.status}`).join('\n')}`;
      bot.sendMessage(chatId, response);
      showMainMenu(chatId);
      return;
    }

    // Always handle these commands first (they override any session)
    if (['/start', '📋 Menu', '/menu', '📅 Book a Table', '/book', '❌ Cancel Booking', '/cancel', '📋 My Bookings', '/mybookings'].includes(text)) {
      delete userSessions[chatId];

      if (text === '/start' || text === '📋 Menu' || text === '/menu') {
        console.log(`[Menu] Requested by chatId=${chatId}, text="${text}"`);
        const menuResponse = getMenuText();
        console.log(`[Menu] Response length: ${menuResponse.length}`);
        bot.sendMessage(chatId, menuResponse, { parse_mode: 'Markdown' }).then(() => {
          console.log(`[Menu] Sent successfully to ${chatId}`);
          showMainMenu(chatId);
        }).catch(err => {
          console.error('[Menu] Send error:', err.message);
          showMainMenu(chatId);
        });
        return;
      }

      if (text === '📅 Book a Table' || text === '/book') {
        userSessions[chatId] = { step: 'booking_date' };
        const now = moment();
        showCalendar(chatId, now.year(), now.month());
        return;
      }

      if (text === '📋 My Bookings' || text === '/mybookings') {
        const phone = chatId.toString();
        const username = msg.from.username ? `@${msg.from.username}` : null;
        const bookings = await getAllBookings();
        // Match by chatId OR by username (backwards compatibility)
        const myBookings = bookings.filter(b => {
          if (b.status !== 'confirmed') return false;
          const dbPhone = String(b.phone);
          return dbPhone === phone || (username && dbPhone === username);
        });

        if (myBookings.length === 0) {
          bot.sendMessage(chatId, `You have no active bookings.\n\nYour chat ID: ${phone}\nUsername: ${username || 'none'}\nTotal bookings in DB: ${bookings.length}\n\nUse /debug to see all bookings and their phone IDs.`);
          showMainMenu(chatId);
          return;
        }

        let response = 'Your active bookings:\n\n';
        myBookings.forEach(b => {
          response += `🔢 ID: ${b.id}\n📅 ${b.date} at ${b.time}\n👥 ${b.partySize} people\n\n`;
        });
        bot.sendMessage(chatId, response);
        showMainMenu(chatId);
        return;
      }

      if (text === '❌ Cancel Booking' || text === '/cancel') {
        const phone = chatId.toString();
        const username = msg.from.username ? `@${msg.from.username}` : null;
        const bookings = await getAllBookings();
        // Match by chatId OR by username
        const myBookings = bookings.filter(b => {
          if (b.status !== 'confirmed') return false;
          const dbPhone = String(b.phone);
          return dbPhone === phone || (username && dbPhone === username);
        });

        console.log(`[Cancel Menu] chatId=${chatId}, phone=${phone}, username=${username}, total bookings=${bookings.length}, user confirmed=${myBookings.length}`);

        if (myBookings.length === 0) {
          bot.sendMessage(chatId, `No confirmed bookings found for your account.\n\nYour chat ID: ${phone}\nUsername: ${username || 'none'}\nTotal bookings in DB: ${bookings.length}\n\nUse /debug to see all bookings.`);
          showMainMenu(chatId);
          return;
        }

        const keyboard = { inline_keyboard: [] };
        myBookings.forEach(b => {
          keyboard.inline_keyboard.push([
            { text: `Cancel ID ${b.id} (${b.date} ${b.time})`, callback_data: `cancel_${b.id}` }
          ]);
        });
        keyboard.inline_keyboard.push([{ text: '🔙 Main Menu', callback_data: 'main_menu' }]);

        bot.sendMessage(chatId, `Found ${myBookings.length} booking(s) to cancel:`, { reply_markup: keyboard });
        return;
      }
    }

    // If we reach here and there's no active session, show main menu
    if (!userSessions[chatId]) {
      showMainMenu(chatId);
      return;
    }

    // Typed fallback during active session
    const session = userSessions[chatId];
    const config = loadConfig();
    const restaurant = config?.restaurant || {};

    // Date typing
    if (session.step === 'booking_date') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const date = moment(text, 'YYYY-MM-DD', true);
        if (!date.isValid()) {
          bot.sendMessage(chatId, 'Invalid date format. Use YYYY-MM-DD.');
          return;
        }
        const timezone = restaurant.timezone || 'UTC';
        const today = moment.tz(timezone).startOf('day');
        const maxDate = moment.tz(timezone).add(90, 'days');
        const selectedDate = moment(text, 'YYYY-MM-DD', true);
        if (selectedDate.isBefore(today) || selectedDate.isAfter(maxDate)) {
          bot.sendMessage(chatId, 'Date must be within the next 90 days.');
          return;
        }
        const dayName = date.format('dddd');
        if (!restaurant.openingHours?.[dayName]) {
          bot.sendMessage(chatId, `Closed on ${dayName}. Choose another date.`);
          return;
        }
        session.date = text;
        session.step = 'booking_time';
        userSessions[chatId] = session;
        bot.sendMessage(chatId, `Selected date: ${date.format('ddd MMM D, YYYY')}\n\nPick a time slot:`, {
          reply_markup: generateTimeSlots(text),
          parse_mode: 'HTML'
        });
        return;
      }
    }

    // Time typing
    if (session.step === 'booking_time') {
      if (/^\d{2}:\d{2}$/.test(text)) {
        const [hh, mm] = text.split(':').map(Number);
        const timeMin = hh * 60 + mm;
        const dayName = moment(session.date, 'YYYY-MM-DD').format('dddd');
        const dayHours = restaurant.openingHours?.[dayName];
        if (!dayHours) {
          bot.sendMessage(chatId, `Closed on ${dayName}. Pick another date.`);
          return;
        }
        const open = dayHours.open.split(':').map(Number);
        const close = dayHours.close.split(':').map(Number);
        const openMin = open[0] * 60 + open[1];
        const closeMin = close[0] * 60 + close[1];
        const slotDuration = restaurant.slotDuration || 30;
        
        if (timeMin < openMin || timeMin >= closeMin) {
          bot.sendMessage(chatId, `Time must be between ${dayHours.open} and ${dayHours.close}.`);
          return;
        }
        
        if ((timeMin - openMin) % slotDuration !== 0) {
          bot.sendMessage(chatId, `Choose a time on a ${slotDuration}-minute interval.`);
          return;
        }
        
        // If today, check if time is in the future (+ 1 hour buffer)
        const timezone = restaurant.timezone || 'UTC';
        const now = moment.tz(timezone);
        const selectedDate = moment.tz(session.date, 'YYYY-MM-DD', timezone);
        const isToday = selectedDate.isSame(now, 'day');
        if (isToday) {
          const currentMin = now.hours() * 60 + now.minutes();
          if (timeMin < currentMin + 60) {
            bot.sendMessage(chatId, `Time must be at least 1 hour from now. Next available: ${dayHours.open}`);
            return;
          }
        }
        
        session.time = text;
        session.step = 'booking_party';
        userSessions[chatId] = session;

        const maxPartySize = restaurant.maxPartySize || 10;
        bot.sendMessage(chatId, `📅 Date: ${session.date}\n⏰ Time: ${text}\n\nHow many people? (1-${maxPartySize})`);
        return;
      }
    }

    // Party size typing
    if (session.step === 'booking_party') {
      const partySize = parseInt(text, 10);
      const maxParty = config.maxPartySize || 10;
      if (partySize >= 1 && partySize <= maxParty) {
        session.partySize = partySize;
        session.step = 'booking_confirm';
        userSessions[chatId] = session;

        const summary = getSummaryCard(session);
        bot.sendMessage(chatId, `Confirm your booking:\n\n${summary}\n\nReply "confirm" to book or "cancel" to abort.`);
        return;
      } else {
        bot.sendMessage(chatId, `Enter a number between 1 and ${maxParty}.`);
        return;
      }
    }

    // Final confirmation typing
    if (session.step === 'booking_confirm') {
      if (text.toLowerCase() === 'confirm') {
        const phone = chatId.toString();
        try {
          const result = await createBooking(phone, session.partySize, session.date, session.time);
          if (result.success) {
            bot.sendMessage(chatId, `✅ Booking confirmed! ID: ${result.id}\n\nThank you!`);
          } else {
            bot.sendMessage(chatId, `❌ Failed: ${result.message}`);
          }
        } catch (err) {
          console.error('Booking error:', err);
          bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
        }
        delete userSessions[chatId];
        showMainMenu(chatId);
        return;
      } else if (text.toLowerCase() === 'cancel') {
        delete userSessions[chatId];
        bot.sendMessage(chatId, 'Booking cancelled.');
        showMainMenu(chatId);
        return;
      }
    }

    // If we get here with an active session but unrecognized input, prompt
    if (userSessions[chatId]) {
      bot.sendMessage(chatId, 'Please follow the flow using buttons or type a valid value.');
      return;
    }

    // Default: show main menu
    showMainMenu(chatId);
    } catch (err) {
      console.error('[Message Handler] Error:', err.message);
      console.error(err.stack);
      try {
        bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
      } catch (e) {
        console.error('[Message Handler] Error sending error message:', e.message);
      }
    }
  });

  function showCalendar(chatId, year, month) {
    const session = userSessions[chatId] || {};
    session.year = year;
    session.month = month;
    session.step = 'booking_date';
    userSessions[chatId] = session;

    bot.sendMessage(chatId, `📅 Select a date:`, {
      reply_markup: generateCalendar(year, month, session.date),
      parse_mode: 'HTML'
    });
  }

  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
  });

  console.log('Telegram Bot is ready and listening!');
  return bot;
}

module.exports = {
  initTelegram,
  getBot: () => bot
};
