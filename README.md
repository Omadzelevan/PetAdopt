# PetAdopt

PetAdopt is a full-stack modern animal adoption platform.

- Frontend: React + Vite + Framer Motion + Zustand
- Backend: Node.js + Express + Prisma + SQLite
- Real-time: Socket.IO chat for adoption request rooms
- Deploy target: Netlify (frontend) + Render (API)

## What Is Real Now

The project is no longer mock-only. These are functional end-to-end:

- User registration, login, email verification flow
- JWT auth with protected API routes
- Real pet listing API (create, browse, detail, moderation status)
- Multi-step post flow submits real listings to backend
- Save/unsave pets (persisted)
- Adoption requests (persisted)
- Real-time messaging in dashboard (Socket.IO)
- Report animal flow + admin report moderation
- Admin moderation panel for pet statuses
- Donation records (test provider mode, persisted)
- Notification center (in-app)
- Push subscription endpoint + service worker integration (with VAPID env)

## Architecture

### Frontend

- Path: `src/`
- API base: `VITE_API_URL` (defaults to `/api`)
- Socket base: `VITE_SOCKET_URL` (defaults to API origin)

### Backend

- Path: `server/`
- Entry: `server/src/index.js`
- API base path: `/api`
- Health endpoint: `/api/health`

### Database

- Prisma schema: `prisma/schema.prisma`
- Default local DB: SQLite (`file:./dev.db`)

## Quick Start (Local)

1. Install dependencies:

```bash
npm install
```

2. Copy env and adjust values:

```bash
cp .env.example .env
```

3. Push schema and seed:

```bash
npm run db:push
npm run db:seed
```

4. Run frontend + backend together:

```bash
npm run dev:full
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

## Default Seed Credentials

- Admin: `admin@petadopt.local` / `Admin12345!`
- User: `sofia@example.com` / `User12345!`

## Core Scripts

```bash
npm run dev
npm run server:dev
npm run dev:full
npm run db:push
npm run db:seed
npm run lint
npm run build
npm run check
```

## Environment Variables

See `.env.example`.

Important keys:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `SERVER_PUBLIC_URL`
- `CORS_ORIGINS`
- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_VAPID_PUBLIC_KEY` (optional, for push)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional, backend push)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (optional)

If SMTP is not configured, verification links are printed in server logs.

## Deploy: Netlify + Render

## 1) Deploy API to Render

`render.yaml` is configured for backend service:

- Service: `petadopt-api`
- Runtime: Node
- Build: `npm ci && npm run db:push`
- Start: `npm run server:start`
- Health check: `/api/health`
- Persistent disk mounted at `/var/data`

Steps:

1. Push repo to Git provider.
2. In Render: **New +** -> **Blueprint**.
3. Select repo and apply `render.yaml`.
4. After deploy, note API URL (example: `https://petadopt-api.onrender.com`).

## 2) Deploy Frontend to Netlify

`netlify.toml` is configured for SPA + headers.

Set Netlify env vars:

- `VITE_API_URL=https://YOUR_RENDER_API_DOMAIN/api`
- `VITE_SOCKET_URL=https://YOUR_RENDER_API_DOMAIN`
- `VITE_VAPID_PUBLIC_KEY=...` (if push enabled)

Then deploy via Git integration or CLI.

CLI example:

```bash
npx netlify-cli login
npm run deploy:netlify
```

## Quality and CI

- GitHub Actions workflow: `.github/workflows/ci.yml`
- CI runs lint + build on push/PR

## Notes for Production Hardening

- Donation flow is currently `TEST` provider in backend. Connect Stripe/PayPal for live payments.
- SQLite is supported and configured with Render disk, but Postgres is recommended for larger scale.
- Add domain-specific CORS values in Render env (`CORS_ORIGINS`).

