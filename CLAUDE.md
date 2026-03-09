# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PTITDateWeb is a Tinder-style dating web app restricted to PTIT students (email domains `@ptit.edu.vn`, `@stu.ptit.edu.vn`). Monorepo with npm workspaces: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (types).

## Common Commands

```bash
# Infrastructure (MySQL 8.4 + Redis 7)
npm run db:up          # docker compose up -d
npm run db:down        # docker compose down

# Development
npm run dev:api        # NestJS watch mode on port 4000
npm run dev:web        # Next.js dev on port 3000

# Database
cd apps/api && npx prisma migrate dev    # run migrations
cd apps/api && npx prisma generate       # regenerate client

# Testing (API only, Jest 30)
npm run test:api                         # run all API tests
cd apps/api && npx jest                  # run all tests
cd apps/api && npx jest --testPathPattern=auth   # run tests matching "auth"
cd apps/api && npx jest src/auth/auth.service.spec.ts  # run single file

# Lint & Format
npm run lint           # lint all workspaces
cd apps/api && npm run lint -- --fix     # autofix API lint issues
```

## Architecture

### Backend (`apps/api`) — NestJS modular monolith

- **Auth**: OTP (6-digit, 5min TTL, max 5 attempts) and magic link (10min TTL, one-time) flows. Session uses refresh token rotation. Constants in `auth.constants.ts`.
- **Profiles**: CRUD for profile, preferences, photos. Completion gate checks all three sections filled.
- **Uploads**: Local MVP upload with token-based presign flow. Files served from `/uploads/static/:key`.
- **Discovery**: Feed endpoint excludes self and already-swiped users, ordered by recency.
- **Swipes**: LIKE/PASS actions. Mutual LIKE auto-creates a Match record. Prevents self-swipes and duplicates via unique constraint `(actorId, targetId)`.
- **Database**: PrismaService (global module) with MySQL. Schema at `apps/api/prisma/schema.prisma`.
- **Redis**: Used for OTP/magic-link storage. Falls back to in-memory Map if Redis unavailable.

Global ValidationPipe is configured with `whitelist`, `forbidNonWhitelisted`, and `transform`.

### Frontend (`apps/web`) — Next.js 16 App Router

All pages are `"use client"` components. Auth state stored in localStorage. UI text is in Vietnamese.

Page flow: Auth (`/`) → Onboarding (`/onboarding`) → Discovery (`/discovery`). Profile completion is required before discovery access.

### Shared (`packages/shared`)

Exports `AuthMethod` type and `AuthSessionPayload` interface consumed by both apps.

## Data Model

Key entities: User → Profile, Preference, Photo, AuthIdentity, Session, Swipe, Match. See `apps/api/prisma/schema.prisma` for full schema. IDs use CUID. Email is unique on User.

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL` (MySQL), `REDIS_URL`, `API_PORT`, `WEB_URL`.

## Code Conventions

- TypeScript strict mode in both apps
- API: ESLint 9 flat config + Prettier (single quotes, trailing commas)
- Web: Next.js ESLint config with core-web-vitals
- API module resolution: `nodenext` (use `.js` extensions in relative imports if needed)
- Test files: `*.spec.ts` colocated next to source files
- DTOs use `class-validator` decorators with `class-transformer`
