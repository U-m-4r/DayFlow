# Dayflow

Dayflow is a local-first HR management system for employee profiles, attendance, leave approval, and salary visibility. It uses a React/Vite client, Express REST API, Prisma/PostgreSQL, Socket.IO for leave updates, local uploads, and MailHog for development email.

## Current status

The core Dayflow MVP is in place and working locally with the following feature set completed:

- Authentication and authorization with JWT, refresh flow, email verification, role guards, and secure password handling
- Employee and admin profile management with field-level permissions and document uploads
- Daily attendance check-in/check-out logic with admin override support and attendance history views
- Leave application and approval workflows with overlap validation and immediate real-time status updates
- Payroll salary structure APIs and employee-facing salary visibility
- Role-based dashboards for employees and HR/admin users
- Shared Tailwind design system and API-driven frontend structure for a responsive experience

The project is structured to continue with the remaining polish and scale-up work: richer reports, notification flows, additional UX refinements, and broader test coverage.

## What is implemented

- JWT access/refresh authentication, verification-email flow, bcrypt password hashing, role guards, and rate-limited auth endpoints.
- Prisma data model for users, employee profiles, documents, attendance, leave, salary structures, and notifications.
- Profile field-level permissions, restricted local file uploads, attendance check-in/out and admin correction routes, leave overlap and decision validation, payroll API, notifications, and Socket.IO leave decision events.
- Responsive React UI with authenticated routes for dashboard, profile, attendance, leave, payroll, and the HR employee directory. It is driven exclusively by the API, with TanStack Query caching.
- Shared Tailwind design tokens, layered surfaces, Framer Motion route/list/status interactions, and global reduced-motion support.

## Local setup

1. Install Node.js 20 or newer and Docker Desktop. PostgreSQL does not need to be installed separately; Docker runs it for this project.
2. From the repository root, install dependencies:

```powershell
cd C:\Users\<your-user>\Desktop\DayFlow
npm install
```

3. Create `server/.env` from the example file:

```powershell
Copy-Item server\.env.example server\.env
```

Replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `server/.env` with two different long random values.

4. Start Docker Desktop, then start PostgreSQL and MailHog:

```powershell
docker compose up -d
```

5. Apply the committed initial migration and seed demo records:

```powershell
npm run db:migrate
npm run db:seed
```

6. Run both applications:

```powershell
npm run dev
```

Leave this terminal running while using the application. Stop it with `Ctrl+C` before starting it again. Starting a second copy causes `EADDRINUSE` errors because ports 4000 and 5173 are already occupied.

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
ya so done
