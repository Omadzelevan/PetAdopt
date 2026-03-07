# PetAdopt

PetAdopt is a full-stack modern animal adoption platform.

- Frontend: React + Vite + Framer Motion + Zustand
- Backend: Node.js + Express + Prisma + MongoDB Atlas
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
- Default database: MongoDB Atlas (`mongodb+srv://...`)

## Quick Start (Local)

1. Install dependencies:

```bash
npm install
```

2. Copy env and adjust values:

```bash
cp .env.example .env
```

3. Provision MongoDB and set `DATABASE_URL` in `.env`.

Atlas note: Prisma MongoDB requires a replica set. MongoDB Atlas clusters provide this by default.

4. Push schema and seed:

```bash
npm run db:push
npm run db:seed
```

5. Run frontend + backend together:

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

Production templates:

- `.env.render.example` for Render backend env vars
- `.env.netlify.example` for Netlify frontend env vars

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

## Deploy: Netlify + Render + MongoDB Atlas

## 1) Create MongoDB Atlas Database

1. Create an Atlas project and cluster.
2. Create a database user.
3. In Network Access, allow Render IPs or use `0.0.0.0/0` during initial setup.
4. Copy the SRV connection string and set database name, for example:

```bash
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/petadopt?retryWrites=true&w=majority&appName=PetAdopt
```

5. Use that value as `DATABASE_URL` locally and in Render.
6. If your local `.env` still points to old SQLite, replace it before running Prisma commands.

## 2) Deploy API to Render

`render.yaml` is configured for backend service:

- Service: `petadopt-api`
- Runtime: Node
- Build: `npm ci`
- Start: `npm run server:start`
- Health check: `/api/health`

Steps:

1. Push repo to Git provider.
2. In Render: **New +** -> **Blueprint**.
3. Select repo and apply `render.yaml`.
4. Set required env vars in Render:

- `DATABASE_URL` = Atlas connection string
- `SERVER_PUBLIC_URL` = your Render API URL
- `CLIENT_URL` = your Netlify app URL
- `CORS_ORIGINS` = comma-separated frontend origins
- `JWT_SECRET` = generated automatically by blueprint
- `SMTP_*` and `VAPID_*` = optional but recommended for production features

5. After deploy, open `/api/health`.
6. Push the Prisma schema manually after `DATABASE_URL` is verified and Atlas network access is open:

```bash
npm run db:push
```

7. Seed production data once if needed:

```bash
npm run db:seed
```

## 3) Deploy Frontend to Netlify

`netlify.toml` is configured for SPA routing + security headers.

Set Netlify env vars:

- `VITE_API_URL=https://YOUR_RENDER_API_DOMAIN/api`
- `VITE_SOCKET_URL=https://YOUR_RENDER_API_DOMAIN`
- `VITE_VAPID_PUBLIC_KEY=...` (if push enabled)

Then deploy via Git integration or CLI. The frontend talks directly to Render through these env vars, so no hardcoded proxy rewrite is required.

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
- Use a strong Atlas password and restrict network access after initial deploy.
- Add domain-specific CORS values in Render env (`CORS_ORIGINS`).
