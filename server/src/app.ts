/**
 * Dayflow REST API — modular Express app.
 * All business logic lives in src/modules/; this file wires middleware and mounts routers.
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { notFound, errors } from './middleware/errors';

import authRoutes from './modules/auth/routes';
import companyRoutes from './modules/company/routes';
import userRoutes from './modules/users/routes';
import attendanceRoutes from './modules/attendance/routes';
import leaveRoutes from './modules/leave/routes';
import payrollRoutes from './modules/payroll/routes';
import notificationRoutes from './modules/notifications/routes';

const app = express();

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin === process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate-limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

// ── Mount route modules ──────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errors);

export default app;
