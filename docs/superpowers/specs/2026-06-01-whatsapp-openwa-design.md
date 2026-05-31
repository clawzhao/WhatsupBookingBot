# WhatsApp via OpenWA Gateway — Design Spec

**Date:** 2026-06-01  
**Branch:** `fr/whatsup`  
**Status:** Approved

---

## Background

The existing `whatsapp-web.js` customer bot is non-functional: it has no saved session (`.wwebjs_auth/` is absent), requires a manual QR scan on every restart, and is explicitly disabled (`WHATSAPP_ENABLED=false`). Telegram currently handles both the customer-facing booking bot and per-coach notification bots.

The OpenWA gateway is already running at `http://127.0.0.1:2785` with session `main` and API key `dev-admin-key`. It exposes a simple HTTP REST API for outbound messaging and can deliver inbound messages via webhook.

---

## Goal

Replace `whatsapp-web.js` with the OpenWA HTTP gateway. Add a **Messaging Channel** toggle in the admin settings page so the operator can switch between Telegram and WhatsApp at runtime without code changes.

---

## Architecture

```
Customer WhatsApp ──► OpenWA Gateway (127.0.0.1:2785)
                             │
                      POST /api/openwa/webhook
                             │
                      src/openwa.js (handler)
                             │
              ┌──────────────┴──────────────┐
         Booking logic               Q&A / AI logic
              │
        Coach notification
              │
        openwa.sendMessage()  ──► OpenWA Gateway ──► Coach WhatsApp
```

---

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `src/openwa.js` | New | OpenWA HTTP client + full inbound webhook handler |
| `src/coachBots.js` | Modified | Add WhatsApp notify path alongside Telegram |
| `src/index.js` | Modified | Wire webhook route; channel-aware emergency endpoints |
| `public/config.html` | Modified | New "Messaging" tab with toggle + OpenWA config fields |
| `config/config.json` | Modified | Add `messaging` block |
| `.env.example` | Modified | Document OpenWA env vars |

---

## Section 1 — `src/openwa.js`

### Outbound: `sendMessage(phone, text)`

- Strips non-digit characters from `phone`, appends `@c.us` for the `chatId`
- POSTs to `{gatewayUrl}/api/sessions/{sessionName}/messages/send-text`
- Headers: `Content-Type: application/json`, `X-API-Key: {apiKey}`
- Returns `true` on success (2xx), `false` on failure (logs error, does not throw)
- Config read from `config.json → messaging.openwa` (gatewayUrl, apiKey, sessionName)

### Inbound: `initOpenWA(app)`

Registers `POST /api/openwa/webhook` on the Express app. OpenWA calls this when a customer sends a message.

**Webhook payload shape (OpenWA format):**
```json
{
  "type": "message",
  "data": {
    "from": "6588775526@c.us",
    "body": "Hi",
    "isGroupMsg": false
  }
}
```

Handler logic:
1. Ignore group messages (`isGroupMsg === true`)
2. Extract phone (strip `@c.us`) and message text
3. Log inbound to `chatlog` (platform: `"whatsapp"`)
4. Route through `handleWhatsAppMessage(phone, text)`

### `handleWhatsAppMessage(phone, text)`

Maintains `userSessions` map (phone → session state). Full guided booking flow using **numbered text prompts** (no inline keyboards):

```
Step 1: Greeting / main menu  →  list options 1-6
Step 2: Book — show available dates (next 7 days with slots)
Step 3: Pick time slot (numbered list)
Step 4: Pick party size (numbered list)
Step 5: Pick coach (numbered list, or "0" for any)
Step 6: Confirm (y/n)
Step 7: Booking confirmed → send ID
```

Cancel flow: user types "cancel" at any step or option 2 from main menu.  
Q&A fallback: unrecognised text with no active session → smart answer → AI → polite fallback.

### `getOpenWAStatus()`

Returns `{ enabled: bool, gatewayUrl, sessionName, reachable: bool }`. Pings the gateway health endpoint (or a known route) with a short timeout to determine `reachable`.

---

## Section 2 — `src/coachBots.js`

`notifyCoach(coachId, message)` checks `config.messaging.channel`:

- `"telegram"` → existing Telegram bot path (unchanged)
- `"whatsapp"` → calls `openwa.sendMessage(coach.phone, message)` using the phone stored in the coaches DB row

`notifyCoachOfBooking` and `notifyCoachOfCancellation` are unchanged in signature — they call `notifyCoach` which does the dispatch.

`initCoachBots()` still initialises Telegram bots (they are no-ops when channel is `"whatsapp"` but remain available for a quick switch back). When channel is `"whatsapp"`, it logs a note and skips Telegram polling to avoid conflicts.

---

## Section 3 — `src/index.js`

On startup, channel controls which stack initialises:

- `"whatsapp"`: call `initOpenWA(app)`. Skip `initWhatsApp()` (whatsapp-web.js), skip `initTelegram()`, skip `initCoachBots()`.
- `"telegram"`: existing behaviour unchanged — `initTelegram()` + `initCoachBots()`. Skip `initOpenWA()`.

Emergency notify endpoint (`POST /api/coach-emergency/notify`) and unavailability notify endpoint dispatch via `openwa.sendMessage` when channel is `"whatsapp"`, Telegram `bot.sendMessage` when `"telegram"`.

Add `GET /api/openwa/status` → returns `getOpenWAStatus()`.  
Add `POST /api/openwa/test` → sends a test message to a given phone number (used by settings page).

---

## Section 4 — Config Schema

Add to `config/config.json → restaurant`:

```json
"messaging": {
  "channel": "whatsapp",
  "openwa": {
    "gatewayUrl": "http://127.0.0.1:2785",
    "apiKey": "dev-admin-key",
    "sessionName": "main"
  }
}
```

`channel` is `"telegram"` or `"whatsapp"`. Default is `"telegram"` for backwards compatibility.

---

## Section 5 — Settings Page (`public/config.html`)

New **"Messaging"** tab (inserted between "Services" and "AI Settings"):

1. **Active Channel** — toggle switch labelled `Telegram` / `WhatsApp`. Saving this updates `messaging.channel`.
2. **OpenWA Settings** (visible only when WhatsApp is selected):
   - Gateway URL input (placeholder `http://127.0.0.1:2785`)
   - API Key input (password type)
   - Session Name input (placeholder `main`)
   - **Test Connection** button — calls `GET /api/openwa/status` and shows reachable/unreachable
   - **Send Test Message** — input for a phone number + button that calls a new `POST /api/openwa/test` endpoint
3. **Telegram Settings** (visible only when Telegram is selected):
   - Read-only display of the active token (first 10 chars + `...`)
   - Link to `.env` for editing

---

## Section 6 — Error Handling

- `sendMessage` failure → logs error, returns `false`. Callers treat `false` as "notification skipped" and do not crash.
- Webhook receives unknown payload shape → logs and returns `200 OK` (prevents OpenWA retries).
- Gateway unreachable at startup → logs warning, does not crash server. Messaging fails gracefully until gateway is up.

---

## Out of Scope

- WhatsApp group messaging
- Media/file attachments
- Read receipts
- Migrating historical Telegram chat logs to WhatsApp
- Per-coach WhatsApp bot tokens (OpenWA uses one shared session for all outbound)
