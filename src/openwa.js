const axios = require('axios');
const moment = require('moment-timezone');
const { loadConfig } = require('./config');
const { getMenuText } = require('./menu');
const { createBooking, cancelBooking, getAllBookings } = require('./booking');
const { logMessage } = require('./chatlog');
const GeminiChatbot = require('./gemini-chatbot');
const { toolDeclarations, executeTool } = require('./bot-skills');

const userSessions = {};

// Cache the discovered session ID so we don't call /api/sessions on every message
let _cachedSessionId = null;

function getOpenWAConfig() {
  const config = loadConfig();
  const openwa = config?.restaurant?.messaging?.openwa || config?.messaging?.openwa || {};
  return {
    gatewayUrl: openwa.gatewayUrl || 'http://127.0.0.1:2785',
    apiKey: openwa.apiKey || 'dev-admin-key',
    sessionName: openwa.sessionName || 'main'
  };
}

// Discover the first ready session ID from the gateway.
// The gateway uses UUIDs, not session names, in the URL path.
async function discoverSessionId() {
  if (_cachedSessionId) return _cachedSessionId;
  const { gatewayUrl, apiKey } = getOpenWAConfig();
  try {
    const res = await axios.get(`${gatewayUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey },
      timeout: 5000
    });
    const sessions = Array.isArray(res.data) ? res.data : [];
    const ready = sessions.find(s => s.status === 'ready') || sessions[0];
    if (ready) {
      _cachedSessionId = ready.id;
      console.log(`[OpenWA] Using session: ${ready.name} (${ready.id}), phone: ${ready.phone}`);
      return ready.id;
    }
  } catch (err) {
    console.error('[OpenWA] Failed to discover session ID:', err.message);
  }
  return null;
}

async function sendMessage(phone, text) {
  const { gatewayUrl, apiKey } = getOpenWAConfig();
  const sessionId = await discoverSessionId();
  if (!sessionId) {
    console.error('[OpenWA] No active session found. Cannot send message.');
    return false;
  }
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 7 || digits.length > 15) {
    console.error(`[OpenWA] Invalid phone number: "${phone}" (digits: "${digits}")`);
    return false;
  }
  const chatId = `${digits}@c.us`;
  const url = `${gatewayUrl}/api/sessions/${sessionId}/messages/send-text`;
  try {
    await axios.post(url, { chatId, text }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      timeout: 10000
    });
    logMessage({ platform: 'whatsapp', chatId: digits, direction: 'outbound', message: text.slice(0, 2000), msgType: 'text' }).catch(() => {});
    return true;
  } catch (err) {
    const gatewayMsg = err.response?.data?.message || err.message;
    console.error(`[OpenWA] sendMessage to ${digits} failed: ${gatewayMsg}`);
    return false;
  }
}

async function getOpenWAStatus() {
  const { gatewayUrl } = getOpenWAConfig();
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';
  let reachable = false;
  let sessionInfo = null;
  try {
    const { apiKey } = getOpenWAConfig();
    const res = await axios.get(`${gatewayUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey },
      timeout: 3000
    });
    const sessions = Array.isArray(res.data) ? res.data : [];
    const ready = sessions.find(s => s.status === 'ready') || sessions[0];
    if (ready) {
      reachable = true;
      sessionInfo = { id: ready.id, name: ready.name, phone: ready.phone, status: ready.status };
      _cachedSessionId = ready.id;
    }
  } catch (_) {
    reachable = false;
  }
  return { enabled: channel === 'whatsapp', gatewayUrl, reachable, session: sessionInfo };
}

async function getSmartAnswer(question) {
  const q = question.toLowerCase().trim();
  const config = loadConfig();
  const r = config?.restaurant || config || {};
  const coachService = require('./coachService');

  if (q.match(/hour|open|close|when|time/i)) {
    if (!r.openingHours || Object.keys(r.openingHours).length === 0) return 'Hours not configured yet.';
    let hours = 'Opening Hours:\n\n';
    Object.entries(r.openingHours).forEach(([day, h]) => { hours += `${day}: ${h.open} - ${h.close}\n`; });
    return hours;
  }
  if (q.match(/service|offer|menu|what.*do|package|program/i)) {
    if (!r.menu || r.menu.length === 0) return 'Services not configured yet.';
    let services = 'Our Services:\n\n';
    r.menu.forEach(item => { services += `• ${item.name} (${item.category}): $${item.price}\n`; });
    return services;
  }
  if (q.match(/price|cost|how much|fee|charge/i)) {
    if (!r.menu || r.menu.length === 0) return 'Pricing not configured yet.';
    let pricing = 'Pricing:\n\n';
    r.menu.forEach(item => { pricing += `• ${item.name}: $${item.price}\n`; });
    return pricing;
  }
  if (q.match(/coach|trainer|instructor|staff/i)) {
    let coaches = [];
    try { coaches = (await coachService.listPublicCoaches()).filter(c => c.status !== 'unavailable'); } catch (_) {}
    if (!coaches.length) return 'We have professional coaches available. Please contact us.';
    let reply = 'Our Coaches:\n\n';
    coaches.forEach(c => {
      reply += `• ${c.name}`;
      if (c.specialties && c.specialties.length) reply += ` — ${c.specialties.join(', ')}`;
      reply += '\n';
    });
    return reply.trim();
  }
  return null;
}

function findBestQAMatch(userQuestion, qaDatabase) {
  if (!qaDatabase || qaDatabase.length === 0) return null;
  const userWords = userQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  let bestMatch = null, maxMatches = 0;
  for (const qa of qaDatabase) {
    const qaWords = (qa.question + ' ' + qa.answer).toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matchCount = userWords.filter(w => qaWords.includes(w)).length;
    if (matchCount > maxMatches) { maxMatches = matchCount; bestMatch = qa.answer; }
  }
  return maxMatches > 0 ? bestMatch : null;
}

function mainMenuText() {
  return (
    'Welcome! Please choose an option:\n\n' +
    '1. Book a Session\n' +
    '2. Cancel a Booking\n' +
    '3. My Bookings\n' +
    '4. View Services\n' +
    '5. Ask a Question\n' +
    '6. Contact Info\n\n' +
    'Reply with a number (1-6).'
  );
}

function availableDatesText() {
  const config = loadConfig();
  const tz = config?.restaurant?.timezone || 'UTC';
  const openingHours = config?.restaurant?.openingHours || {};
  const today = moment.tz(tz);
  const lines = ['Select a date (reply with number):\n'];
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = today.clone().add(i, 'days');
    const dayName = d.format('dddd');
    if (openingHours[dayName]) {
      dates.push(d.format('YYYY-MM-DD'));
      lines.push(`${dates.length}. ${d.format('ddd, MMM D')} (${dayName})`);
      if (dates.length >= 7) break;
    }
  }
  return { text: lines.join('\n'), dates };
}

function timeSlotsText(dateStr) {
  const config = loadConfig();
  const tz = config?.restaurant?.timezone || 'UTC';
  const restaurant = config?.restaurant || {};
  const dayName = moment.tz(dateStr, 'YYYY-MM-DD', tz).format('dddd');
  const dayHours = restaurant.openingHours?.[dayName];
  if (!dayHours) return { text: `Closed on ${dayName}.`, slots: [] };

  const open = dayHours.open.split(':').map(Number);
  const close = dayHours.close.split(':').map(Number);
  const startMin = open[0] * 60 + open[1];
  const endMin = close[0] * 60 + close[1];
  const slotDuration = restaurant.slotDuration || 30;
  const now = moment.tz(tz);
  const isToday = moment.tz(dateStr, 'YYYY-MM-DD', tz).isSame(now, 'day');
  const currentMin = isToday ? now.hours() * 60 + now.minutes() : -1;

  const slots = [];
  for (let min = startMin; min < endMin; min += slotDuration) {
    if (isToday && min < currentMin + 60) continue;
    const hh = Math.floor(min / 60).toString().padStart(2, '0');
    const mm = (min % 60).toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }

  if (slots.length === 0) return { text: 'No slots available for this date.', slots: [] };
  const lines = [`Time slots for ${moment(dateStr, 'YYYY-MM-DD').format('ddd, MMM D')}:\n`];
  slots.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push('\nReply with a number.');
  return { text: lines.join('\n'), slots };
}

async function handleWhatsAppMessage(phone, text) {
  const config = loadConfig();
  const restaurant = config?.restaurant || {};
  const session = userSessions[phone] || {};
  const input = text.trim();
  const lc = input.toLowerCase();

  if (['menu', 'hi', 'hello', 'start', '/start', '/menu'].includes(lc)) {
    delete userSessions[phone];
    await sendMessage(phone, mainMenuText());
    return;
  }

  if (!session.step) {
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > 6) {
      const smartAnswer = await getSmartAnswer(input);
      if (smartAnswer) { await sendMessage(phone, smartAnswer); return; }

      if (restaurant.aiEnabled && process.env.GOOGLE_GEMINI_API_KEY) {
        try {
          let coaches = [];
          try { coaches = await require('./coachService').listPublicCoaches(); } catch (_) {}
          const systemPrompt = GeminiChatbot.generateSystemPrompt({ ...restaurant, coaches });
          const geminiBot = new GeminiChatbot(process.env.GOOGLE_GEMINI_API_KEY, restaurant.aiModel || 'gemini-2.5-flash');
          const aiResponse = await geminiBot.chatWithTools(input, systemPrompt, toolDeclarations, executeTool);
          if (aiResponse) { await sendMessage(phone, aiResponse); return; }
        } catch (err) { console.error('[OpenWA] Gemini error:', err.message); }
      }

      if (!restaurant.aiEnabled && restaurant.qaDatabase?.length) {
        const qaAnswer = findBestQAMatch(input, restaurant.qaDatabase);
        if (qaAnswer) { await sendMessage(phone, qaAnswer); return; }
      }

      await sendMessage(phone, mainMenuText());
      return;
    }

    if (choice === 1) {
      const { text: datesText, dates } = availableDatesText();
      userSessions[phone] = { step: 'booking_date', dates };
      await sendMessage(phone, datesText);
      return;
    }
    if (choice === 2) {
      const allBookings = await getAllBookings();
      const mine = allBookings.filter(b => b.status === 'confirmed' && String(b.phone) === String(phone));
      if (mine.length === 0) {
        await sendMessage(phone, 'You have no active bookings to cancel.');
        return;
      }
      const lines = ['Your active bookings:\n'];
      mine.forEach((b, i) => { lines.push(`${i + 1}. ID ${b.id} — ${b.date} at ${b.time} (${b.partySize} people)`); });
      lines.push('\nReply with the number to cancel, or "menu" to go back.');
      userSessions[phone] = { step: 'cancel_pick', bookings: mine };
      await sendMessage(phone, lines.join('\n'));
      return;
    }
    if (choice === 3) {
      const allBookings = await getAllBookings();
      const mine = allBookings.filter(b => b.status === 'confirmed' && String(b.phone) === String(phone));
      if (mine.length === 0) {
        await sendMessage(phone, 'You have no active bookings.');
        return;
      }
      const lines = ['Your active bookings:\n'];
      mine.forEach(b => { lines.push(`• ID ${b.id}: ${b.date} at ${b.time}, ${b.partySize} people, Coach: ${b.coach_name || 'TBD'}`); });
      await sendMessage(phone, lines.join('\n'));
      return;
    }
    if (choice === 4) {
      await sendMessage(phone, getMenuText());
      return;
    }
    if (choice === 5) {
      userSessions[phone] = { step: 'ask_question' };
      await sendMessage(phone, 'Please type your question:');
      return;
    }
    if (choice === 6) {
      let contactMsg = 'Contact Us:\n\n';
      if (restaurant.name)    contactMsg += `${restaurant.name}\n`;
      if (restaurant.phone)   contactMsg += `Phone: ${restaurant.phone}\n`;
      if (restaurant.email)   contactMsg += `Email: ${restaurant.email}\n`;
      if (restaurant.address) contactMsg += `Address: ${restaurant.address}\n`;
      if (restaurant.website) contactMsg += `Website: ${restaurant.website}\n`;
      if (!restaurant.phone && !restaurant.email) contactMsg += 'No contact details configured yet.';
      await sendMessage(phone, contactMsg);
      return;
    }
  }

  if (session.step === 'ask_question') {
    delete userSessions[phone];
    const smartAnswer = await getSmartAnswer(input);
    if (smartAnswer) { await sendMessage(phone, smartAnswer); return; }
    if (restaurant.aiEnabled && process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        let coaches = [];
        try { coaches = await require('./coachService').listPublicCoaches(); } catch (_) {}
        const systemPrompt = GeminiChatbot.generateSystemPrompt({ ...restaurant, coaches });
        const geminiBot = new GeminiChatbot(process.env.GOOGLE_GEMINI_API_KEY, restaurant.aiModel || 'gemini-2.5-flash');
        const aiResponse = await geminiBot.chatWithTools(input, systemPrompt, toolDeclarations, executeTool);
        if (aiResponse) { await sendMessage(phone, aiResponse); return; }
      } catch (err) { console.error('[OpenWA] Gemini error:', err.message); }
    }
    if (!restaurant.aiEnabled && restaurant.qaDatabase?.length) {
      const qaAnswer = findBestQAMatch(input, restaurant.qaDatabase);
      if (qaAnswer) { await sendMessage(phone, qaAnswer); return; }
    }
    const contactLine = restaurant.phone ? `\n\nFor help, call us at ${restaurant.phone}.` : '';
    await sendMessage(phone, `Thank you for your question! Our team will get back to you soon.${contactLine}`);
    return;
  }

  if (session.step === 'booking_date') {
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > session.dates.length) {
      await sendMessage(phone, `Please reply with a number between 1 and ${session.dates.length}.`);
      return;
    }
    const dateStr = session.dates[choice - 1];
    const { text: slotsText, slots } = timeSlotsText(dateStr);
    if (slots.length === 0) {
      await sendMessage(phone, slotsText + '\n\nReply "menu" to start over.');
      delete userSessions[phone];
      return;
    }
    userSessions[phone] = { ...session, step: 'booking_time', date: dateStr, slots };
    await sendMessage(phone, slotsText);
    return;
  }

  if (session.step === 'booking_time') {
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > session.slots.length) {
      await sendMessage(phone, `Please reply with a number between 1 and ${session.slots.length}.`);
      return;
    }
    const timeStr = session.slots[choice - 1];
    const maxParty = restaurant.maxPartySize || 5;
    const partyOptions = Array.from({ length: Math.min(maxParty, 6) }, (_, i) => `${i + 1}. ${i + 1} ${i === 0 ? 'person' : 'people'}`);
    userSessions[phone] = { ...session, step: 'booking_party', time: timeStr };
    await sendMessage(phone, `Time: ${timeStr}\n\nHow many people?\n\n${partyOptions.join('\n')}\n\nReply with a number.`);
    return;
  }

  if (session.step === 'booking_party') {
    const maxParty = restaurant.maxPartySize || 5;
    const partySize = parseInt(input, 10);
    if (!partySize || partySize < 1 || partySize > maxParty) {
      await sendMessage(phone, `Please reply with a number between 1 and ${maxParty}.`);
      return;
    }
    const coachService = require('./coachService');
    let coaches = [];
    try { coaches = await coachService.listPublicCoaches(); } catch (_) {}

    if (coaches.length === 0) {
      userSessions[phone] = { ...session, step: 'booking_confirm', partySize, coachId: null, coachName: null };
      const displayDate = moment(session.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
      await sendMessage(phone, `Booking Summary:\n\nDate: ${displayDate}\nTime: ${session.time}\nPeople: ${partySize}\n\nReply "yes" to confirm or "no" to cancel.`);
      return;
    }

    const lines = ['Select a coach:\n'];
    coaches.forEach((c, i) => { lines.push(`${i + 1}. ${c.name}`); });
    lines.push(`${coaches.length + 1}. Any available coach`);
    lines.push('\nReply with a number.');
    userSessions[phone] = { ...session, step: 'booking_coach', partySize, coaches };
    await sendMessage(phone, lines.join('\n'));
    return;
  }

  if (session.step === 'booking_coach') {
    const coaches = session.coaches || [];
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > coaches.length + 1) {
      await sendMessage(phone, `Please reply with a number between 1 and ${coaches.length + 1}.`);
      return;
    }
    let coachId = null, coachName = null;
    if (choice <= coaches.length) {
      coachId = coaches[choice - 1].id;
      coachName = coaches[choice - 1].name;
    } else {
      const available = coaches.filter(c => c.status === 'available');
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        coachId = pick.id;
        coachName = pick.name;
      } else {
        coachName = 'Any available';
      }
    }
    const displayDate = moment(session.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
    userSessions[phone] = { ...session, step: 'booking_confirm', coachId, coachName };
    await sendMessage(phone,
      `Booking Summary:\n\nDate: ${displayDate}\nTime: ${session.time}\nPeople: ${session.partySize}\nCoach: ${coachName}\n\nReply "yes" to confirm or "no" to cancel.`
    );
    return;
  }

  if (session.step === 'booking_confirm') {
    if (lc === 'yes' || lc === 'y') {
      try {
        const result = await createBooking(
          phone, session.partySize, session.date, session.time,
          phone, session.coachId || null, session.coachName || null, null
        );
        delete userSessions[phone];
        if (result.success) {
          const displayDate = moment(session.date, 'YYYY-MM-DD').format('ddd MMM D, YYYY');
          await sendMessage(phone,
            `✅ Booking Confirmed!\n\nDate: ${displayDate}\nTime: ${session.time}\nPeople: ${session.partySize}\nCoach: ${session.coachName || 'Any available'}\nReservation ID: ${result.id}\n\nSee you soon!`
          );
        } else {
          await sendMessage(phone, `Booking failed: ${result.message}`);
        }
      } catch (err) {
        console.error('[OpenWA] Booking error:', err);
        await sendMessage(phone, 'An error occurred. Please try again.');
      }
      await sendMessage(phone, mainMenuText());
      return;
    }
    if (lc === 'no' || lc === 'n') {
      delete userSessions[phone];
      await sendMessage(phone, 'Booking cancelled.\n\n' + mainMenuText());
      return;
    }
    await sendMessage(phone, 'Please reply "yes" to confirm or "no" to cancel.');
    return;
  }

  if (session.step === 'cancel_pick') {
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > session.bookings.length) {
      await sendMessage(phone, `Please reply with a number between 1 and ${session.bookings.length}, or "menu" to go back.`);
      return;
    }
    const booking = session.bookings[choice - 1];
    userSessions[phone] = { ...session, step: 'cancel_confirm', cancelBooking: booking };
    await sendMessage(phone,
      `Cancel booking ID ${booking.id}?\n${booking.date} at ${booking.time}, ${booking.partySize} people\n\nReply "yes" to confirm or "no" to go back.`
    );
    return;
  }

  if (session.step === 'cancel_confirm') {
    if (lc === 'yes' || lc === 'y') {
      const booking = session.cancelBooking;
      try {
        const result = await cancelBooking(String(booking.phone), booking.id);
        delete userSessions[phone];
        if (result.success) {
          await sendMessage(phone, `✅ Booking ID ${booking.id} cancelled successfully.`);
        } else {
          await sendMessage(phone, `Could not cancel: ${result.message}`);
        }
      } catch (err) {
        console.error('[OpenWA] Cancel error:', err);
        await sendMessage(phone, 'An error occurred. Please try again.');
      }
      await sendMessage(phone, mainMenuText());
      return;
    }
    if (lc === 'no' || lc === 'n') {
      delete userSessions[phone];
      await sendMessage(phone, 'Cancellation aborted.\n\n' + mainMenuText());
      return;
    }
    await sendMessage(phone, 'Please reply "yes" to confirm cancellation or "no" to go back.');
    return;
  }

  delete userSessions[phone];
  await sendMessage(phone, mainMenuText());
}

// Register our webhook URL with the OpenWA gateway automatically
async function registerWebhookWithGateway(webhookUrl) {
  const { gatewayUrl, apiKey } = getOpenWAConfig();
  const sessionId = await discoverSessionId();
  if (!sessionId) return;

  try {
    // Check existing webhooks to avoid duplicates
    const existing = await axios.get(`${gatewayUrl}/api/sessions/${sessionId}/webhooks`, {
      headers: { 'X-API-Key': apiKey },
      timeout: 5000
    });
    const webhooks = Array.isArray(existing.data) ? existing.data : [];
    const alreadyRegistered = webhooks.some(w => w.url === webhookUrl && w.active);
    if (alreadyRegistered) {
      console.log(`[OpenWA] Webhook already registered: ${webhookUrl}`);
      return;
    }

    // Register new webhook for message.received events
    await axios.post(`${gatewayUrl}/api/sessions/${sessionId}/webhooks`, {
      url: webhookUrl,
      events: ['message.received'],
      retryCount: 3
    }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      timeout: 5000
    });
    console.log(`[OpenWA] Webhook registered with gateway: ${webhookUrl}`);
  } catch (err) {
    console.error('[OpenWA] Could not auto-register webhook:', err.response?.data?.message || err.message);
  }
}

function initOpenWA(app) {
  console.log('[OpenWA] Registering webhook at POST /api/openwa/webhook');

  app.post('/api/openwa/webhook', async (req, res) => {
    res.sendStatus(200); // Always ack immediately
    try {
      const payload = req.body;

      // Guide payload format: { event, sessionId, data: { from, body, isGroup, ... } }
      // Also handle flat payloads for compatibility
      if (payload?.event && payload.event !== 'message.received') return;

      const data = payload?.data || payload;

      // Use isGroup from guide (not isGroupMsg)
      const isGroup = data?.isGroup || data?.isGroupMsg || String(data?.from || '').includes('@g.us') || false;
      if (isGroup) return;

      // fromMe messages (bot's own sends) — ignore
      if (data?.fromMe === true) return;

      const from = data?.from || data?.chatId || data?.senderPhone || '';
      const body = data?.body || data?.text || '';
      if (!from || !body) return;

      // Extract digits only — handles "6588123456@c.us" or plain number
      const phone = String(from).replace(/@c\.us$/i, '').replace(/\D/g, '');
      if (!phone) return;

      logMessage({ platform: 'whatsapp', chatId: phone, direction: 'inbound', message: body.slice(0, 2000), msgType: 'text' }).catch(() => {});
      console.log(`[OpenWA] Inbound from ${phone}: "${body}"`);

      await handleWhatsAppMessage(phone, body);
    } catch (err) {
      console.error('[OpenWA] Webhook handler error:', err.message);
    }
  });

  console.log('[OpenWA] Webhook registered. Ready for inbound messages.');

  // Auto-register our webhook URL with the gateway (non-blocking)
  const port = process.env.PORT || 3000;
  const webhookUrl = `http://127.0.0.1:${port}/api/openwa/webhook`;
  registerWebhookWithGateway(webhookUrl).catch(() => {});
}

module.exports = { sendMessage, getOpenWAStatus, initOpenWA, handleWhatsAppMessage, userSessions };
