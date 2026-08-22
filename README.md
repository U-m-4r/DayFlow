# Dayflow

Dayflow is a local-first HR management system for employee profiles, attendance, leave approval, and salary visibility. It uses a React/Vite client, Express REST API, Prisma/PostgreSQL, Socket.IO for leave updates, local uploads, and MailHog for development email.

## What is implemented

- JWT access/refresh authentication, verification-email flow, bcrypt password hashing, role guards, and rate-limited auth endpoints.
- Prisma data model for users, employee profiles, documents, attendance, leave, salary structures, and notifications.
- Profile field-level permissions, restricted local file uploads, attendance check-in/out and admin correction routes, leave overlap and decision validation, payroll API, notifications, and Socket.IO leave decision events.
- Responsive React UI with authenticated routes for dashboard, profile, attendance, leave, payroll, and the HR employee directory. It is driven exclusively by the API, with TanStack Query caching.
- Shared Tailwind design tokens, layered surfaces, Framer Motion route/list/status interactions, and global reduced-motion support.

## Local setup

1. Copy `server/.env.example` to `server/.env` and replace the JWT development secrets.
2. Start Docker Desktop (ensure its Linux engine is running), then start local services: `docker compose up -d`.
3. Install dependencies: `npm install`.
4. Apply the committed initial migration and seed demo records:

```powershell
npm run db:migrate
npm run db:seed
```

5. Run both applications: `npm run dev`.

The client is at `http://localhost:5173`, API health is at `http://localhost:4000/api/v1/health`, and MailHog is at `http://localhost:8025`.

Seed credentials: `admin@dayflow.local` or `employee1@dayflow.local` with password `Welcome@123`.

## Checks

```powershell
npm run lint
npm run build
npm test
```

`npm run lint`, `npm run build`, and `npm test` pass in the repository. Docker is not installed in this execution environment, so applying the initial migration and seeding should be run after Docker is installed locally.

## Notes for the next developer

- The database schema is the source of record at `server/prisma/schema.prisma`; do not edit a database schema by hand. Commit generated Prisma migrations after running `db:migrate`.
- Uploads are intentionally stored under `server/uploads/` and ignored by Git. Photos accept JPEG/PNG; employee documents accept PDF; both are capped at 5 MB.
- Current payroll admin API writes salary-history rows (audit-by/effective date). The minimal UI exposes employee read-only salary and HR listing; richer HR editors and report screens remain the next sensible UI increment.
- Verification email is sent through MailHog during development. In production, set normal SMTP values in `server/.env`.
