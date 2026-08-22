/**
 * Leave routes — §5 Leave & Allocations, §7.5 Time Off.
 * Handles leave allocations, apply with balance/overlap validation,
 * employee history, admin listing, and approve/reject with Socket.IO push.
 */
import { Router } from 'express';
import { LeaveStatus, LeaveType, NotificationType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { upload } from '../../lib/upload';

const router = Router();

// Helper: count business days between two dates (inclusive)
function countDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count || 1;
}

// ── GET /leave/allocations/me — Own balances ────────────────────────────────
router.get('/allocations/me', requireAuth, async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocations = await prisma.leaveAllocation.findMany({
    where: { userId: req.user!.id, year },
  });
  res.json(allocations);
});

// ── GET /leave/allocations/:userId — Admin: one employee's balances ─────────
router.get('/allocations/:userId', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocations = await prisma.leaveAllocation.findMany({
    where: { userId: String(req.params.userId), year },
  });
  res.json(allocations);
});

// ── PUT /leave/allocations/:userId — Admin: set allocation ──────────────────
router.put('/allocations/:userId', requireAuth, requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const body = z.object({
      leaveType: z.nativeEnum(LeaveType),
      totalDays: z.coerce.number().nonnegative(),
    }).parse(req.body);

    const year = Number(req.query.year) || new Date().getFullYear();
    const userId = String(req.params.userId);

    const allocation = await prisma.leaveAllocation.upsert({
      where: { userId_leaveType_year: { userId, leaveType: body.leaveType, year } },
      update: { totalDays: body.totalDays },
      create: { userId, leaveType: body.leaveType, year, totalDays: body.totalDays, usedDays: 0 },
    });

    res.json(allocation);
  } catch (e) { next(e); }
});

// ── POST /leave — Apply for leave (§7.5) ────────────────────────────────────
router.post('/', requireAuth, upload.single('attachment'), async (req, res, next) => {
  try {
    const body = z.object({
      leaveType: z.nativeEnum(LeaveType),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      remarks: z.string().max(500).optional(),
    }).parse(req.body);

    if (body.endDate < body.startDate) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    // Sick leave requires attachment
    if (body.leaveType === LeaveType.SICK && !req.file) {
      return res.status(400).json({ message: 'A medical certificate is required for sick leave' });
    }

    const days = countDays(body.startDate, body.endDate);

    // Check balance (Unpaid has no cap)
    if (body.leaveType !== LeaveType.UNPAID) {
      const year = body.startDate.getFullYear();
      const allocation = await prisma.leaveAllocation.findUnique({
        where: { userId_leaveType_year: { userId: req.user!.id, leaveType: body.leaveType, year } },
      });
      const available = Number(allocation?.totalDays || 0) - Number(allocation?.usedDays || 0);
      if (days > available) {
        return res.status(400).json({ message: `Insufficient ${body.leaveType.toLowerCase()} leave balance. Available: ${available} days` });
      }
    }

    // Check overlap
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId: req.user!.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: body.endDate },
        endDate: { gte: body.startDate },
      },
    });
    if (overlap) return res.status(409).json({ message: 'This leave overlaps an existing request' });

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: req.user!.id,
        leaveType: body.leaveType,
        startDate: body.startDate,
        endDate: body.endDate,
        days,
        remarks: body.remarks,
        attachmentUrl,
      },
    });

    res.status(201).json(leave);
  } catch (e) { next(e); }
});

// ── GET /leave/me — Own leave history ────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(leaves);
});

// ── GET /leave — Admin: all requests ─────────────────────────────────────────
router.get('/', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const status = req.query.status as LeaveStatus | undefined;
  const where: any = {};
  if (status) where.status = status;

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(leaves);
});

// ── PATCH /leave/:id/decision — Approve/reject ──────────────────────────────
router.patch('/:id/decision', requireAuth, requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
      comment: z.string().max(500).optional(),
    }).parse(req.body);

    if (body.status === LeaveStatus.REJECTED && !body.comment?.trim()) {
      return res.status(400).json({ message: 'A comment is required when rejecting leave' });
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== LeaveStatus.PENDING) {
      return res.status(409).json({ message: 'This request has already been decided' });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: body.status, reviewerId: req.user!.id, reviewerComment: body.comment },
    });

    // Update allocation usedDays on approval
    if (body.status === LeaveStatus.APPROVED) {
      const year = leave.startDate.getFullYear();
      await prisma.leaveAllocation.update({
        where: { userId_leaveType_year: { userId: leave.userId, leaveType: leave.leaveType, year } },
        data: { usedDays: { increment: Number(leave.days) } },
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: leave.userId,
        type: NotificationType.LEAVEUPDATE,
        message: `Your ${leave.leaveType.toLowerCase()} leave request was ${body.status.toLowerCase()}.`,
      },
    });

    // Push via Socket.IO
    req.app.get('io')?.to(`user:${leave.userId}`).emit('leave:updated', updated);

    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
