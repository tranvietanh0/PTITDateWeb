# PTITDateWeb

PTIT-only dating web MVP (Tinder-style) built with Next.js + NestJS.

## Monorepo Structure

- `apps/web`: Next.js frontend
- `apps/api`: NestJS backend
- `packages/shared`: shared types/contracts
- `PLAN.md`: delivery plan and sprint tracking

## Quick Start

1. Install dependencies per app:
   - `cd apps/web && npm install`
   - `cd apps/api && npm install`
2. Start local data services:
   - `docker compose up -d`
3. Prepare API env and Prisma:
   - `copy apps/api/.env.example apps/api/.env` (Windows)
   - If using MySQL Workbench (without Docker DB), create database `ptitdate` in your local MySQL server first.
    - `cd apps/api && npm run prisma:generate`
    - `cd apps/api && npm run prisma:migrate:dev -- --name init_auth`
4. Run backend:
   - `npm run dev:api`
5. Run frontend in a new terminal:
   - `npm run dev:web`

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- MySQL: `localhost:3306`

## Sprint 1 Scope

- PTIT email-only auth (`@ptit.edu.vn`)
- OTP request + verify
- Magic link request + verify
- Refresh + logout endpoints
- Basic responsive auth UI

## Sprint 2 (In Progress)

Profile foundation APIs:

- `GET /profiles?email=...`
- `PUT /profiles`
- `PUT /profiles/preferences`
- `POST /profiles/photos`
- `DELETE /profiles/photos/:photoId?email=...`
- `POST /uploads/presign`
- `POST /uploads/:token`
- `GET /uploads/static/:key`
