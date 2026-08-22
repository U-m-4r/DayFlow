# ⚡ Dayflow — Modern Local-First HR Management System

> *"Every workday, perfectly aligned."*

**Dayflow** is a modern, high-performance, local-first HR management workspace tailored for agile teams and growing organizations. It unifies **employee onboarding, live presence tracking, time-off workflow, salary structure design, and real-time notifications** into an ambient glassmorphism UI with zero external cloud dependencies.

For detailed architecture, data models, and API specifications, please refer to the [Final Build Plan](Final_Plan.md).

---

## 🏆 Project Overview & Highlights

* 🏢 **Centralized Team Hub**: Interactive directory with dynamic status indicators, multi-department filtering, and live workforce KPI metrics.
* ⏱️ **Frictionless Attendance Tracking**: Real-time Check-In / Check-Out widget with elapsed workday counter and monthly summary bento strip.
* 🌴 **End-to-End Time Off Workflow**: Full 12-month year calendar, balance quotas (Paid, Sick, Unpaid), document attachments, and instant Socket.IO push updates.
* 💼 **Configurable Payroll & Salary Structure**: Server-computed CTC breakdown (Basic, HRA, Allowances, PF, Tax) with automatic remainder balancing.
* 🔔 **In-App Notification Center**: Instant alerts on leave approvals, attendance milestones, and administrative updates.
* 🛡️ **Role-Based Security & Permissions**: Field-level access control for Admin vs. Employee, JWT token rotation, and first-time forced password resets.
* 🤖 **AI Assistant (Gemini)**: Built-in context-aware chatbot support widget accessible on all authenticated pages.
* 🧹 **Admin Controls**: Robust employee lifecycle management including cascade deletion of profiles and associated records.
* ✨ **Modern SaaS Aesthetics**: Ambient glassmorphism, responsive bento grids, and Framer Motion micro-interactions.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, REST API, Socket.IO |
| **Database & ORM** | PostgreSQL (Dockerized), Prisma ORM |
| **Authentication** | JWT (Access & Refresh tokens), bcrypt password hashing, Zod validation |
| **Local Services** | MailHog (SMTP testing), Multer (Local file & avatar uploads) |

---

## 🚀 Key Features Walkthrough

### 1. 👥 Directory & Real-Time KPI Bento Grid
* **Live Metric Cards**: Instant count of Total Employees, Today's Present headcount (with pulsing status indicator), On-Leave count, and Active Teams.
* **Interactive Filters**: Instant search by Name, Email, or Login ID + Department pills + Status badges (*All, Present, On Leave, Absent*).
* **Smart Employee Cards**: Surface elevation with teal border glow, designation chips, and quick contact tags.

### 2. 🔐 Authentication & Onboarding
* **Company Registration**: Fast workspace setup with company logo upload.
* **System-Generated Login IDs**: Pattern-based unique identifiers (`{CompanyCode}{Name}{Year}{Serial}`).
* **Secure First Login**: Admin-created employees receive temporary credentials; forced password change on first sign-in.
* **Email Verification**: Built-in verification loop powered locally via MailHog.

### 3. 🕒 Attendance & Time Tracking
* **Global Nav Widget**: Check in/out from any page with live elapsed workday timer.
* **Employee Month View**: Bento summary (Days Present, Leaves, Total Hours) + day-wise history with extra hours calculations.
* **Admin Date Inspector**: Company-wide daily presence roster with date picker.

### 4. 📅 Time Off & 12-Month Calendar
* **Balance Strip**: Clear visibility into available vs. total quota for Paid, Sick, and Unpaid leaves.
* **Full-Year Calendar**: Interactive 12-month grid with color-coded day pills (Paid, Sick, Unpaid) and hover details.
* **Admin Queue**: Inline approval / rejection modal with required reason comment.
* **Real-time Push**: Approved/rejected decisions reflect instantly on the employee screen via Socket.IO without page reloads.

### 5. 💰 Salary Structure & Payroll Engine (Admin)
* **Wage Configuration**: Monthly wage, annual gross CTC calculation, working days, and break duration.
* **Configurable Components**: Percentage or fixed amounts based on Wage or Basic (Basic, HRA, Standard Allowance, Performance Bonus, LTA).
* **Auto-Balancing**: `Fixed Allowance` dynamically balances remaining CTC.
* **PF & Tax Deductions**: Employer/Employee PF percentage splits and customizable tax rules.

---

## 💻 Local Setup Guide

### Prerequisites
* **Node.js 20+**
* **Docker Desktop** (for running local PostgreSQL & MailHog)

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment
```powershell
Copy-Item server\.env.example server\.env
```
*(Optionally verify `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` inside `server/.env`)*

### Step 3: Start Local Infrastructure
```powershell
docker compose up -d
```

### Step 4: Run Migrations & Seed Sample Data
```powershell
npm run db:migrate
npm run db:seed
```

### Step 5: Start Application
```powershell
npm run dev
```

---

## 🌐 Application URLs & Test Credentials

| Service | URL |
|---|---|
| **Web Application** | [http://localhost:5173](http://localhost:5173) |
| **REST API Health** | [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) |
| **MailHog Local Inbox** | [http://localhost:8025](http://localhost:8025) |

### 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin / HR Manager** | `admin@dayflow.local` | `Welcome@123` |
| **Employee (Design)** | `employee1@dayflow.local` | `Welcome@123` |
| **Employee (Engineering)** | `employee2@dayflow.local` | `Welcome@123` |
| **Employee (Marketing)** | `employee3@dayflow.local` | `Welcome@123` |
| **Employee (Backend)** | `employee4@dayflow.local` | `Welcome@123` |

---

## 📂 Project Structure

```
DayFlow/
├── client/                     # Frontend (React 18 + Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx             # Application routes, views & dashboard
│   │   ├── api.ts              # Axios instance & interceptors
│   │   ├── auth.tsx            # Auth context provider & hooks
│   │   ├── components/
│   │   │   ├── ui.tsx          # Shared glassmorphism UI primitives
│   │   │   └── motion.tsx      # Framer Motion page & stagger wrappers
│   │   └── styles.css          # Design system tokens & animations
│   └── tailwind.config.ts      # Custom Tailwind theme configuration
├── server/                     # Backend (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Relational database schema
│   │   ├── migrations/         # Committed database migrations
│   │   └── seed.ts             # Demo seed script (Company, Users, Salaries)
│   └── src/
│       ├── app.ts              # Express middleware & router mounting
│       ├── server.ts           # HTTP + Socket.IO server listener
│       └── modules/            # Modular domain route handlers
│           ├── auth/           # Authentication & token rotation
│           ├── users/          # Employee directory & profile CRUD
│           ├── attendance/     # Check-in/out & work hour computations
│           ├── leave/          # Leave quota, requests & decisions
│           ├── payroll/        # Salary wage & component calculations
│           └── notifications/  # In-app notification endpoints
└── docker-compose.yml          # Container configuration for Postgres & MailHog
```

---

## 🔒 Verification & Quality Checks

```powershell
# Run TypeScript compilation check
npm run lint

# Run backend test suite
npm test
```

---

## 📄 License
This project is built for demonstration and hackathon submission under the **MIT License**.
