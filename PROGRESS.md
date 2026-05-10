# Swimming Booking Bot - Progress Report

## What Has Been Done

### 1. Coach Telegram Bot System
- **Each coach now has their own Telegram bot** for receiving booking notifications
- Coach data is stored in **SQLite** (`coaches` table in `data/bookings.db`), not in JSON config
- When a customer books a session, the assigned coach receives a notification via their personal bot
- When a booking is cancelled, the coach receives a cancellation notification

### 2. Database Changes
- Added `coaches` table to `data/bookings.db` with fields: `id`, `name`, `phone`, `telegram_bot_token`, `telegram_chat_id`, `is_active`
- Added `coach_id` column to `bookings` table for coach assignment
- Removed orphaned `instance/bookings.db` file (was not referenced by any code)
- Default coaches (John Smith, Jane Doe) are auto-seeded on first run

### 3. New Files Created
| File | Purpose |
|------|---------|
| `src/coachService.js` | SQLite-based CRUD for coach data |
| `src/coachBots.js` | Multi-bot service (one Telegram bot per coach) |

### 4. Files Modified
| File | Changes |
|------|---------|
| `src/booking.js` | Added `coaches` table creation, coach assignment (round-robin), coach notification on booking/cancellation |
| `src/index.js` | Initializes coach bots on startup, waits for DB readiness, added `/api/coach-bots/status` endpoint |
| `config/restaurant.json` | Removed `coaches` array (moved to SQLite), restored `restaurant` wrapper key |

### 5. Bug Fixes
- Fixed `config/restaurant.json` structure: restored missing `restaurant` wrapper key that broke `validateBooking()` and `getMenuText()`

## How to Configure Coach Bots

1. Create Telegram bots via [@BotFather](https://t.me/BotFather) for each coach
2. Insert the bot tokens into the `coaches` table in SQLite:
   ```sql
   UPDATE coaches SET telegram_bot_token = 'YOUR_BOT_TOKEN' WHERE id = 'coach-1';
   ```
3. Restart the server — each coach's bot will start polling
4. Each coach messages their bot with `/start` to connect

## What To Be Done

### High Priority
- [ ] **Admin UI for coach management**: Add a web interface to add/edit coaches and set bot tokens (instead of raw SQL)
- [ ] **Coach assignment logic**: Replace simple round-robin with intelligent assignment based on availability, specialty, and schedule
- [ ] **Error handling**: Improve retry logic for failed Telegram notifications

### Medium Priority
- [ ] **Coach schedule view**: Allow coaches to view their daily/weekly schedule via their bot
- [ ] **Booking confirmation from coach**: Allow coaches to confirm or decline bookings via their bot
- [ ] **Student notifications**: Notify students when a coach accepts/declines their booking

### Low Priority
- [ ] **Rename `restaurant.json`**: Rename to `booking-config.json` or similar since this is a swimming coaching system
- [ ] **Remove unused Phase 2 models**: `src/models/` directory references `src/db/connection.js` which doesn't exist — clean up or implement
- [ ] **Unit tests**: Add tests for coach service and coach bot notification logic