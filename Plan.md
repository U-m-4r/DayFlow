``markdown

# Dayflow — HR Management System — Build Plan

> "Every workday, perfectly aligned."
> This document is the single source of truth for building Dayflow. Follow it phase by phase. Do not skip validation, error handling, or tests to save time — those are explicit requirements, not optional polish.

## Ground Rules for the Coding Agent

- No static JSON as the real data source. A local seed script may create initial dummy rows in a real database, but every screen must read/write through the API — never hardcode arrays in the frontend as "data."
- Everything is local-first. Run Postgres, file storage, and mail in Docker/local processes. Nothing should require a paid cloud service to run end-to-end on a laptop with no internet.
- Explain before you generate. When scaffolding a non-trivial file, add a short comment block at the top explaining what the code does and why — this is a project requirement, not a nicety.
- Commit incrementally. One logical change per commit, conventional commit messages (see §12). Don't dump the whole app in one commit.
- Validate everything a human can type. Every form field needs client-side + server-side validation. Never trust the frontend alone.
- Keep the stack boring on purpose. REST over GraphQL, a relational DB over trendy NoSQL, no microservices. Simplicity is a feature here, not a compromise.

## Project Overview

Dayflow is a Human Resource Management System (HRMS) covering:

- Secure authentication (Sign Up / Sign In, email verification, roles)
- Role-based dashboards (Employee vs Admin/HR)
- Employee profile management
- Attendance tracking (check-in/out, daily/weekly views)
- Leave & time-off management with approval workflow
- Payroll/salary visibility (read-only for employees, editable for admin)
- (Phase 2 / future) Email & in-app notifications, analytics & reports (salary slips, attendance reports)

Two roles only: Admin/HR Officer and Employee.

## Tech Stack & Rationale

| Layer                 | Choice                                                                                  | Why                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend              | React + TypeScript (Vite)                                                               | Fast dev loop, typed, no framework lock-in overhead                                                                                         |
| Styling               | Tailwind CSS                                                                            | Enforces a consistent design system fast, responsive utilities built in                                                                     |
| Routing               | React Router v6                                                                         | Standard, no reason to reach for anything fancier                                                                                           |
| Data fetching / cache | TanStack Query (React Query)                                                            | Gives you "real-time-feeling" UI (auto-refetch, cache invalidation) without needing a full real-time stack everywhere                       |
| Real-time updates     | Socket.IO (backend + client)                                                            | Used specifically where the brief demands live behavior: leave-approval status reflecting immediately, notification badges                  |
| Backend               | Node.js + Express + TypeScript                                                          | Simple REST API, easy for an agent to scaffold predictably                                                                                  |
| ORM                   | Prisma                                                                                  | Type-safe schema, migrations, works great with Postgres, easy seed scripts                                                                  |
| Database              | PostgreSQL (run via Docker Compose locally)                                             | Relational data (users, attendance, leave, payroll) fits relational modeling far better than NoSQL — this is a deliberate anti-trend choice |
| Auth                  | JWT (access + refresh tokens) + bcrypt                                                  | Stateless, simple, well understood                                                                                                          |
| Email                 | Nodemailer + MailHog (local SMTP catcher) for dev; swap to real SMTP creds in prod .env | Keeps verification emails testable fully offline                                                                                            |
| File storage          | Local disk via Multer, path stored in DB                                                | Avoids depending on any cloud storage provider — satisfies "don't rely entirely on cloud-based tools"                                       |
| Testing               | Vitest/Jest + React Testing Library (frontend), Jest + Supertest (backend)              | Standard, well-documented                                                                                                                   |
| Version control       | Git, GitHub/GitLab, feature branches, PRs                                               | Required by brief — one person is not allowed to "own" the repo alone                                                                       |

Explicitly avoided: GraphQL, microservices, NoSQL for core entities, third-party auth-as-a-service, cloud-only file storage, CSS-in-JS. None of these add value here — they'd only add trendy complexity to a domain (HR data) that maps cleanly onto relational tables and a monolithic REST API.

## System Architecture

```mermaid
flowchart LR
    subgraph Client["React + TS (Vite)"]
        UI[Pages / Components]
        RQ[React Query cache]
        WS[Socket.IO client]
    end

    subgraph Server["Node.js + Express API"]
        Auth[Auth Module]
        API[REST Controllers]
        SIO[Socket.IO server]
        Mail[Mailer]
    end

    DB[(PostgreSQL via Prisma)]
    FS[(Local File Storage)]
    SMTP[(MailHog / SMTP)]

    UI --> RQ --> API
    UI <---> WS <---> SIO
    API --> DB
    API --> FS
    Auth --> DB
    Mail --> SMTP
    SIO --> DB
```

Everything runs locally via docker-compose up (Postgres + MailHog) plus npm run dev for API and client. No external dependency is required to demo the full system offline.

## Data Model

### 4.1 users

| Field                 | Type                  | Notes              |
| --------------------- | --------------------- | ------------------ |
| id                    | UUID (PK)             |                    |
| employeeid            | string, unique        | e.g. DF-0001       |
| email                 | string, unique        | verified via token |
| passwordhash          | string                | bcrypt             |
| role                  | enum(ADMIN, EMPLOYEE) |                    |
| isemailverified       | boolean               | default false      |
| createdat / updatedat | timestamp             |                    |

### 4.2 employeeprofiles

| Field             | Type                        | Notes                |
| ----------------- | --------------------------- | -------------------- |
| id                | UUID (PK)                   |                      |
| userid            | UUID (FK → users)           | 1:1                  |
| fullname          | string                      |                      |
| phone             | string                      | editable by employee |
| address           | string                      | editable by employee |
| profilepictureurl | string                      | local file path      |
| department        | string                      | admin-only edit      |
| designation       | string                      | admin-only edit      |
| dateofjoining     | date                        | admin-only edit      |
| managerid         | UUID (FK → users, nullable) | admin-only edit      |

### 4.3 documents

| Field      | Type      | Notes                       |
| ---------- | --------- | --------------------------- |
| id         | UUID (PK) |                             |
| userid     | UUID (FK) |                             |
| doctype    | string    | e.g. "ID Proof", "Contract" |
| fileurl    | string    | local storage path          |
| uploadedat | timestamp |                             |

### 4.4 attendance

| Field    | Type                               | Notes                      |
| -------- | ---------------------------------- | -------------------------- |
| id       | UUID (PK)                          |                            |
| userid   | UUID (FK)                          |                            |
| date     | date                               |                            |
| checkin  | timestamp, nullable                |                            |
| checkout | timestamp, nullable                |                            |
| status   | enum(PRESENT,ABSENT,HALFDAY,LEAVE) |                            |
| note     | string, nullable                   | e.g. admin override reason |

Unique constraint: (userid, date).

### 4.5 leaverequests

| Field                 | Type                            | Notes           |
| --------------------- | ------------------------------- | --------------- |
| id                    | UUID (PK)                       |                 |
| userid                | UUID (FK)                       | requester       |
| leavetype             | enum(PAID,SICK,UNPAID)          |                 |
| startdate / enddate   | date                            |                 |
| remarks               | string, nullable                | from employee   |
| status                | enum(PENDING,APPROVED,REJECTED) | default PENDING |
| reviewerid            | UUID (FK → users), nullable     | admin who acted |
| reviewercomment       | string, nullable                |                 |
| createdat / updatedat | timestamp                       |                 |

### 4.6 salarystructures

| Field         | Type              | Notes                 |
| ------------- | ----------------- | --------------------- |
| id            | UUID (PK)         |                       |
| userid        | UUID (FK)         |                       |
| basesalary    | decimal           |                       |
| allowances    | decimal           |                       |
| deductions    | decimal           |                       |
| effectivefrom | date              |                       |
| updatedby     | UUID (FK → users) | admin who last edited |

### 4.7 notifications (Phase 2)

| Field     | Type                                      | Notes         |
| --------- | ----------------------------------------- | ------------- |
| id        | UUID (PK)                                 |               |
| userid    | UUID (FK)                                 | recipient     |
| message   | string                                    |               |
| type      | enum(LEAVEUPDATE,ATTENDANCEALERT,GENERAL) |               |
| isread    | boolean                                   | default false |
| createdat | timestamp                                 |               |

```mermaid
erDiagram
    USERS ||--|| EMPLOYEEPROFILES : has
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ ATTENDANCE : logs
    USERS ||--o{ LEAVEREQUESTS : submits
    USERS ||--o{ SALARYSTRUCTURES : has
    USERS ||--o{ NOTIFICATIONS : receives
    USERS }o--o{ LEAVEREQUESTS : reviews
```

## API Specification

All routes prefixed /api/v1. All protected routes require Authorization: Bearer <token>. Admin-only routes additionally check role === ADMIN in middleware.

### Auth

| Method | Route                     | Access | Description                       |
| ------ | ------------------------- | ------ | --------------------------------- |
| POST   | /auth/signup              | Public | employeeid, email, password, role |
| GET    | /auth/verify-email?token= | Public | verifies email via emailed token  |
| POST   | /auth/signin              | Public | returns access + refresh token    |
| POST   | /auth/refresh             | Public | rotates access token              |
| POST   | /auth/logout              | Auth   | invalidates refresh token         |

### Profile

| Method | Route                | Access     | Description                                |
| ------ | -------------------- | ---------- | ------------------------------------------ |
| GET    | /users/me            | Auth       | full profile of logged-in user             |
| PATCH  | /users/me            | Auth       | edit own phone/address/profile picture     |
| GET    | /users               | Admin      | list all employees (paginated, searchable) |
| GET    | /users/:id           | Admin      | full profile of any employee               |
| PATCH  | /users/:id           | Admin      | edit any field including job details       |
| POST   | /users/:id/documents | Admin/Self | upload document                            |

### Attendance

| Method | Route                      | Access          | Description                   |
| ------ | -------------------------- | --------------- | ----------------------------- | -------------- |
| POST   | /attendance/check-in       | Auth (Employee) | creates today's record        |
| POST   | /attendance/check-out      | Auth (Employee) | updates today's record        |
| GET    | /attendance/me?range=week  | month           | Auth                          | own attendance |
| GET    | /attendance/:userId?range= | Admin           | any employee's attendance     |
| GET    | /attendance?date=          | Admin           | all employees for a given day |
| PATCH  | /attendance/:id            | Admin           | override status manually      |

### Leave

| Method | Route               | Access          | Description                              |
| ------ | ------------------- | --------------- | ---------------------------------------- |
| POST   | /leave              | Auth (Employee) | apply for leave                          |
| GET    | /leave/me           | Auth            | own leave history                        |
| GET    | /leave              | Admin           | all leave requests, filterable by status |
| PATCH  | /leave/:id/decision | Admin           | approve/reject + comment                 |

### Payroll

| Method | Route            | Access | Description                     |
| ------ | ---------------- | ------ | ------------------------------- |
| GET    | /payroll/me      | Auth   | own salary structure, read-only |
| GET    | /payroll         | Admin  | all salary structures           |
| GET    | /payroll/:userId | Admin  | one employee's salary           |
| PUT    | /payroll/:userId | Admin  | create/update salary structure  |

### Notifications (Phase 2)

| Method | Route                   | Access | Description       |
| ------ | ----------------------- | ------ | ----------------- |
| GET    | /notifications          | Auth   | own notifications |
| PATCH  | /notifications/:id/read | Auth   | mark as read      |

### Reports (Phase 2)

| Method | Route                               | Access     | Description                     |
| ------ | ----------------------------------- | ---------- | ------------------------------- |
| GET    | /reports/attendance-summary?month=  | Admin      | aggregated attendance stats     |
| GET    | /reports/salary-slip/:userId?month= | Admin/Self | generates a salary slip payload |

## Repository Structure

```text
dayflow/
├── docker-compose.yml           # postgres + mailhog
├── plan.md
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   └── notifications/
│   │   ├── middleware/           # auth guard, role guard, error handler, validators
│   │   ├── sockets/
│   │   ├── lib/                  # prisma client, mailer, file storage helpers
│   │   └── app.ts / server.ts
│   ├── tests/
│   └── package.json
└── client/
    ├── src/
    │   ├── pages/
    │   │   ├── auth/ (SignIn, SignUp, VerifyEmail)
    │   │   ├── dashboard/ (EmployeeDashboard, AdminDashboard)
    │   │   ├── profile/
    │   │   ├── attendance/
    │   │   ├── leave/
    │   │   └── payroll/
    │   ├── components/
    │   │   ├── ui/               # Button, Input, Card, Badge, Modal, Table
    │   │   └── layout/            # Sidebar, Topbar, MobileNav
    │   ├── hooks/                 # useAuth, useAttendance, useLeave, etc.
    │   ├── api/                   # axios instance + typed API calls
    │   ├── context/               # AuthContext
    │   └── App.tsx / main.tsx
    └── package.json
```

## Feature Modules — Detailed Behavior

### 7.1 Authentication

- Sign Up: fields — Employee ID, Email, Password, Role (Employee/HR). Password policy: min 8 chars, at least one number and one symbol. On submit, send verification email (via MailHog locally) with a signed, time-limited token.
- Email verification: unverified users can sign up but cannot sign in until verified; show a clear "check your email" screen.
- Sign In: email + password. Wrong credentials → inline error, no vague "something went wrong." Successful login → JWT stored (httpOnly cookie or memory + refresh flow) → redirect to role-appropriate dashboard.

### 7.2 Dashboards

- Employee Dashboard: cards for Profile, Attendance, Leave Requests, Logout; a "recent activity" feed (last leave decision, last check-in, unread notification count via Socket.IO badge).
- Admin Dashboard: employee list (searchable/sortable table), attendance overview (today's present/absent counts), pending leave approvals count, and the ability to click into any employee's record ("switch between employees").

### 7.3 Profile Management

- View: personal details, job details, salary structure (read-only here too), documents, profile picture.
- Employee edit: phone, address, profile picture only — enforce this at the API layer, not just by hiding fields in the UI.
- Admin edit: every field, including department/designation/date of joining/manager.

### 7.4 Attendance

- Check-in/check-out buttons for employees, disabled once already checked in/out for the day.
- Daily and weekly views (toggle), calendar-style or table-style list with color-coded status badges (Present/Absent/Half-day/Leave).
- Employees see only their own records; Admin can view any employee's and can manually correct a status (e.g., forgot to check in).

### 7.5 Leave & Time-Off

- Apply form: leave type (Paid/Sick/Unpaid), date range picker, remarks (optional). Validate: end date ≥ start date, no overlapping pending/approved requests for the same user.
- Status lifecycle: Pending → Approved/Rejected. Once decided, employee's dashboard updates immediately (Socket.IO push + React Query cache invalidation) — this satisfies "changes reflect immediately."
- Admin view: table of all requests, filter by status/employee, approve/reject with a required comment on rejection.

### 7.6 Payroll

- Employee: read-only salary structure view (base, allowances, deductions, net total computed client-side from server values — never let the client edit these fields).
- Admin: full CRUD on salary structures, with an audit trail (updatedby, effectivefrom) so changes are traceable.

### 7.7 Notifications & Reports (Phase 2 / Future Enhancements)

- In-app notification bell + optional email alert on leave decisions and attendance anomalies (e.g., 3 consecutive absences).
- Reports dashboard: attendance summary per month, downloadable-style salary slip view per employee (rendered in-app; PDF export can be a stretch goal using a library like pdfkit on the server if time allows).

## UI/UX Guidelines

Color palette (consistent across the whole app — define once in tailwind.config.js as design tokens):

| Token         | Hex                | Use                                |
| ------------- | ------------------ | ---------------------------------- |
| primary       | #0F766E (teal-700) | primary buttons, active nav, links |
| primary-light | #2DD4BF (teal-400) | accents, highlights, hover states  |
| ink           | #1E293B            | body text                          |
| background    | #F8FAFC            | page background                    |
| surface       | #FFFFFF            | cards, modals                      |
| success       | #16A34A            | Approved / Present                 |
| warning       | #D97706            | Pending / Half-day                 |
| danger        | #DC2626            | Rejected / Absent                  |
| muted         | #94A3B8            | secondary text, disabled states    |

- Layout: persistent left sidebar on desktop (Dashboard, Profile, Attendance, Leave, Payroll, Logout), collapsing to a bottom nav or hamburger drawer under 768px.
- Responsiveness breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px. Every page must be usable at all three — test manually, don't just assume Tailwind defaults handle it.
- Components to build once, reuse everywhere: Button, Input (with built-in error state), Select, DatePicker, Card, StatusBadge, Table, Modal, Toast. Do not restyle buttons ad hoc per page.
- Feedback: every async action (submit, approve, check-in) shows a loading state and a success/error toast. No silent failures.

## Validation Rules (client + server, both required)

| Field            | Rule                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| Email            | valid format, uniqueness checked server-side                                     |
| Password         | ≥8 chars, 1 number, 1 symbol                                                     |
| Employee ID      | required, unique                                                                 |
| Leave date range | end ≥ start, no overlap with existing pending/approved leave                     |
| Check-in/out     | can't check out before checking in; can't double check-in same day               |
| Phone            | numeric, length-checked per locale                                               |
| Salary fields    | non-negative decimals only, admin-only write access                              |
| File uploads     | type restricted (jpg/png for photos, pdf for documents), size-capped (e.g., 5MB) |

## Non-Functional Requirements

- Security: bcrypt password hashing, JWT with short-lived access tokens + refresh rotation, role checks on every protected route (never trust a hidden UI element as access control), rate-limit auth endpoints.
- Performance: paginate all list endpoints (employee list, attendance, leave requests); index userid and date columns.
- Offline/local-first compliance: the entire stack (DB, mail, file storage) must run via Docker Compose + npm scripts with zero required external cloud accounts. Document this clearly in README.md.
- Data integrity: use Prisma migrations, never edit the DB schema by hand once migrations exist.
- Accessibility: semantic HTML, labeled form inputs, sufficient color contrast (verify status badge colors against WCAG AA).

## Build Phases (work through these in order)

### Phase 0 — Scaffolding

- Init monorepo folders (client/, server/), Docker Compose for Postgres + MailHog.
- Set up Prisma schema from §4, run first migration, write seed script with a handful of dummy users (1 admin, 4–5 employees) for local testing only.
- Set up Express app skeleton with error-handling middleware and health-check route.
- Set up React app with Tailwind, routing shell, and the reusable UI component library.

### Phase 1 — Authentication

- Backend: signup, email verification, signin, refresh, logout; JWT middleware; role guard middleware.
- Frontend: Sign Up, Sign In, Verify Email pages; AuthContext; protected route wrapper.
- Tests: password validation, duplicate email/employee ID rejection, wrong-password error path.

### Phase 2 — Profiles

- Backend: profile CRUD with field-level permission checks (employee vs admin).
- Frontend: View Profile page, Edit Profile form (scoped fields per role), file upload for profile picture/documents.

### Phase 3 — Attendance

- Backend: check-in/check-out, daily/weekly queries, admin override.
- Frontend: check-in/out widget, daily/weekly toggle view, admin all-employee attendance table.

### Phase 4 — Leave Management

- Backend: apply, list, approve/reject with comment, overlap validation.
- Frontend: apply-for-leave form, employee leave history with status badges, admin approval queue.
- Wire Socket.IO so a decision pushes an instant update to the employee's dashboard.

### Phase 5 — Payroll

- Backend: read-only employee endpoint, admin CRUD with audit fields.
- Frontend: employee read-only salary view, admin editable salary structure form.

### Phase 6 — Dashboards & Polish

- Build out Employee and Admin dashboards pulling from all modules above (recent activity, pending approvals count, quick-access cards).
- Full responsive pass across all pages; empty states, loading states, error states everywhere.

### Phase 7 — Testing & Hardening

- Backend integration tests per module (Supertest).
- Frontend component/interaction tests for auth, leave apply, attendance check-in.
- Manual QA pass against every rule in §9.

### Phase 8 — Future Enhancements (only after 0–7 are solid)

- In-app + email notifications on leave decisions and attendance anomalies.
- Analytics/reports dashboard: attendance summary, salary slip view.

## Git Workflow

- Branch naming: feature/leave-approval, fix/attendance-overlap-bug.
- Conventional commits: feat:, fix:, chore:, test:, docs:.
- One PR per phase-item, not one PR per phase. Small, reviewable diffs.
- No direct commits to main; require at least a self-review checklist before merge (does it match this plan's spec for that module?).

## Definition of Done (per module)

A module is done when:

- [ ] API routes match §5 exactly (method, path, access control)
- [ ] All validation rules from §9 relevant to it are enforced server-side
- [ ] Frontend has loading/error/empty states
- [ ] Responsive at mobile/tablet/desktop
- [ ] At least one automated test covers the happy path and one failure path
- [ ] No hardcoded/static data remains in the frontend for this module

  7.3 Profile Management
  • View: personal details, job details, salary structure (read-only here too), documents, profile picture.
  • Employee edit: phone, address, profile picture only — enforce this at the API layer, not just by hiding fields in the UI.
  • Admin edit: every field, including department/designation/date of joining/manager.

  7.4 Attendance
  • Check-in/check-out buttons for employees, disabled once already checked in/out for the day.
  • Daily and weekly views (toggle), calendar-style or table-style list with color-coded status badges (Present/Absent/Half-day/Leave).
  • Employees see only their own records; Admin can view any employee's and can manually correct a status (e.g., forgot to check in).

  7.5 Leave & Time-Off
  • Apply form: leave type (Paid/Sick/Unpaid), date range picker, remarks (optional). Validate: end date ≥ start date, no overlapping pending/approved requests for the same user.
  • Status lifecycle: Pending → Approved/Rejected. Once decided, employee's dashboard updates immediately (Socket.IO push + React Query cache invalidation) — this satisfies "changes reflect immediately."
  • Admin view: table of all requests, filter by status/employee, approve/reject with a required comment on rejection.

  7.6 Payroll
  • Employee: read-only salary structure view (base, allowances, deductions, net total computed client-side from server values — never let the client edit these fields).
  • Admin: full CRUD on salary structures, with an audit trail (updatedby, effectivefrom) so changes are traceable.

  7.7 Notifications & Reports (Phase 2 / Future Enhancements)
  • In-app notification bell + optional email alert on leave decisions and attendance anomalies (e.g., 3 consecutive absences).
  • Reports dashboard: attendance summary per month, downloadable-style salary slip view per employee (rendered in-app; PDF export can be a stretch goal using a library like pdfkit on the server if time allows).

UI/UX Guidelines

Color palette (consistent across the whole app — define once in tailwind.config.js as design tokens):

| Token         | Hex                | Use                                |
| ------------- | ------------------ | ---------------------------------- |
| primary       | #0F766E (teal-700) | primary buttons, active nav, links |
| primary-light | #2DD4BF (teal-400) | accents, highlights, hover states  |
| ink           | #1E293B            | body text                          |
| background    | #F8FAFC            | page background                    |
| surface       | #FFFFFF            | cards, modals                      |
| success       | #16A34A            | Approved / Present                 |
| warning       | #D97706            | Pending / Half-day                 |
| danger        | #DC2626            | Rejected / Absent                  |
| muted         | #94A3B8            | secondary text, disabled states    |

• Layout: persistent left sidebar on desktop (Dashboard, Profile, Attendance, Leave, Payroll, Logout), collapsing to a bottom nav or hamburger drawer under 768px.
• Responsiveness breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px. Every page must be usable at all three — test manually, don't just assume Tailwind defaults handle it.
• Components to build once, reuse everywhere: Button, Input (with built-in error state), Select, DatePicker, Card, StatusBadge, Table, Modal, Toast. Do not restyle buttons ad hoc per page.
• Feedback: every async action (submit, approve, check-in) shows a loading state and a success/error toast. No silent failures.

Validation Rules (client + server, both required)

| Field            | Rule                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| Email            | valid format, uniqueness checked server-side                                     |
| Password         | ≥8 chars, 1 number, 1 symbol                                                     |
| Employee ID      | required, unique                                                                 |
| Leave date range | end ≥ start, no overlap with existing pending/approved leave                     |
| Check-in/out     | can't check out before checking in; can't double check-in same day               |
| Phone            | numeric, length-checked per locale                                               |
| Salary fields    | non-negative decimals only, admin-only write access                              |
| File uploads     | type restricted (jpg/png for photos, pdf for documents), size-capped (e.g., 5MB) |

Non-Functional Requirements
• Security: bcrypt password hashing, JWT with short-lived access tokens + refresh rotation, role checks on every protected route (never trust a hidden UI element as access control), rate-limit auth endpoints.
• Performance: paginate all list endpoints (employee list, attendance, leave requests); index userid and date columns.
• Offline/local-first compliance: the entire stack (DB, mail, file storage) must run via Docker Compose + npm scripts with zero required external cloud accounts. Document this clearly in README.md.
• Data integrity: use Prisma migrations, never edit the DB schema by hand once migrations exist.
• Accessibility: semantic HTML, labeled form inputs, sufficient color contrast (verify status badge colors against WCAG AA).

Build Phases (work through these in order)
Phase 0 — Scaffolding
• Init monorepo folders (client/, server/), Docker Compose for Postgres + MailHog.
• Set up Prisma schema from §4, run first migration, write seed script with a handful of dummy users (1 admin, 4–5 employees) for local testing only.
• Set up Express app skeleton with error-handling middleware and health-check route.
• Set up React app with Tailwind, routing shell, and the reusable UI component library.

Phase 1 — Authentication
• Backend: signup, email verification, signin, refresh, logout; JWT middleware; role guard middleware.
• Frontend: Sign Up, Sign In, Verify Email pages; AuthContext; protected route wrapper.
• Tests: password validation, duplicate email/employee ID rejection, wrong-password error path.

Phase 2 — Profiles
• Backend: profile CRUD with field-level permission checks (employee vs admin).
• Frontend: View Profile page, Edit Profile form (scoped fields per role), file upload for profile picture/documents.

Phase 3 — Attendance
• Backend: check-in/check-out, daily/weekly queries, admin override.
• Frontend: check-in/out widget, daily/weekly toggle view, admin all-employee attendance table.

Phase 4 — Leave Management
• Backend: apply, list, approve/reject with comment, overlap validation.
• Frontend: apply-for-leave form, employee leave history with status badges, admin approval queue.
• Wire Socket.IO so a decision pushes an instant update to the employee's dashboard.

Phase 5 — Payroll
• Backend: read-only employee endpoint, admin CRUD with audit fields.
• Frontend: employee read-only salary view, admin editable salary structure form.

Phase 6 — Dashboards & Polish
• Build out Employee and Admin dashboards pulling from all modules above (recent activity, pending approvals count, quick-access cards).
• Full responsive pass across all pages; empty states, loading states, error states everywhere.

Phase 7 — Testing & Hardening
• Backend integration tests per module (Supertest).
• Frontend component/interaction tests for auth, leave apply, attendance check-in.
• Manual QA pass against every rule in §9.

Phase 8 — Future Enhancements (only after 0–7 are solid)
• In-app + email notifications on leave decisions and attendance anomalies.
• Analytics/reports dashboard: attendance summary, salary slip view.

Git Workflow
• Branch naming: feature/leave-approval, fix/attendance-overlap-bug.
• Conventional commits: feat:, fix:, chore:, test:, docs:.
• One PR per phase-item, not one PR per phase. Small, reviewable diffs.
• No direct commits to main; require at least a self-review checklist before merge (does it match this plan's spec for that module?).

Definition of Done (per module)

A module is done when:

• [ ] API routes match §5 exactly (method, path, access control)
• [ ] All validation rules from §9 relevant to it are enforced server-side
• [ ] Frontend has loading/error/empty states
• [ ] Responsive at mobile/tablet/desktop
• [ ] At least one automated test covers the happy path and one failure path
• [ ] No hardcoded/static data remains in the frontend for this module
`
