# WhatsApp OpenWA Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the non-functional `whatsapp-web.js` customer bot and per-coach Telegram notifications with the OpenWA HTTP gateway, adding a Telegram/WhatsApp toggle in the admin settings page.

**Architecture:** A new `src/openwa.js` module handles all OpenWA communication — outbound `sendMessage()` and an inbound webhook handler that runs the full customer booking flow via text prompts. `src/coachBots.js` dispatches coach notifications to WhatsApp (via `openwa.sendMessage`) or Telegram based on `config.messaging.channel`. `src/index.js` reads the channel at startup and initialises only the active stack.

**Tech Stack:** Node.js, Express, axios (already installed), Mocha + Chai (tests), OpenWA HTTP REST API at `http://127.0.0.1:2785`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/openwa.js` | Create | OpenWA HTTP client, inbound webhook handler, booking flow |
| `src/coachBots.js` | Modify | Add WhatsApp dispatch path in `notifyCoach()` |
| `src/index.js` | Modify | Channel-aware startup, new `/api/openwa/*` routes |
| `config/config.json` | Modify | Add `messaging` block |
| `public/config.html` | Modify | New Messaging tab UI |
| `test/unit/openwa.test.js` | Create | Unit tests for openwa.js |
| `test/helpers.js` | Modify | Add `messaging` block to test config |
| `.env.example` | Modify | Document OpenWA vars |

---

## Task 1: Add `messaging` config block and update test helpers

**Files:**
- Modify: `config/config.json`
- Modify: `test/helpers.js`

- [ ] **Step 1: Add the messaging block to config/config.json**

Open `config/config.json`. Inside the `"restaurant"` object, add after the last existing field (e.g. after `"menu": [...]`):

```json
"messaging": {
  "channel": "telegram",
  "openwa": {
    "gatewayUrl": "http://127.0.0.1:2785",
    "apiKey": "dev-admin-key",
    "sessionName": "main"
  }
}
```

`channel` defaults to `"telegram"` so existing Telegram behaviour is unchanged.

- [ ] **Step 2: Add messaging to test helpers**

In `test/helpers.js`, update `testConfig` to include a `messaging` block so tests that call `setupTestConfig()` get a predictable config:

```js
const testConfig = {
  name: "Test Restaurant",
  phone: "+1234567890",
  timezone: "America/New_York",
  openingHours: {
    Monday: { open: "09:00", close: "22:00" },
    Tuesday: { open: "09:00", close: "22:00" },
    Wednesday: { open: "09:00", close: "22:00" },
    Thursday: { open: "09:00", close: "22:00" },
    Friday: { open: "09:00", close: "23:00" },
    Saturday: { open: "10:00", close: "23:00" },
    Sunday: { open: "10:00", close: "21:00" }
  },
  slotDuration: 30,
  maxPartySize: 8,
  menu: [
    { id: "1", category: "Starters", name: "Garlic Bread", price: 5.99 },
    { id: "2", category: "Mains", name: "Pizza", price: 12.99 }
  ],
  messaging: {
    channel: "telegram",
    openwa: {
      gatewayUrl: "http://127.0.0.1:2785",
      apiKey: "dev-admin-key",
      sessionName: "main"
    }
  }
};
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass (or same pass/fail count as before this change).

- [ ] **Step 4: Commit**

```bash
git add config/config.json test/helpers.js
git commit -m "feat: add messaging channel config block"
```

---

## Task 2: Create `src/openwa.js` — outbound sender and status check

**Files:**
- Create: `src/openwa.js`
- Create: `test/unit/openwa.test.js`

- [ ] **Step 1: Write the failing tests first**

Create `test/unit/openwa.test.js`:

```js
const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');

require('../setup');
require('../helpers').setupTestConfig();

describe('OpenWA Module', () => {
  let axiosPostStub;

  beforeEach(() => {
    axiosPostStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    sinon.restore();
    // Clear module cache so config changes are picked up
    delete require.cache[require.resolve('../../src/openwa')];
  });

  describe('sendMessage()', () => {
    it('should POST to the OpenWA gateway with correct chatId format', async () => {
      axiosPostStub.resolves({ status: 201, data: {} });
      const { sendMessage } = require('../../src/openwa');

      const result = await sendMessage('6588775526', 'Hello coach');

      expect(axiosPostStub.calledOnce).to.be.true;
      const [url, body, opts] = axiosPostStub.firstCall.args;
      expect(url).to.include('/api/sessions/');
      expect(url).to.include('/messages/send-text');
      expect(body.chatId).to.equal('6588775526@c.us');
      expect(body.text).to.equal('Hello coach');
      expect(opts.headers['X-API-Key']).to.equal('dev-admin-key');
      expect(result).to.be.true;
    });

    it('should strip non-digit characters from phone number', async () => {
      axiosPostStub.resolves({ status: 200, data: {} });
      const { sendMessage } = require('../../src/openwa');

      await sendMessage('+65 8877 5526', 'Test');

      const [, body] = axiosPostStub.firstCall.args;
      expect(body.chatId).to.equal('6588775526@c.us');
    });

    it('should return false and not throw when gateway returns an error', async () => {
      axiosPostStub.rejects(new Error('ECONNREFUSED'));
      const { sendMessage } = require('../../src/openwa');

      const result = await sendMessage('6588775526', 'Test');
      expect(result).to.be.false;
    });
  });

  describe('getOpenWAStatus()', () => {
    it('should return enabled true and reachable true when gateway responds', async () => {
      axiosPostStub.resolves({ status: 200, data: {} });
      // Status check uses axios.get — stub that too
      const axiosGetStub = sinon.stub(axios, 'get').resolves({ status: 200 });
      const { getOpenWAStatus } = require('../../src/openwa');

      const status = await getOpenWAStatus();

      expect(status.enabled).to.be.true;
      expect(status.reachable).to.be.true;
      expect(status.gatewayUrl).to.equal('http://127.0.0.1:2785');
      expect(status.sessionName).to.equal('main');
      axiosGetStub.restore();
    });

    it('should return reachable false when gateway is down', async () => {
      const axiosGetStub = sinon.stub(axios, 'get').rejects(new Error('ECONNREFUSED'));
      const { getOpenWAStatus } = require('../../src/openwa');

      const status = await getOpenWAStatus();

      expect(status.reachable).to.be.false;
      axiosGetStub.restore();
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --grep "OpenWA Module"
```

Expected: FAIL with `Cannot find module '../../src/openwa'`

- [ ] **Step 3: Create `src/openwa.js` with outbound functions**

```js
const axios = require('axios');
const { loadConfig } = require('./config');

const userSessions = {};

function getOpenWAConfig() {
  const config = loadConfig();
  const openwa = config?.restaurant?.messaging?.openwa || config?.messaging?.openwa || {};
  return {
    gatewayUrl: openwa.gatewayUrl || 'http://127.0.0.1:2785',
    apiKey: openwa.apiKey || 'dev-admin-key',
    sessionName: openwa.sessionName || 'main'
  };
}

async function sendMessage(phone, text) {
  const { gatewayUrl, apiKey, sessionName } = getOpenWAConfig();
  const digits = String(phone).replace(/\D/g, '');
  const chatId = `${digits}@c.us`;
  const url = `${gatewayUrl}/api/sessions/${sessionName}/messages/send-text`;
  try {
    await axios.post(url, { chatId, text }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      timeout: 10000
    });
    return true;
  } catch (err) {
    console.error('[OpenWA] sendMessage failed:', err.message);
    return false;
  }
}

async function getOpenWAStatus() {
  const { gatewayUrl, sessionName } = getOpenWAConfig();
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';
  let reachable = false;
  try {
    await axios.get(`${gatewayUrl}/api/health`, { timeout: 3000 });
    reachable = true;
  } catch (_) {
    reachable = false;
  }
  return { enabled: channel === 'whatsapp', gatewayUrl, sessionName, reachable };
}

module.exports = { sendMessage, getOpenWAStatus, userSessions };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --grep "OpenWA Module"
```

Expected: all OpenWA tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/openwa.js test/unit/openwa.test.js
git commit -m "feat: add OpenWA outbound sendMessage and status check"
```

---

## Task 3: Add inbound webhook handler and full customer booking flow to `src/openwa.js`

**Files:**
- Modify: `src/openwa.js`

This task adds `initOpenWA(app)` which registers the Express webhook route and the `handleWhatsAppMessage()` booking flow. The flow is text-prompt guided (numbered menus) since WhatsApp via OpenWA has no inline keyboards.

- [ ] **Step 1: Add imports and booking flow to `src/openwa.js`**

Replace the full contents of `src/openwa.js` with:

```js
const axios = require('axios');
const moment = require('moment-timezone');
const { loadConfig } = require('./config');
const { getMenuText } = require('./menu');
const { createBooking, cancelBooking, getAllBookings } = require('./booking');
const { logMessage } = require('./chatlog');
const GeminiChatbot = require('./gemini-chatbot');
const { toolDeclarations, executeTool } = require('./bot-skills');

const userSessions = {};

function getOpenWAConfig() {
  const config = loadConfig();
  const openwa = config?.restaurant?.messaging?.openwa || config?.messaging?.openwa || {};
  return {
    gatewayUrl: openwa.gatewayUrl || 'http://127.0.0.1:2785',
    apiKey: openwa.apiKey || 'dev-admin-key',
    sessionName: openwa.sessionName || 'main'
  };
}

async function sendMessage(phone, text) {
  const { gatewayUrl, apiKey, sessionName } = getOpenWAConfig();
  const digits = String(phone).replace(/\D/g, '');
  const chatId = `${digits}@c.us`;
  const url = `${gatewayUrl}/api/sessions/${sessionName}/messages/send-text`;
  try {
    await axios.post(url, { chatId, text }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      timeout: 10000
    });
    logMessage({ platform: 'whatsapp', chatId: digits, direction: 'outbound', message: text.slice(0, 2000), msgType: 'text' }).catch(() => {});
    return true;
  } catch (err) {
    console.error('[OpenWA] sendMessage failed:', err.message);
    return false;
  }
}

async function getOpenWAStatus() {
  const { gatewayUrl, sessionName } = getOpenWAConfig();
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';
  let reachable = false;
  try {
    await axios.get(`${gatewayUrl}/api/health`, { timeout: 3000 });
    reachable = true;
  } catch (_) {
    reachable = false;
  }
  return { enabled: channel === 'whatsapp', gatewayUrl, sessionName, reachable };
}

// ── Smart Q&A matching (mirrors telegram.js logic) ──────────────────────────
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

// ── Main menu text ──────────────────────────────────────────────────────────
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

// ── Booking flow helpers ────────────────────────────────────────────────────
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

// ── Inbound message handler ─────────────────────────────────────────────────
async function handleWhatsAppMessage(phone, text) {
  const config = loadConfig();
  const restaurant = config?.restaurant || {};
  const session = userSessions[phone] || {};
  const input = text.trim();
  const lc = input.toLowerCase();

  // Always allow "menu" or "hi/hello" to reset
  if (['menu', 'hi', 'hello', 'start', '/start', '/menu'].includes(lc)) {
    delete userSessions[phone];
    await sendMessage(phone, mainMenuText());
    return;
  }

  // ── No active session: show main menu or handle top-level choice ──────────
  if (!session.step) {
    const choice = parseInt(input, 10);
    if (!choice || choice < 1 || choice > 6) {
      // Try Q&A / AI before showing menu
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
      // Book
      const { text: datesText, dates } = availableDatesText();
      userSessions[phone] = { step: 'booking_date', dates };
      await sendMessage(phone, datesText);
      return;
    }
    if (choice === 2) {
      // Cancel
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
      // My Bookings
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

  // ── Active session steps ──────────────────────────────────────────────────

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

  // Fallback
  delete userSessions[phone];
  await sendMessage(phone, mainMenuText());
}

// ── Webhook registration ────────────────────────────────────────────────────
function initOpenWA(app) {
  console.log('[OpenWA] Registering webhook at POST /api/openwa/webhook');

  app.post('/api/openwa/webhook', async (req, res) => {
    res.sendStatus(200); // Always ack immediately
    try {
      const payload = req.body;
      // Support both OpenWA payload shapes
      const data = payload?.data || payload;
      const isGroup = data?.isGroupMsg || data?.id?.remote?.includes('@g.us') || false;
      if (isGroup) return;

      const from = data?.from || data?.chatId || '';
      const body = data?.body || data?.text || '';
      if (!from || !body) return;

      const phone = String(from).replace('@c.us', '').replace(/\D/g, '');
      if (!phone) return;

      logMessage({ platform: 'whatsapp', chatId: phone, direction: 'inbound', message: body.slice(0, 2000), msgType: 'text' }).catch(() => {});
      console.log(`[OpenWA] Inbound from ${phone}: "${body}"`);

      await handleWhatsAppMessage(phone, body);
    } catch (err) {
      console.error('[OpenWA] Webhook handler error:', err.message);
    }
  });

  console.log('[OpenWA] Webhook registered. Ready for inbound messages.');
}

module.exports = { sendMessage, getOpenWAStatus, initOpenWA, userSessions };
```

- [ ] **Step 2: Run existing tests to make sure nothing broke**

```bash
npm test
```

Expected: same pass/fail as before.

- [ ] **Step 3: Commit**

```bash
git add src/openwa.js
git commit -m "feat: add OpenWA inbound webhook handler and full booking flow"
```

---

## Task 4: Update `src/coachBots.js` — WhatsApp dispatch path

**Files:**
- Modify: `src/coachBots.js`

- [ ] **Step 1: Add WhatsApp dispatch to `notifyCoach()`**

In `src/coachBots.js`, at the top after the existing requires, add:

```js
const { loadConfig } = require('./config');
const openwa = require('./openwa');
```

Then replace the `notifyCoach` function body (currently around lines 178–200) with:

```js
async function notifyCoach(coachId, message) {
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';

  if (channel === 'whatsapp') {
    const coach = coachData.get(coachId);
    if (!coach) {
      console.warn(`[CoachBots] No coach data for "${coachId}". Cannot send WhatsApp notification.`);
      return false;
    }
    const phone = (coach.phone || '').trim();
    if (!phone) {
      console.warn(`[CoachBots] Coach "${coachId}" has no phone number configured for WhatsApp.`);
      return false;
    }
    return openwa.sendMessage(phone, message);
  }

  // Telegram path (original)
  const bot = coachBots.get(coachId);
  const coach = coachData.get(coachId);

  if (!bot) {
    console.warn(`[CoachBots] No Telegram bot found for coach "${coachId}".`);
    return false;
  }
  if (!coach || !coach.telegram_chat_id) {
    console.warn(`[CoachBots] Coach "${coachId}" has no Telegram chat ID. Coach must send /start first.`);
    return false;
  }
  try {
    await bot.sendMessage(coach.telegram_chat_id, message, { parse_mode: 'Markdown' });
    console.log(`[CoachBots] Telegram notification sent to coach "${coachId}" (${coach.name})`);
    return true;
  } catch (err) {
    console.error(`[CoachBots] Failed to send Telegram notification to coach "${coachId}":`, err.message);
    return false;
  }
}
```

- [ ] **Step 2: Skip Telegram bot polling when channel is whatsapp**

At the top of `initCoachBots()`, after loading coaches, add a channel check:

```js
async function initCoachBots() {
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';

  let coaches;
  try {
    coaches = await coachService.getAllCoaches();
  } catch (err) {
    console.error('[CoachBots] Failed to load coaches from DB:', err.message);
    return;
  }

  if (channel === 'whatsapp') {
    // Populate coachData for notification lookups; skip Telegram polling
    for (const coach of coaches) {
      coachData.set(coach.id, coach);
    }
    console.log(`[CoachBots] WhatsApp channel active — loaded ${coaches.length} coaches, Telegram polling skipped.`);
    return;
  }

  // Original Telegram init continues below...
  if (coaches.length === 0) {
    console.log('[CoachBots] No coaches in database. Skipping coach bot initialization.');
    return;
  }
  // ... (rest of the function unchanged)
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/coachBots.js
git commit -m "feat: add WhatsApp dispatch path to coachBots notifyCoach"
```

---

## Task 5: Update `src/index.js` — channel-aware startup and new API routes

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Add OpenWA import and channel-aware startup**

At the top of `src/index.js`, add the import after the existing requires:

```js
const { initOpenWA, sendMessage: openWASend, getOpenWAStatus } = require('./openwa');
```

Replace the startup block inside `app.listen(port, async () => { ... })`. Find this section:

```js
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
```

Replace with:

```js
// Initialize messaging platforms based on config channel
const msgConfig = loadConfig();
const msgChannel = msgConfig?.restaurant?.messaging?.channel || msgConfig?.messaging?.channel || 'telegram';
console.log(`[Messaging] Active channel: ${msgChannel}`);

if (msgChannel === 'whatsapp') {
  console.log('[Messaging] Initializing OpenWA gateway...');
  initOpenWA(app);
} else {
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  if (tgToken) {
    console.log('[Messaging] Initializing Telegram Bot...');
    initTelegram(tgToken);
  } else {
    console.log('[Messaging] Telegram disabled (set TELEGRAM_BOT_TOKEN to enable)');
  }
}
```

- [ ] **Step 2: Add OpenWA API routes**

Add these routes before `module.exports = { app };`:

```js
// ── OpenWA API routes ──────────────────────────────────────────────────────

app.get('/api/openwa/status', async (req, res) => {
  try {
    const status = await getOpenWAStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/openwa/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const text = message || '✅ Test message from your booking system!';
    const ok = await openWASend(phone, text);
    if (ok) {
      res.json({ success: true, message: `Test message sent to ${phone}` });
    } else {
      res.status(502).json({ error: 'Failed to send message. Check gateway connection.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Update emergency notify endpoints to be channel-aware**

Find the `POST /api/coach-emergency/notify` handler. Replace its inner send logic:

```js
// Before (Telegram only):
const { getBot } = require('./telegram');
const bot = getBot();
if (!bot) return res.status(503).json({ error: 'Telegram bot not initialized' });
// ...
await bot.sendMessage(customer.chatId, message, { parse_mode: 'Markdown' });
```

With channel-aware dispatch:

```js
const cfg = loadConfig();
const activeChannel = cfg?.restaurant?.messaging?.channel || cfg?.messaging?.channel || 'telegram';

for (const customer of affectedCustomers) {
  try {
    const message =
      `⚠️ Important Notice\n\n` +
      `Your coach ${coachName} is unavailable on ${date}.\n\n` +
      `Your booking at ${customer.bookingTime} on ${customer.bookingDate} is affected.\n\n` +
      `Options:\n` +
      `1. Reschedule to a different date/time\n` +
      `2. Switch to a different coach\n` +
      `3. Cancel this booking\n\n` +
      `Please reply with your preference or contact us for assistance.\n` +
      `Reservation ID: ${customer.bookingId}`;

    if (activeChannel === 'whatsapp' && customer.phone) {
      await openWASend(customer.phone, message);
      notificationsSent++;
    } else if (activeChannel === 'telegram' && customer.chatId) {
      const { getBot } = require('./telegram');
      const bot = getBot();
      if (!bot) throw new Error('Telegram bot not initialized');
      await bot.sendMessage(customer.chatId, message, { parse_mode: 'Markdown' });
      notificationsSent++;
    }
  } catch (err) {
    console.error(`Failed to notify customer:`, err);
    notificationsFailed++;
    failedList.push({ chatId: customer.chatId, error: err.message });
  }
}
```

Apply the same channel-aware pattern to `POST /api/coach-unavailability/notify`. Find the handler body and replace its send logic with:

```js
const cfg = loadConfig();
const activeChannel = cfg?.restaurant?.messaging?.channel || cfg?.messaging?.channel || 'telegram';

let sent = 0, failed = 0;
for (const b of affectedBookings) {
  try {
    const msg =
      `⚠️ Schedule Change Notice\n\n` +
      `Your coach ${coachName} is unavailable on ${b.date} at ${b.time}.\n\n` +
      `Reason: ${reason || 'Unavailable'}\n` +
      `Booking ID: ${b.id}\n\n` +
      `Please contact us to reschedule or choose another coach.`;

    if (activeChannel === 'whatsapp' && b.phone) {
      const ok = await openWASend(b.phone, msg);
      if (ok) { sent++; } else { failed++; }
    } else if (activeChannel === 'telegram' && b.chatId) {
      const { getBot } = require('./telegram');
      const bot = getBot();
      if (!bot) throw new Error('Telegram bot not initialized');
      await bot.sendMessage(b.chatId, `⚠️ *Schedule Change Notice*\n\n${msg}`, { parse_mode: 'Markdown' });
      sent++;
    }
  } catch (err) {
    console.error(`Failed to notify chatId ${b.chatId}:`, err.message);
    failed++;
  }
}
res.json({ success: true, sent, failed });
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.js
git commit -m "feat: channel-aware startup and OpenWA API routes in index.js"
```

---

## Task 6: Add Messaging tab to `public/config.html`

**Files:**
- Modify: `public/config.html`

- [ ] **Step 1: Add the Messaging tab button**

Find the tab bar section:

```html
<button class="tab-btn" onclick="showTab('services')">Services</button>
<button class="tab-btn" id="ai-tab-btn" onclick="showTab('ai')">⚡ AI Settings</button>
```

Insert after the Services tab button:

```html
<button class="tab-btn" onclick="showTab('messaging')">💬 Messaging</button>
```

- [ ] **Step 2: Add the Messaging tab content**

After the closing `</div>` of the Services tab content (`id="tab-services"`), insert:

```html
<!-- Messaging Tab -->
<div id="tab-messaging" class="tab-content">
  <div class="form-card">
    <h3 style="font-size:.95rem;font-weight:600;margin-bottom:16px;">Active Messaging Channel</h3>
    <div class="ai-toggle-group" style="margin-bottom:20px;">
      <span style="font-weight:600;color:var(--text-primary);">Telegram</span>
      <label class="toggle-switch">
        <input type="checkbox" id="cfg-msg-whatsapp" onchange="onMessagingChannelChange()">
        <span class="toggle-slider"></span>
      </label>
      <span style="font-weight:600;color:var(--text-primary);">WhatsApp (OpenWA)</span>
    </div>

    <!-- Telegram panel -->
    <div id="msg-telegram-panel">
      <div class="form-group">
        <label>Telegram Bot Token</label>
        <input type="text" id="cfg-tg-token-display" disabled placeholder="Set TELEGRAM_BOT_TOKEN in .env">
        <div class="form-group-hint">The Telegram bot token is read from the <code>.env</code> file on the server. Edit that file to change it.</div>
      </div>
    </div>

    <!-- WhatsApp / OpenWA panel -->
    <div id="msg-openwa-panel" style="display:none;">
      <div class="form-group">
        <label>Gateway URL</label>
        <input type="text" id="cfg-openwa-url" placeholder="http://127.0.0.1:2785">
      </div>
      <div class="form-group">
        <label>API Key</label>
        <input type="password" id="cfg-openwa-key" placeholder="dev-admin-key">
      </div>
      <div class="form-group">
        <label>Session Name</label>
        <input type="text" id="cfg-openwa-session" placeholder="main">
      </div>
      <div class="button-group" style="margin-bottom:16px;">
        <button class="btn-secondary" onclick="testOpenWAConnection()">🔌 Test Connection</button>
        <span id="openwa-status-badge" style="font-size:.8rem;padding:4px 8px;border-radius:4px;"></span>
      </div>
      <div class="form-group">
        <label>Send Test Message</label>
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;">
          <input type="text" id="cfg-openwa-test-phone" placeholder="Phone number e.g. 6588775526">
          <button class="btn-primary" onclick="sendOpenWATest()">Send</button>
        </div>
        <div class="form-group-hint">Sends a test WhatsApp message via the OpenWA gateway.</div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Load messaging config values in `loadConfig()`**

Inside the `loadConfig()` JS function in the `<script>` block, after the existing field population (e.g. after `populateQA(...)`), add:

```js
// Messaging
const messaging = r.messaging || {};
const isWhatsapp = (messaging.channel || 'telegram') === 'whatsapp';
document.getElementById('cfg-msg-whatsapp').checked = isWhatsapp;
onMessagingChannelChange();
const openwa = messaging.openwa || {};
document.getElementById('cfg-openwa-url').value = openwa.gatewayUrl || 'http://127.0.0.1:2785';
document.getElementById('cfg-openwa-key').value = openwa.apiKey || '';
document.getElementById('cfg-openwa-session').value = openwa.sessionName || 'main';
```

- [ ] **Step 4: Add messaging helpers to the `<script>` block**

Add these functions before the closing `</script>` tag:

```js
function onMessagingChannelChange() {
  const isWhatsapp = document.getElementById('cfg-msg-whatsapp').checked;
  document.getElementById('msg-telegram-panel').style.display = isWhatsapp ? 'none' : 'block';
  document.getElementById('msg-openwa-panel').style.display = isWhatsapp ? 'block' : 'none';
}

async function testOpenWAConnection() {
  const badge = document.getElementById('openwa-status-badge');
  badge.textContent = 'Checking...';
  badge.style.background = '#e2e8f0';
  badge.style.color = '#64748b';
  try {
    const res = await fetch('/api/openwa/status');
    const data = await res.json();
    if (data.reachable) {
      badge.textContent = '✓ Reachable';
      badge.style.background = '#dcfce7';
      badge.style.color = '#166534';
    } else {
      badge.textContent = '✗ Unreachable';
      badge.style.background = '#fee2e2';
      badge.style.color = '#991b1b';
    }
  } catch {
    badge.textContent = '✗ Error';
    badge.style.background = '#fee2e2';
    badge.style.color = '#991b1b';
  }
}

async function sendOpenWATest() {
  const phone = document.getElementById('cfg-openwa-test-phone').value.trim();
  if (!phone) { showStatus('Enter a phone number first', 'error'); return; }
  try {
    const res = await fetch('/api/openwa/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (res.ok) {
      showStatus('✓ Test message sent!', 'success');
    } else {
      showStatus('✗ ' + (data.error || 'Failed to send'), 'error');
    }
  } catch {
    showStatus('✗ Error sending test message', 'error');
  }
}
```

- [ ] **Step 5: Save messaging fields in `saveConfig()`**

In the `saveConfig()` JS function, inside the `restaurant` object being built, add:

```js
messaging: {
  channel: document.getElementById('cfg-msg-whatsapp').checked ? 'whatsapp' : 'telegram',
  openwa: {
    gatewayUrl: document.getElementById('cfg-openwa-url').value.trim() || 'http://127.0.0.1:2785',
    apiKey: document.getElementById('cfg-openwa-key').value.trim() || 'dev-admin-key',
    sessionName: document.getElementById('cfg-openwa-session').value.trim() || 'main'
  }
},
```

- [ ] **Step 6: Commit**

```bash
git add public/config.html
git commit -m "feat: add Messaging tab to admin config UI"
```

---

## Task 7: Update `.env.example` and run full test suite

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add OpenWA vars to .env.example**

Open `.env.example` and add:

```bash
# OpenWA WhatsApp Gateway (alternative to Telegram)
# Set messaging.channel = "whatsapp" in config.json to enable
OPENWA_GATEWAY_URL=http://127.0.0.1:2785
OPENWA_API_KEY=dev-admin-key
OPENWA_SESSION_NAME=main
```

(Note: these are documentation only — the actual values are read from `config.json`, not `.env`.)

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Start the server and verify it boots on the telegram channel**

```bash
node src/index.js
```

Expected output includes:
```
[Messaging] Active channel: telegram
[Messaging] Initializing Telegram Bot...
```

Server should start without errors on port 3000.

Stop with Ctrl+C.

- [ ] **Step 4: Switch to whatsapp channel and verify startup**

Temporarily edit `config/config.json` → `restaurant.messaging.channel` to `"whatsapp"`, then:

```bash
node src/index.js
```

Expected output includes:
```
[Messaging] Active channel: whatsapp
[OpenWA] Registering webhook at POST /api/openwa/webhook
[OpenWA] Webhook registered. Ready for inbound messages.
[CoachBots] WhatsApp channel active — loaded X coaches, Telegram polling skipped.
```

Stop and revert `config/config.json` channel back to `"telegram"` if you want Telegram as default.

- [ ] **Step 5: Commit**

```bash
git add .env.example config/config.json
git commit -m "docs: document OpenWA env vars in .env.example"
```

---

## Task 8: Verify OpenWA gateway end-to-end

This task verifies the live gateway works. Requires the OpenWA service to be running at `http://127.0.0.1:2785`.

- [ ] **Step 1: Test the status endpoint**

```bash
curl http://localhost:3000/api/openwa/status
```

Expected (gateway running):
```json
{"enabled":true,"gatewayUrl":"http://127.0.0.1:2785","sessionName":"main","reachable":true}
```

- [ ] **Step 2: Send a test message via the API**

```bash
curl -X POST http://localhost:3000/api/openwa/test \
  -H "Content-Type: application/json" \
  -d '{"phone":"6588775526","message":"Hello from the booking bot!"}'
```

Expected:
```json
{"success":true,"message":"Test message sent to 6588775526"}
```

Verify the message arrives on the target WhatsApp number.

- [ ] **Step 3: Configure OpenWA to send inbound messages to the webhook**

In the OpenWA gateway admin (at `http://127.0.0.1:2785`), set the webhook URL to:

```
http://127.0.0.1:3000/api/openwa/webhook
```

(or whatever address the gateway can reach the booking server at)

- [ ] **Step 4: Test inbound booking flow**

Send `menu` from a WhatsApp number connected to the gateway session. Expected:
```
Welcome! Please choose an option:

1. Book a Session
2. Cancel a Booking
...
```

Walk through booking a session end-to-end. Verify:
- Booking appears in `/api/bookings`
- Coach receives a WhatsApp notification (if channel is whatsapp and coach has phone number set)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: WhatsApp OpenWA integration complete (fr/whatsup)"
```
