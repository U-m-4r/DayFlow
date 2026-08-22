/**
 * Notifications routes — §5 Notifications (Phase 2 functionality now wired).
 * GET /notifications — own list (ordered newest-first, max 50).
 * PATCH /notifications/:id/read — mark a single notification as read.
 * PATCH /notifications/read-all — mark all as read (convenience endpoint).
 */
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// ── GET /notifications — Own notifications ───────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

// ── PATCH /notifications/read-all — Mark all as read ────────────────────────
router.patch('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read' });
});

// ── PATCH /notifications/:id/read — Mark one as read ────────────────────────
router.patch('/:id/read', requireAuth, async (req, res) => {
  const notif = await prisma.notification.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!notif || notif.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { isRead: true },
  });
  res.json(updated);
});

export default router;
