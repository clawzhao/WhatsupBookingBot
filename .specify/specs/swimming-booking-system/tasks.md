# Implementation Tasks: Swimming Booking System

**Feature**: Swimming Booking System Transformation  
**Branch**: `001-swimming-booking-system`  
**Generated**: May 3, 2026  
**Status**: Ready for Phase 0 Research → Phase 1 Implementation  
**Tech Stack**: Node.js + Express + SQLite 3.x (v1) + Flutter (admin)

---

## Overview

This task list breaks down the swimming lesson booking system implementation into atomic tasks (<3 file changes per task) organized by:
- **User Stories** (8 total, P1/P2/P3 priority)
- **Independent test criteria** per story
- **Parallel execution opportunities**
- **MVP scope** (typically US1 only for first iteration)

**Total Tasks**: 67  
**Setup Phase**: 8 tasks  
**Foundational Phase**: 9 tasks  
**User Story Phases**: 38 tasks (5-6 per story)  
**Polish Phase**: 12 tasks

---

## Phase 1: Setup (Project Initialization)

Initialize SQLite database, project structure, dependencies, and GitHub integration.

- [ ] T001 Create SQLite database initialization script at `src/db/init.sql` with tables for students, bookings, coaches, timeslots, reservations, messages, knowledge_base, audit_logs
- [ ] T002 [P] Create Node.js entry point with Express server at `src/index.js` (port configuration, middleware setup, error handling)
- [ ] T002 [P] Create WhatsApp bot initialization at `src/whatsapp-bot.js` with authentication and message listener setup
- [ ] T003 Install npm dependencies: `better-sqlite3@9.x`, `express@5.x`, `whatsapp-web.js@1.x`, `dotenv`, `body-parser`, `node-cron`, `uuid` (update `package.json`)
- [ ] T004 Create environment configuration template at `.env.example` with DATABASE_PATH, BOT_CREDENTIALS, ADMIN_SECRET
- [ ] T005 [P] Create project structure directories: `src/{models,services,api,background,middleware}`, `db/`, `tests/{unit,integration,e2e}`, `admin-dashboard/`
- [ ] T006 [P] Create GitHub workflow file at `.github/workflows/ci.yml` for test automation (Jest, lint, coverage checks)
- [ ] T007 Create Jest configuration at `jest.config.js` with coverage thresholds (>80% for critical paths) and test environment setup
- [ ] T008 Initialize Flutter project at `admin-dashboard/` with `flutter create --template=app` and configure pubspec.yaml dependencies (get, provider, dio)

**Independent Test**: Database initializes with all 8 tables; Node server starts on configured port; WhatsApp listener ready; Flutter app scaffolded.

---

## Phase 2: Foundational (Blocking Prerequisites)

Implement core database models, authentication, common services, and error handling used by all user stories.

- [ ] T009 Create Student model at `src/models/Student.js` with schema (phone, name, email, created_at) and CRUD methods using better-sqlite3
- [ ] T010 [P] Create Coach model at `src/models/Coach.js` with schema (id, name, phone, locations, daily_reminder_time, reminder_30min_enabled, created_at) and methods
- [ ] T010 [P] Create TimeSlot model at `src/models/TimeSlot.js` with schema (id, day_of_week, start_time, end_time, location, max_capacity, coach_id, is_active)
- [ ] T011 [P] Create Booking model at `src/models/Booking.js` with schema (id, student_phone, coach_id, timeslot_id, booking_date, status: ['pending','confirmed','cancelled','completed'], created_at, cancelled_at)
- [ ] T012 [P] Create SlotReservation model at `src/models/SlotReservation.js` with schema (id, timeslot_id, student_phone, reserved_at, expires_at) for soft-holds with auto-expiry
- [ ] T013 [P] Create ChatMessage model at `src/models/ChatMessage.js` with schema (id, sender_phone, text, timestamp, thread_type: ['individual','group'], booking_id, context_raw, is_processed)
- [ ] T014 [P] Create KnowledgeBase model at `src/models/KnowledgeBase.js` with schema (id, question_text, answer_text, category, created_at, updated_at, usage_count, coaches_refined)
- [ ] T015 Create AuditLog model at `src/models/AuditLog.js` with schema (id, entity_type, entity_id, change_type: ['create','update','delete'], old_values, new_values, changed_by, timestamp) for full traceability
- [ ] T016 Create admin authentication middleware at `src/middleware/auth.js` with username/password validation (v1 simple auth, OAuth roadmap for v2)
- [ ] T017 [P] Create validation middleware at `src/middleware/validators.js` with helper functions for phone format, timeslot availability, coach approval window
- [ ] T018 Create error handling helper at `src/utils/errorHandler.js` with custom error classes (BookingConflict, SoftHoldExpired, CoachUnavailable, InvalidTimeslot) and logging
- [ ] T019 Create database connection pool at `src/db/connection.js` with connection management for better-sqlite3 and WAL mode enablement for concurrent writes
- [ ] T020 Create base service class at `src/services/BaseService.js` with common methods (validate, audit, transaction helpers, retry logic)
- [ ] T021 Create soft-hold helper service at `src/services/SoftHoldService.js` with methods: createReservation(), expireReservation(), checkConflict(), cleanupExpired()

**Independent Test**: All 8 models create/read/update/delete successfully; Auth middleware validates credentials; Error classes throw correctly; Soft-holds create, expire automatically after 45 seconds, prevent double-books.

**Critical Dependency**: All user stories depend on Phase 2 completion.

---

## Phase 3: User Story 1 - Individual Books Lesson (P1)

**Story Goal**: Users can initiate booking conversations, view 7-day availability, select timeslot, and receive confirmation.

**Acceptance**: User sends "Book lesson", sees timeslots, selects one, receives confirmation with coach info within 60 seconds.

**Independent Test Criteria**:
- User message "Book lesson" triggers availability display
- 7-day timeslots shown (unavailable slots hidden)
- Selected timeslot confirmed and stored with status='pending'
- Coach receives notification within 30 seconds
- Booking recorded in database with student/coach/time

**Parallel Tasks** (within story):
- [ ] T022 [P] [US1] Implement BookingService.listAvailableSlots() at `src/services/BookingService.js` - query TimeSlot table, subtract SlotReservation count from capacity, return next 7 days
- [ ] T023 [P] [US1] Implement BookingService.createUnconfirmedBooking() - insert Booking with status='pending', create SlotReservation (soft-hold), return booking_id
- [ ] T024 [P] [US1] Create WhatsApp message handler for "Book lesson" intent at `src/api/routes/whatsapp-messages.js` with NLU pattern detection
- [ ] T025 [P] [US1] Implement coach notification service at `src/services/NotificationService.js` - sendCoachNotification(coach_id, business_type: 'new_booking') using whatsapp-web.js  
- [ ] T026 [US1] Create booking confirmation endpoint POST `/api/bookings/confirm` at `src/api/routes/bookings.js` with coach assignment and audit logging
- [ ] T027 [US1] Implement BookingService.assignCoach() with hybrid E+B logic (admin config + user selection + backend approval)
- [ ] T028 [US1] Write unit tests at `tests/unit/booking.service.spec.js` for all booking service methods
- [ ] T029 [US1] Write integration test at `tests/integration/booking-flow.spec.js` for complete user booking flow

**Delivery**: User can complete full booking flow in <3 minutes; system prevents double-booking via soft-hold.

---

## Phase 4: User Story 2 - Reschedule/Cancel Lesson (P1)

**Story Goal**: Users reschedule or cancel existing bookings via WhatsApp; coaches notified automatically.

**Acceptance**: User says "Reschedule my booking", selects new time, old booking cancelled, coaches updated.

**Independent Test Criteria**:
- User retrieves active bookings when asking to reschedule
- Alternative timeslots displayed (excluding same coach at overlapping times)
- New booking created, old cancelled, both logged with timestamps
- Coach receives immediate cancellation + new assignment notification
- Old timeslot capacity freed for other bookings

**Parallel Tasks** (within story):
- [ ] T030 [P] [US2] Create reschedule message handler at `src/api/routes/whatsapp-messages.js` detecting "reschedule" intent
- [ ] T030 [P] [US2] Implement BookingService.getActiveBookings(student_phone) returning all confirmed bookings for next 30 days
- [ ] T031 [P] [US2] Implement BookingService.rescheduleBooking(booking_id, new_timeslot_id) with validation and audit logging
- [ ] T032 [US2] Create cancel endpoint POST `/api/bookings/cancel` with deadline validation and notifications
- [ ] T033 [US2] Implement cancel/reschedule notifications at `src/services/NotificationService.js`
- [ ] T034 [US2] Write unit tests at `tests/unit/rescheduling.spec.js` for rescheduling logic
- [ ] T035 [US2] Write integration test at `tests/integration/reschedule-flow.spec.js` for complete reschedule flow

**Delivery**: Reschedule/cancel operations complete within 30 seconds; full audit trail; coach receives notifications.

---

## Phase 5: User Story 3 - Generic Questions (P2)

**Story Goal**: System answers common Q&A from knowledge base; escalates unclear questions to coaches.

**Acceptance**: User asks "What levels do you teach?", system responds from knowledge base; unclear questions marked for coach follow-up.

**Independent Test Criteria**:
- FAQ questions matched using fuzzy search (>80% match score)
- Answer returned within 5 seconds
- Unclear questions logged for coach escalation
- Coach can improve Q&A pairs (self-improving system)
- Usage statistics tracked

- [ ] T036 [US3] Phase 0 Research: Complete Q&A fuzzy matching library evaluation
- [ ] T037 [US3] Create QAService.search() and QAService.escalateQuestion() at `src/services/QAService.js`
- [ ] T038 [US3] Create WhatsApp FAQ intent handler at `src/api/routes/whatsapp-messages.js`
- [ ] T039 [P] [US3] Implement escalation notification at `src/services/NotificationService.js`
- [ ] T040 [US3] Create admin endpoints for Q&A management at `src/api/routes/admin-qa.js`
- [ ] T041 [US3] Write unit tests at `tests/unit/qa.service.spec.js`
- [ ] T042 [US3] Write integration test at `tests/integration/qa-flow.spec.js`

**Delivery**: 80% of common questions answered from knowledge base; unclear questions escalated within 10 seconds.

---

## Phase 6: User Story 4 - Coach Reminders (P2)

**Story Goal**: Coaches receive daily 7am schedule + 30-min before each lesson + immediate change notifications.

**Acceptance**: Coaches receive WhatsApp reminders at scheduled times; reminders include student names, locations, lesson notes.

**Independent Test Criteria**:
- Daily 7am schedule sent with all lessons for that day
- 30-min reminders sent exactly at lesson_time - 30min
- Immediate notification sent on booking changes
- 99% delivery rate (retry on failure)
- Respects quiet hours (no reminders 9pm-7am if configured)

- [ ] T043 Phase 0 Research: Complete WhatsApp delivery reliability study
- [ ] T044 [US4] Create ReminderService at `src/services/ReminderService.js` with all reminder methods
- [ ] T045 [US4] Create cron job at `src/background/daily-schedule-cron.js` for 7am schedule
- [ ] T046 [US4] Create cron job at `src/background/thirty-min-reminder-cron.js` for 30-min reminders
- [ ] T047 [US4] Create retry mechanism at `src/services/ReminderService.js` with exponential backoff
- [ ] T048 [US4] Create reminder test endpoint POST `/api/reminders/test` for admin
- [ ] T049 [US4] Write unit tests at `tests/unit/reminders.spec.js`
- [ ] T050 [US4] Write integration test at `tests/integration/reminders-flow.spec.js`

**Delivery**: All reminders delivered within 99% success rate; missed reminders logged and retried.

---

## Phase 7: User Story 5 - Group Chat (P2)

**Story Goal**: System detects booking intent in group chats, routes to individual confirmation, links to group record.

**Acceptance**: User sends booking message in group, system sends private confirmation, user confirms, booking recorded with group context.

**Independent Test Criteria**:
- Group message intent detected (booking language patterns)
- Individual message sent to user within 5 seconds
- User response confirmed in individual chat
- Booking linked to group with context
- 24-hour timeout if user doesn't respond

- [ ] T051 [US5] Create group chat monitor at `src/services/GroupChatService.js` with intent detection
- [ ] T052 [P] [US5] Implement GroupChatService.routeToIndividual() for confirmation routing
- [ ] T053 [P] [US5] Create individual confirmation handler at `src/api/routes/whatsapp-messages.js`
- [ ] T054 [US5] Implement GroupChatService.linkToGroup() for recording group context
- [ ] T055 [US5] Create timeout handler at `src/background/group-confirmation-timeout.js`
- [ ] T056 [US5] Write unit tests at `tests/unit/group-chat.spec.js`
- [ ] T057 [US5] Write integration test at `tests/integration/group-booking-flow.spec.js`

**Delivery**: Group booking flow completed in <5 minutes; one confirmed group booking per user per request.

---

## Phase 8: User Story 6 - Conflict Management (P2)

**Story Goal**: System prevents double-booking, detects impossible commutes, shows clean daily schedule, provides conflict alerts.

**Acceptance**: System rejects double-bookings, warns of travel conflicts, highlights scheduling issues on admin dashboard.

**Independent Test Criteria**:
- Timeslot at max capacity → new booking rejected (offer alternatives)
- Same coach assigned at overlapping times → conflict detected, booking rejected
- Travel time between locations insufficient → warning shown
- Conflicts displayed on admin dashboard
- Coach schedule always valid (zero conflicts in database)

- [ ] T058 [P] [US6] Create ConflictDetector service at `src/services/ConflictDetector.js` with all validation methods
- [ ] T059 [P] [US6] Update BookingService to call ConflictDetect before creating bookings
- [ ] T060 [P] [US6] Implement travel time validation using Coach locations and TimeSlot locations
- [ ] T061 [US6] Create conflict display endpoint GET `/api/conflicts/daily/:coach_id/:date` for admin dashboard
- [ ] T062 [US6] Create conflict resolution endpoint POST `/api/conflicts/:conflict_id/resolve`
- [ ] T063 [US6] Write unit tests at `tests/unit/conflict-detector.spec.js`
- [ ] T064 [US6] Write integration test at `tests/integration/conflict-management.spec.js`

**Delivery**: Zero conflicts in database; coaches see clean schedules; travel time respected. **Critical for zero-bug commitment.**

---

## Phase 9: User Story 7 - Admin Search (P3)

**Story Goal**: Authorized admins can login, search by student, coach, chat history, view/manage bookings.

**Acceptance**: Admin logs in, searches by name, gets complete student history with all bookings and chats; can suspend/modify bookings.

**Independent Test Criteria**:
- Admin login restricted to authorized users only
- Student search returns all bookings for past 12 months
- Coach search shows all students, cancellation rates, performance
- Chat history search keyword-based, returns with context
- Admin can suspend/modify bookings with audit trail

- [ ] T065 [P] [US7] Create Flutter admin app screens at `admin-dashboard/lib/screens/` (Login, Search, Details)
- [ ] T066 [P] [US7] Create Flutter API service at `admin-dashboard/lib/services/api_service.dart` for all API calls
- [ ] T067 [P] [US7] Create admin API endpoints at `src/api/routes/admin-search.js` with auth middleware
- [ ] T068 [P] [US7] Create coach search endpoint GET `/api/admin/coaches?q=` with performance stats
- [ ] T069 [US7] Create chat search endpoint GET `/api/admin/chats?q=` with context
- [ ] T070 [US7] Create booking management endpoints for suspend/modify with audit trail
- [ ] T071 [US7] Write Flutter UI tests at `admin-dashboard/test/search_flow_test.dart`
- [ ] T072 [US7] Write API integration tests at `tests/integration/admin-search.spec.js`

**Delivery**: Admin can find any student/coach/message in <2 seconds; full audit trail on admin actions; Flutter UI responsive.

---

## Phase 10: User Story 8 - Updated Activity List (P3)

**Story Goal**: After any user change, system generates and sends coach's updated current-day activity list.

**Acceptance**: User reschedules booking, coach immediately receives updated day schedule with new time consolidated.

**Independent Test Criteria**:
- Activity list generated within 5 seconds of booking change
- List includes all lessons for that day in chronological order
- Multiple updates consolidated into one message (if within 1 minute)
- Includes timestamps, student names, locations, notes
- Each affected coach gets personalized list

- [ ] T073 [P] [US8] Create ActivityListService.generateCoachActivityList() at `src/services/ActivityListService.js`
- [ ] T074 [P] [US8] Update NotificationService to call ActivityListService after booking changes
- [ ] T075 [US8] Implement consolidation logic to queue rapid updates for same coach
- [ ] T076 [US8] Create endpoint GET `/api/coaches/:id/activity-today` for current day schedule
- [ ] T077 [US8] Create endpoint GET `/api/coaches/:id/activity-history` showing past activity
- [ ] T078 [US8] Write unit tests at `tests/unit/activity-list.spec.js`
- [ ] T079 [US8] Write integration test at `tests/integration/activity-list-flow.spec.js`

**Delivery**: Activity lists generated and sent within 5 seconds; coaches see single consolidated daily schedule.

---

## Phase 11: Polish & Cross-Cutting Concerns

Finalize system with monitoring, documentation, error recovery, and performance optimization.

- [ ] T080 [P] Create API rate limiting middleware at `src/middleware/rate-limiting.js` (100 req/min per IP)
- [ ] T081 [P] Create request logging at `src/middleware/logging.js` with request ID, duration, status
- [ ] T082 [P] Create health check endpoint GET `/health` returning system status
- [ ] T083 Create soft-hold cleanup cron job at `src/background/cleanup-cron.js` for expired reservations
- [ ] T084 Create backup script at `scripts/backup-database.sh` for daily SQLite backup
- [ ] T085 Create data retention script at `scripts/retention-policy.sh` with 12-month + archive + 3-year deletion
- [ ] T086 [P] Update README.md with setup, API docs, testing, deployment instructions
- [ ] T087 [P] Create DEPLOYMENT.md with SQLite production configuration
- [ ] T088 Create monitoring dashboard instructions at `doc/MONITORING.md`
- [ ] T089 Create troubleshooting guide at `doc/TROUBLESHOOTING.md`
- [ ] T090 Write end-to-end test suite at `tests/e2e/full-booking-flow.e2e.js` for complete journey
- [ ] T091 [P] Create verification checklist for all acceptance criteria and success metrics compliance

**Delivery**: Production-ready system with monitoring, backup, retention policy, documentation, and E2E tests.

---

## Dependency Graph & Execution

Phase 1: Setup (T001-T008) → Phase 2: Foundational (T009-T021) → Phase 3-10: User Stories 1-8 (can parallelize per story) → Phase 11: Polish

---

## MVP Scope Recommendation

**Recommended MVP (Weeks 1-2)**:
1. Phase 1: Setup (2 days)
2. Phase 2: Foundational (3 days)
3. **Phase 3: User Story 1** - Individual Booking (4-5 days) ← Core revenue driver
4. **Phase 4: User Story 2** - Reschedule/Cancel (2-3 days) ← Essential for UX
5. Phase 11: Basic Polish (1-2 days)

**MVP Effort**: 60-80 hours (2-3 weeks full-time)

**Total Effort Estimate**: 220-280 hours (6-7 weeks full-time, 40-50% reduction with parallelization)

---

**Status**: ✅ **READY FOR PHASE 0 RESEARCH → PHASE 1 IMPLEMENTATION**  
**Feature Branch**: `001-swimming-booking-system`  
**Next**: Phase 0 research (1 week) → Create data-model.md, contracts/ → Phase 1 Implementation
