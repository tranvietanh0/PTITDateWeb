# PLAN - PTITDateWeb (MVP)

## 1) Product Scope (Locked)

- Product type: Tinder-style web dating app
- Initial market: PTIT only
- Target users: PTIT students (all years)
- Access control: only `@ptit.edu.vn`
- Monetization phase 1: free only
- Client: Web responsive first
- Auth methods: OTP + Magic Link (email)
- Stack: Next.js + NestJS + MySQL + Redis

---

## 2) MVP Goals

Build a usable MVP in 10-12 weeks with these core capabilities:

1. Authentication with PTIT email only
2. Profile creation and completion
3. Discovery feed + swipe like/pass
4. Match creation on mutual like
5. Realtime chat after match
6. Report/block/unmatch
7. Basic admin moderation panel

Success criteria:
- Users can go from sign-up -> profile -> swipe -> match -> chat without blockers
- Core abuse protections in place (rate limiting, verification, block/report)
- Beta launch to PTIT user group

---

## 3) Technical Architecture

### Frontend
- Next.js (App Router) + TypeScript + Tailwind CSS
- State: Zustand
- Auth handling via secure HTTP-only cookie flow

### Backend
- NestJS modular monolith:
  - `auth`
  - `users`
  - `profiles`
  - `discovery`
  - `swipes`
  - `matches`
  - `chat`
  - `moderation`
  - `admin`

### Data layer
- MySQL for primary relational data
- Redis for:
  - rate limiting
  - OTP/magic-link token cache
  - queue-like transient jobs
  - websocket presence support

### Realtime
- Socket.IO gateway for chat/events

### Storage
- S3-compatible object storage for photos
- Pre-signed upload URLs

### Infra
- Dockerized local environment
- CI for lint/test/build
- staging + production separation

---

## 4) Data Model (v1)

- `users`
  - id, email (`@ptit.edu.vn`), verified_at, status, created_at
- `auth_identities`
  - user_id, method (`otp`, `magic_link`), last_login_at
- `profiles`
  - user_id, display_name, dob, gender, bio, faculty, course_year
- `photos`
  - id, user_id, url, order_index, moderation_status
- `preferences`
  - user_id, min_age, max_age, distance_km, interested_in
- `swipes`
  - actor_id, target_id, action (`like`/`pass`), created_at
- `matches`
  - id, user_a, user_b, matched_at, status
- `conversations`
  - id, match_id, created_at
- `messages`
  - id, conversation_id, sender_id, content, sent_at, seen_at
- `reports`
  - reporter_id, target_id, reason, details, status, created_at
- `blocks`
  - blocker_id, blocked_id, created_at
- `audit_logs`
  - actor_id, action, metadata, created_at

---

## 5) Security & Abuse Controls (Required)

- Strict server-side domain validation (`@ptit.edu.vn`)
- OTP:
  - 6 digits
  - expiry: 5 minutes
  - max attempts: 5
- Magic link:
  - one-time token
  - expiry: 10 minutes
- Rate limiting:
  - per IP + per email
  - resend cooldown
- Session hardening:
  - short-lived access token
  - refresh token rotation
- Moderation:
  - block/report flows available in UI and API
- Audit trails for admin actions

---

## 6) Sprint Plan

## Sprint 1 - Foundation & Auth
Status: `completed`
Duration: Week 1-2
Started: 2026-03-09
Completed: 2026-03-09

Tasks:
- Initialize monorepo structure:
  - `apps/web`
  - `apps/api`
  - `packages/shared` (types/contracts)
- Configure linting/formatting/typescript baseline
- Setup MySQL + Redis docker compose for local dev
- Implement auth APIs:
  - request OTP
  - verify OTP
  - request magic link
  - consume magic link
  - logout/refresh
- Implement PTIT email restriction in backend validation
- Basic web auth screens (responsive):
  - enter email
  - OTP verification
  - magic link fallback
- Add rate limit and resend cooldown
- Add initial DB migrations

Definition of done:
- New user can login with `@ptit.edu.vn` via OTP or magic link
- Non-PTIT domains are blocked server-side
- Basic tests for auth flows pass

Delivered:
- Monorepo scaffold (`apps/web`, `apps/api`, `packages/shared`) with workspace scripts.
- Auth foundation with PTIT-only OTP + magic link + refresh/logout endpoints.
- Redis-backed OTP/magic-link state and Prisma-backed user/session persistence.
- Initial MySQL Prisma migration applied (`init_auth`) and Prisma client generated.

Deviations from initial plan:
- Database target changed from PostgreSQL to MySQL to match local MySQL Workbench workflow.
- Dockerized DB setup deferred; migrated directly against local MySQL instance.

Risks / open issues:
- Runtime integration with live Redis/MySQL still depends on local services running consistently.
- End-to-end API tests against real database are not implemented yet.

## Sprint 2 - Profile & Onboarding
Status: `completed`
Duration: Week 3-4
Completed: 2026-03-09

Tasks:
- Profile creation/edit
- Photo upload flow (pre-signed URL)
- Preferences setup
- Profile completion gate before discovery

Definition of done:
- User cannot access discovery until profile is complete

Current progress:
- Prisma models added for `Profile`, `Preference`, and `Photo`.
- Profile APIs implemented (`GET/PUT profile`, `PUT preferences`, `POST/DELETE photos`).
- Completion status logic added (`isComplete`, section progress, photo count).
- Migration `sprint2_profile_foundation` applied on MySQL.
- Web onboarding screen implemented with profile/preferences/photos integration.
- Discovery access gate added to block users with incomplete profile setup.
- Upload token flow implemented for onboarding photos (`/uploads/presign`, `/uploads/:token`, static file serving).

Delivered:
- Profile onboarding backend (`Profile`, `Preference`, `Photo`) with migration and CRUD endpoints.
- Web onboarding UI connected to backend and profile-completion status calculation.
- Discovery gate page that checks completion before allowing access.
- Local token-based photo upload flow with image file support.
- Integration-style controller tests for profiles and uploads endpoints.

Deviations from plan:
- Pre-signed upload is implemented with local token-based upload endpoint for MVP development.

Risks / open issues:
- Upload files are stored locally (`uploads/`) and need object storage migration before production.
- Discovery gate is client-side and should be reinforced by server-side auth/session guards.

## Sprint 3 - Discovery, Swipe, Match
Status: `in_progress`
Duration: Week 5-6

Tasks:
- Discovery feed query/filter logic
- Swipe APIs (`like`/`pass`)
- Match creation on mutual like
- Basic feed de-duplication

Definition of done:
- Users can swipe and receive matches correctly

Current progress:
- Added Prisma models for `Swipe` and `Match` with migration `sprint3_swipe_match_foundation`.
- Implemented discovery feed endpoint `GET /discovery`.
- Implemented swipe and match endpoints (`POST /swipes`, `GET /matches`).
- Added swipe service tests for self-swipe rejection, non-match like, and mutual-like match creation.
- Connected `/discovery` web UI to real feed, swipe actions, and live match list refresh.
- Added cursor pagination support for discovery feed (`nextCursor`).
- Applied preference-based filtering in discovery (gender + age range).
- Added JWT access-token guard (`Authorization: Bearer`) and removed raw email query/body usage on protected endpoints.
- Updated protected domain services to resolve actor/profile identity by `userId` from JWT payload.

## Sprint 4 - Chat Realtime
Status: `pending`
Duration: Week 7-8

Tasks:
- Conversation/message schema + APIs
- Websocket gateway for message send/receive
- Seen status
- Chat UI (mobile-first responsive)

Definition of done:
- Matched users can exchange messages in realtime reliably

## Sprint 5 - Moderation & Admin
Status: `pending`
Duration: Week 9-10

Tasks:
- Report/block/unmatch APIs
- Admin dashboard basic moderation queue
- User suspend/unsuspend
- Audit logs for moderation actions

Definition of done:
- Reports are actionable by admin; block effect is immediate

## Sprint 6 - Hardening, Beta, Launch
Status: `pending`
Duration: Week 11-12

Tasks:
- Performance pass + API profiling
- Security pass (auth/session/rate-limit review)
- Bug fixes from internal QA
- Closed beta at PTIT
- Launch checklist and production release

Definition of done:
- Stable MVP with monitored beta usage and low blocker rate

---

## 7) KPI Tracking (from first beta)

- Activation rate (profile completion)
- Match rate
- Conversation start rate
- D1 / D7 retention
- Report rate per 1,000 users
- Median report handling time

---

## 8) Plan Update Protocol (Important)

After each sprint completion, update this file with:
1. Sprint status -> `completed`
2. Completion date
3. What was delivered
4. Deviations from plan
5. Risks/open issues
6. Next sprint status -> `in_progress`

Status vocabulary:
- `pending`
- `in_progress`
- `completed`
- `blocked`

---

## 9) Current Execution Log

- 2026-03-09: Sprint 1 started; creating initial monorepo and auth foundation.
- 2026-03-09: Scaffolded `apps/web`, `apps/api`, `packages/shared`, and local Docker services.
- 2026-03-09: Implemented auth API skeleton for PTIT-only OTP + magic link with validation and cooldown.
- 2026-03-09: Replaced default web page with responsive auth flow UI and magic-link callback screen.
- 2026-03-09: Verified current build quality (`lint:web`, `lint:api`, `test:api`, `build:web`, `build:api`) successfully.
- 2026-03-09: Integrated Prisma schema (`User`, `AuthIdentity`, `Session`) and generated Prisma client.
- 2026-03-09: Switched OTP/magic-link temporary state from in-memory to Redis service.
- 2026-03-09: Added persistent session flow in SQL database with refresh rotation and logout endpoints.
- 2026-03-09: Switched database plan from PostgreSQL to MySQL (managed via MySQL Workbench locally).
- 2026-03-09: Deferred Docker DB setup; continue Sprint 1 using local MySQL server + Workbench.
- 2026-03-09: Added backend auth unit tests for OTP, PTIT email validation, refresh, and logout.
- 2026-03-09: Attempted Prisma migration on local MySQL; blocked by invalid local DB credentials (`P1000`).
- 2026-03-09: Updated MySQL credentials, created `ptitdate`, and applied Prisma migration `init_auth` successfully.
- 2026-03-09: Closed Sprint 1 and moved Sprint 2 to `in_progress`.
- 2026-03-09: Implemented Sprint 2 backend foundation (profile/preferences/photos schema + APIs).
- 2026-03-09: Applied migration `sprint2_profile_foundation` and validated API lint/test/build.
- 2026-03-09: Added onboarding web flow (`/onboarding`) connected to profile APIs.
- 2026-03-09: Added completion gate route (`/discovery`) requiring completed onboarding.
- 2026-03-09: Added Redis-service in-memory fallback to keep OTP/magic-link flow testable when local Redis is down.
- 2026-03-09: Expanded PTIT email policy to include `@stu.ptit.edu.vn` across backend and frontend validation.
- 2026-03-09: Implemented local upload-token photo flow and switched onboarding photo input to file upload.
- 2026-03-09: Docker engine returned API error when starting containers; DB migration step remains pending until Docker is healthy.
- 2026-03-09: Added integration tests for `ProfilesController` and `UploadsController` with validation and upload flow assertions.
- 2026-03-09: Sprint 2 completed and Sprint 3 moved to `in_progress`.
- 2026-03-09: Migration blocker note resolved earlier by applying `init_auth` and `sprint2_profile_foundation` on local MySQL.
- 2026-03-09: Applied migration `sprint3_swipe_match_foundation` for `Swipe` and `Match` models.
- 2026-03-09: Added discovery/swipe/match backend APIs with passing lint/test/build checks.
- 2026-03-09: Replaced discovery placeholder UI with actual candidate cards and like/pass actions.
- 2026-03-09: Added discovery cursor pagination and preference-aware feed filtering.
- 2026-03-09: Switched protected routes from `x-user-email` to JWT Bearer access guard.
- 2026-03-09: Refactored profile/discovery/swipe/upload protected logic to use JWT `sub` (`userId`) as source of identity.
