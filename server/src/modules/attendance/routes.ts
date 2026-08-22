/**
 * Attendance routes — §5 Attendance, §7.4.
 * Check-in/out with server-computed work/extra hours, monthly queries,
 * admin all-employees-for-a-day view, and admin override.
 */
import { Router } from 'express';
import { AttendanceStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireOnboarded, requireRole } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireOnboarded);
const today = () => new Date(new Date().toISOString().slice(0, 10));

// Helper: compute work and extra hours from check-in/out
async function computeHours(userId: string, checkIn: Date, checkOut: Date) {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = diffMs / 60000;

  // Get employee's salary config for break time and working hours
  const wage = await prisma.salaryWage.findUnique({ where: { userId } });
  const breakMinutes = wage?.breakTimeMinutes ?? 60;
  const workingDaysPerWeek = wage?.workingDaysPerWeek ?? 5;

  // Standard working hours per day = 8hrs for 5-day week, proportional otherwise
  const standardHoursPerDay = 40 / workingDaysPerWeek;
  const netMinutes = Math.max(0, totalMinutes - breakMinutes);
  const workHours = Math.round((netMinutes / 60) * 100) / 100;
  const extraHours = Math.max(0, Math.round((workHours - standardHoursPerDay) * 100) / 100);

  return { workHours, extraHours };
}

// ── POST /attendance/check-in ────────────────────────────────────────────────
router.post('/check-in', async (req, res) => {
  const rec = await prisma.attendance.findUnique({
    where: { userId_date: { userId: req.user!.id, date: today() } },
  });
  if (rec) return res.status(409).json({ message: 'You have already checked in today' });

  res.status(201).json(
    await prisma.attendance.create({
      data: { userId: req.user!.id, date: today(), checkIn: new Date(), status: AttendanceStatus.PRESENT },
    })
  );
});

// ── POST /attendance/check-out ───────────────────────────────────────────────
router.post('/check-out', async (req, res) => {
  const rec = await prisma.attendance.findUnique({
    where: { userId_date: { userId: req.user!.id, date: today() } },
  });
  if (!rec?.checkIn) return res.status(400).json({ message: 'Check in before checking out' });
  if (rec.checkOut) return res.status(409).json({ message: 'You have already checked out today' });

  const checkOut = new Date();
  const { workHours, extraHours } = await computeHours(req.user!.id, rec.checkIn, checkOut);

  res.json(
    await prisma.attendance.update({
      where: { id: rec.id },
      data: { checkOut, workHours, extraHours },
    })
  );
});

// ── GET /attendance/me?month= — Own monthly attendance ──────────────────────
router.get('/me', async (req, res) => {
  const monthStr = String(req.query.month || '');
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  if (monthStr) {
    const [y, m] = monthStr.split('-').map(Number);
    if (y && m) { year = y; month = m - 1; }
  }

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0); // last day of month

  const records = await prisma.attendance.findMany({
    where: { userId: req.user!.id, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  });

  // Summary
  const daysPresent = records.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.HALFDAY).length;
  const leavesCount = records.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const totalHours = records.reduce((sum, r) => sum + Number(r.workHours || 0), 0);

  res.json({
    records,
    summary: {
      daysPresent,
      leavesCount,
      totalWorkingHours: Math.round(totalHours * 100) / 100,
    },
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
  });
});

// ── GET /attendance/:userId?month= — Admin: any employee ────────────────────
router.get('/:userId', requireRole(Role.ADMIN), async (req, res) => {
  const userId = String(req.params.userId);
  const monthStr = String(req.query.month || '');
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (monthStr) {
    const [y, m] = monthStr.split('-').map(Number);
    if (y && m) { year = y; month = m - 1; }
  }

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);

  const records = await prisma.attendance.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  });

  const daysPresent = records.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.HALFDAY).length;
  const leavesCount = records.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const totalHours = records.reduce((sum, r) => sum + Number(r.workHours || 0), 0);

  res.json({
    records,
    summary: { daysPresent, leavesCount, totalWorkingHours: Math.round(totalHours * 100) / 100 },
  });
});

// ── GET /attendance?date= — Admin: all employees for a day ──────────────────
router.get('/', requireRole(Role.ADMIN), async (req, res) => {
  const d = req.query.date ? new Date(String(req.query.date)) : today();
  const records = await prisma.attendance.findMany({
    where: { date: d },
    include: { user: { include: { profile: true } } },
  });
  res.json(records);
});

// ── PATCH /attendance/:id — Admin override ──────────────────────────────────
router.patch('/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const b = z.object({
      status: z.nativeEnum(AttendanceStatus),
      note: z.string().trim().max(500).optional().nullable(),
    }).parse(req.body);

    res.json(await prisma.attendance.update({ where: { id: String(req.params.id) }, data: b }));
  } catch (e) { next(e); }
});

export default router;
