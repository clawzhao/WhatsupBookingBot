# Implementation Plan: Swimming Booking System

**Branch**: `001-swimming-booking-system` | **Date**: May 3, 2026 | **Spec**: `.specify/specs/swimming-booking-system/spec.md`

## Summary

Transform existing restaurant booking system (Node.js/Python hybrid) into swimming lesson booking system with:
- Individual/group WhatsApp chat-based booking with soft-hold (30-60 sec) timeslot reservation
- Hybrid coach assignment: Admin static timeslot configuration + user selection with coach backend approval
- Automated coach reminders (daily 7am + 30-min before lessons)
- Real-time conflict detection preventing double-booking at booking time
- Admin dashboard with search by student/coach and chat history analysis

## Technical Context

**Language/Version**: Node.js 18+ (JavaScript/Express.js) + Dart 3.x (Flutter for admin dashboard) + Python 3.11 (Flask, optional)
**Primary Dependencies**: Express.js 5.x, whatsapp-web.js 1.x, better-sqlite3 (direct SQLite for simplicity)
**Storage**: SQLite 3.x (v1, sufficient for single location + <500 bookings/week); PostgreSQL 14+ planned for v2 scaling
**Testing**: Jest, Mocha, Supertest, Flutter integration tests
**Target Platform**: Linux server (backend), Windows/macOS/Linux desktop (admin UI)
**Project Type**: Web service (Express API + WhatsApp bot + Admin dashboard)

**Performance Goals**:
- Booking confirmation: < 3 minutes (95th percentile)
- Coach reminders: 99% delivery within 15 min of scheduled time
- Admin search: < 2 sec response (95% of queries)
- Concurrent WhatsApp: 100+ simultaneous conversations

**Constraints**:
- WhatsApp rate limiting adherence
- Coach approval window: 24-48 hours
- Soft hold: 30-60 second auto-release
- Zero double-booking tolerance
- SQLite concurrent write ceiling: ~500 bookings/week (single location, single process). Scaling to PostgreSQL v2 when multi-location or 10k+/week
- Flutter admin dashboard built once for desktop/mobile cross-platform access

## Constitution Check

✅ **PASS - Ready for Phase 0 Research**

All project principles satisfied:
- Spec-Driven: Full specification with 8 user stories, 25 requirements, 5 clarifications
- Test-Driven: TDD architecture with unit/integration/E2E tests
- Zero-Bug: Prevents conflicts at booking time, soft-hold prevents race conditions
- Full Traceability: Audit logs + implementation logs

## Project Structure

### Documentation
```
.specify/specs/swimming-booking-system/
├── spec.md                     # Feature specification ✓
├── plan.md                     # This file (implementation plan) ✓
├── research.md                 # Phase 0 output (pending)
├── data-model.md               # Phase 1 output (pending)
├── contracts/                  # Phase 1 output (pending)
├── quickstart.md               # Phase 1 output (pending)
└── Implementation Logs/        # Auto-created for task tracking ✓
```

### Source Code
```
src/
├── models/                     # Database entities (Coach, TimeSlot, SlotReservation, ChatMessage, KnowledgeBase, AuditLog)
├── services/                   # Business logic (BookingService, CoachService, ConflictDetector, ReminderService, QAService)
├── api/routes/                 # REST endpoints (booking, coach, admin)
├── api/middleware/             # Auth, validation
├── background/                 # Cron jobs for reminders
└── admin/                      # Admin dashboard

tests/
├── unit/                       # Service + model tests
├── integration/                # Booking scenarios, conflict detection, reminders
├── e2e/                        # Admin UI tests
└── fixtures/                   # Test data

db/
├── seeds/                      # Test data
└── v2-migration-scripts/       # PostgreSQL migration path (future)

admin-dashboard/               # Flutter app
├── lib/
│   ├── main.dart              # App entry point
│   ├── screens/               # Login, search, coach schedule
│   ├── services/api_service.dart  # Backend API client
│   ├── models/                # Data models
│   └── widgets/               # UI components
├── test/                       # Flutter integration tests
└── pubspec.yaml                # Dependencies (get, provider, dio)
```

## Phase 0: Research Topics

**BLOCKING - must complete before Phase 1**

1. WhatsApp Web.js reminder delivery reliability & timing mechanisms
2. Coach approval workflow UX & notification channels
3. SQLite soft-hold locking patterns (optimistic vs pessimistic transactions for concurrent bookings)
4. Soft-hold cleanup strategy in SQLite (cron-based expiration of old reservations)
5. Flutter admin dashboard architecture patterns (state management: get vs provider; API integration: dio)
6. Q&A fuzzy matching library evaluation (fuse.js, Levenshtein distance, accuracy metrics)

## Key Decisions

| Decision | Why | Alternative Rejected |
|----------|-----|---------------------|
| SQLite for v1 | Simple setup, adequate for single location <500 bookings/week, zero migration overhead | Jumping to PostgreSQL adds complexity prematurely |
| PostgreSQL path for v2 | Enables multi-location scaling and 10k+ bookings/week throughput | Locks into SQLite bottlenecks at scale |
| Flutter admin dashboard | Cross-platform (Windows/macOS/Linux desktop + iOS/Android mobile from single codebase) | Web-only dashboard limits stakeholder access and requires multiple deploys |
| Cron-based reminders | Simple scheduling adequate for <500 bookings/week | Redis/Bull.js adds infrastructure complexity before need |
| Coach approval backend | Prevents overbooking before confirmation | Auto-assign risks coach overcommit and poor UX |
| Soft-hold table | Prevents race conditions under concurrent users | First-come-first-served causes false "unavailable" errors |
| Audit trail on every change | Required for zero-bug commitment | Selective logging misses issues and hurts traceability |

## Implementation Timeline

| Phase | Task | Effort | Duration |
|-------|------|--------|----------|
| 0 | Research (6 topics) | 40 hrs | 1 week |
| 1a | SQLite + better-sqlite3 setup | 30 hrs | 3-4 days |
| 1b | Data model + migrations | 40 hrs | 1 week |
| 1c | Booking service (soft-hold) | 60 hrs | 1-2 weeks |
| 1d | Coach service + approval | 50 hrs | 1-2 weeks |
| 1e | Conflict detection service | 40 hrs | 1 week |
| 1f | Flutter admin dashboard | 80 hrs | 2-3 weeks |
| 1g | Admin API endpoints + integration tests | 30 hrs | 1 week |
| 2 | Generate tasks (/speckit.tasks) | - | - |

## Next Steps

**Immediate**: Run Phase 0 research on 6 topics
**Short Term**: Create research.md, data-model.md, contracts/
**Medium Term**: Generate tasks.md, begin implementation with TDD

---

**Status**: ✅ **READY FOR PHASE 0 RESEARCH** (SQLite + Flutter)
