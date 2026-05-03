# Feature Specification: Swimming Booking System

**Feature Branch**: `001-swimming-booking-system`  
**Created**: May 3, 2026  
**Status**: Draft  
**Input**: Transform restaurant booking system to swimming lesson booking system with individual/group chat, coach management, and backend admin system.

## User Scenarios & Testing

### User Story 1 - Individual User Books Swimming Lesson (Priority: P1)

Users can initiate booking conversations with the swimming system via WhatsApp, view available timeslots, and confirm bookings. This is the core MVP.

**Why this priority**: Foundation feature - all other features depend on users being able to make bookings. Core revenue driver.

**Independent Test**: User can send "Book swimming lesson" message, receive available timeslots, select one, and receive confirmation. System records booking in database.

**Acceptance Scenarios**:

1. **Given** user opens WhatsApp chat with booking system, **When** user sends "Book swimming lesson", **Then** system responds with list of available timeslots for next 7 days
2. **Given** user sees available timeslots, **When** user selects a timeslot (e.g., "Monday 3pm"), **Then** system confirms booking and sends summary with date/time/coach info
3. **Given** booking is confirmed, **When** coach is assigned, **Then** coach receives automatic notification with new student/booking details
4. **Given** booking is confirmed, **When** user saves message thread, **Then** user can reference booking details anytime

---

### User Story 2 - Individual User Reschedule/Cancel Lesson (Priority: P1)

Users can reschedule or cancel existing bookings via WhatsApp conversation. Essential for handling life changes and schedule conflicts.

**Why this priority**: Users will frequently need to change plans. Without this, system frustration increases.

**Independent Test**: User says "Reschedule my Monday lesson" or "Cancel my booking", system shows confirmation, updates coach automatically.

**Acceptance Scenarios**:

1. **Given** user has existing booking, **When** user sends "Reschedule my booking" in WhatsApp, **Then** system shows current booking and available alternative timeslots
2. **Given** user selects alternative timeslot, **When** user confirms, **Then** old booking cancelled, new booking created, coaches notified
3. **Given** user has existing booking, **When** user sends "Cancel my lesson", **Then** system asks for confirmation
4. **Given** cancellation confirmed, **When** system processes it, **Then** coach receives cancellation notification with updated daily schedule

---

### User Story 3 - System Answers Generic User Questions (Priority: P2)

System can handle common inquiries about classes, pricing, eligibility, location, etc., without human intervention. Reduces support burden.

**Why this priority**: Reduces coach workload. Improves user experience with instant answers. Enables 24/7 support.

**Acceptance Scenarios**:

1. **Given** user sends generic question (e.g., "What levels do you teach?"), **When** system processes it, **Then** system responds with pre-configured answer
2. **Given** question is unclear, **When** system cannot answer, **Then** system escalates to human coach with context
3. **Given** multiple users ask same question, **When** system logs this, **Then** admin dashboard shows FAQs

---

### User Story 4 - Coach Receives Automatic Reminders (Priority: P2)

Coaches receive timely reminders about upcoming lessons, schedule changes, and cancellations without manual prompting.

**Why this priority**: Prevents missed classes. Informs coaches of last-minute changes. Reduces no-show rate.

**Acceptance Scenarios**:

1. **Given** swimming lesson scheduled for next day, **When** morning arrives (7am default), **Then** coach receives "Daily Schedule" message with all lessons
2. **Given** swimming lesson within next 30 minutes, **When** timer triggers, **Then** coach receives urgent reminder with student name and location
3. **Given** user cancels/reschedules lesson, **When** action confirmed, **Then** coach receives immediate notification with changes
4. **Given** multiple changes occur, **When** coach hasn't checked messages, **Then** system sends consolidated update with complete day schedule

---

### User Story 5 - Group Chat Auto-Confirmation (Priority: P2)

System monitors group chats for booking-related messages and automatically routes individuals for personal confirmation.

**Why this priority**: Captures bookings made in group context. Ensures proper record-keeping and coach notifications.

**Acceptance Scenarios**:

1. **Given** user sends booking message in group chat (e.g., "Book me for Monday 3pm"), **When** system detects intent, **Then** system sends private message asking to confirm
2. **Given** user confirms in individual chat, **When** confirmation received, **Then** system links booking to group and updates records
3. **Given** multiple users in group make requests, **When** all confirm, **Then** system consolidates and notifies coaches
4. **Given** user doesn't respond, **When** timeout occurs (24 hours), **Then** system notifies admin

---

### User Story 6 - Coach Daily Schedule & Conflict Management (Priority: P2)

System intelligently prevents double-bookings, detects time conflicts, and provides coaches clean, organized daily schedules.

**Why this priority**: Prevents operational chaos. Ensures no overbooking. Builds coach confidence in system.

**Acceptance Scenarios**:

1. **Given** timeslot has max capacity, **When** new booking attempted, **Then** system rejects and offers alternatives
2. **Given** coach has travel time constraints, **When** booking would create impossible commute, **Then** system prevents or warns
3. **Given** conflicts detected, **When** coach views schedule, **Then** system highlights conflicts
4. **Given** conflict resolved, **When** coach confirms, **Then** all affected students notified

---

### User Story 7 - Backend Admin Search & Management (Priority: P3)

Authorized admins can login, search by student, search by coach, and view/search chat history.

**Why this priority**: Enables business operations. Secondary priority as staffing-focused not customer-facing.

**Acceptance Scenarios**:

1. **Given** admin accesses backend, **When** admin logs in, **Then** system validates and grants access only if authorized
2. **Given** admin on search page, **When** admin enters student name, **Then** system returns all courses/bookings for that student
3. **Given** coach search active, **When** admin enters coach name, **Then** system shows coach's classes and students
4. **Given** admin searches chat history, **When** admin enters search term, **Then** system returns matching messages with context
5. **Given** search results shown, **When** admin clicks result, **Then** system displays full thread with metadata

---

### User Story 8 - Generated Coach Updated Activity List (Priority: P3)

After any customer-initiated change, system automatically generates and sends coach's updated current day activities.

**Why this priority**: Prevents coach confusion. Provides single source of truth. Reduces communication back-and-forth.

**Acceptance Scenarios**:

1. **Given** user changes booking, **When** confirmed, **Then** system generates updated activity list for affected coach
2. **Given** updated list generated, **When** coach receives it, **Then** list includes timestamp, lessons in order, student names, locations, notes
3. **Given** multiple changes in short time, **When** system consolidates, **Then** coach receives one consolidated list
4. **Given** multiple coaches affected, **When** changes processed, **Then** each coach receives personalized list

---

### Edge Cases

- Double-booking prevention: Prevents second booking in same timeslot
- Late cancellation: Handles cancellation less than 24 hours before lesson
- Unconfirmed group booking: Escalates if no individual confirmation within 24 hours
- Connection loss: Queues messages when coach offline
- Timeslot unavailability: Notifies user and offers alternatives
- Coach unreachable: Retries with backoff, escalates to admin
- System outage: Maintains WhatsApp connection, queues confirmations
- Simultaneous conflicts: Implements timestamp-based resolution

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to initiate booking conversations via WhatsApp with natural language queries
- **FR-002**: System MUST provide available swimming lesson timeslots for next 7 days when requested
- **FR-003**: System MUST confirm and record bookings with student name, coach assignment, date, time, location
- **FR-004**: System MUST send booking confirmations to both student AND assigned coach within 60 seconds
- **FR-005**: System MUST allow users to reschedule existing bookings to alternative available timeslots
- **FR-006**: System MUST allow users to cancel bookings and handle cancellation logic
- **FR-007**: System MUST prevent double-booking (same timeslot cannot exceed max capacity)
- **FR-008**: System MUST detect time/location conflicts for coaches and prevent impossible schedules
- **FR-009**: System MUST answer generic questions from pre-configured knowledge base
- **FR-010**: System MUST send daily morning reminder to coaches listing all lessons for that day
- **FR-011**: System MUST send 30-minute urgent reminder to coaches before each lesson
- **FR-012**: System MUST immediately notify coaches of booking changes with updated schedule
- **FR-013**: System MUST automatically send updated coach activity list after any customer-initiated change
- **FR-014**: System MUST monitor group chats for booking-related intent and auto-route to individual confirmation
- **FR-015**: System MUST maintain audit trail of all booking changes with timestamps
- **FR-016**: System MUST support admin authentication with role-based access control
- **FR-017**: System MUST provide search functionality to find courses by individual student name/ID
- **FR-018**: System MUST provide search functionality to find courses/schedule by coach name
- **FR-019**: System MUST provide search functionality for chat history (individual and group) with filters
- **FR-020**: System MUST store all chat messages with metadata (sender, timestamp, thread type, booking context)
- **FR-021**: System MUST handle WhatsApp message retries on failure
- **FR-022**: System MUST implement intelligent escalation (unanswered questions to coach, critical errors to admin)
- **FR-023**: System MUST support configurable class capacity limits per timeslot
- **FR-024**: System MUST support configurable coach travel time between locations
- **FR-025**: System MUST support configurable cancellation deadlines and fees

### Key Entities

- **Student/User**: Phone, name, contact info, booking history, preferences
- **Booking**: ID, student ref, coach ref, date, time, location, status, timestamps
- **Coach**: Name, WhatsApp contact, locations, schedule, students, notifications
- **Lesson/Class**: Title, duration, level, location, max capacity, price, coach assignment
- **TimeSlot**: Day, start/end time, location, capacity, current bookings, coach
- **ChatMessage**: Sender, phone, text, timestamp, thread type, booking context
- **Admin**: Username, email, phone, role, auth hash, last login, permissions
- **Configuration**: Capacity limits, travel times, cancellation deadlines, reminders, knowledge base, escalation rules

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% booking requests completed within 3 minutes
- **SC-002**: 100% double-booking prevention (zero incidents)
- **SC-003**: Coaches receive daily reminders within 15 min of scheduled time with 99% success
- **SC-004**: Coaches receive 30-minute reminders with 98% success
- **SC-005**: 100% coach notifications within 30 seconds of change
- **SC-006**: 80% of generic questions answered from knowledge base
- **SC-007**: 90% group booking confirmation rate from individuals
- **SC-008**: Admin search results within 2 seconds (95% queries)
- **SC-009**: 100% chat history search accuracy
- **SC-010**: 99.5% system uptime
- **SC-011**: Zero data loss during failures
- **SC-012**: Handles 100+ concurrent WhatsApp conversations
- **SC-013**: 100% conflict detection before creation
- **SC-014**: 60% customer booking adoption in first month
- **SC-015**: 40% reduction in support tickets

## Assumptions

- Users have WhatsApp installed and active phone numbers
- Coaches have WhatsApp Business or regular WhatsApp
- Internet connectivity generally available (messages queued during outages)
- Swimming lessons scheduled in advance (not same-day bookings)
- Class capacity limits are configurable per timeslot
- Coach travel times known and configurable
- Knowledge base Q&A pre-populated and maintained by admin
- Authentication: Username/password for MVP (OAuth in v2)
- Group chat messages forwarded by users (not group API)
- Cancellation policy standardized
- Single or small number of locations
- Restaurant booking system database can be migrated
- System respects quiet hours for reminders
- Chat search keyword-based (not sentiment analysis)
- Coaches don't need external calendar sync

---

## Out of Scope (v2+)

- Payment processing integration
- Multi-language support
- Video chat integration
- Student progress tracking
- Parent notifications
- External calendar sync
- SMS backup channel
- Customer analytics dashboard
