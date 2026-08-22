/**
 * Company routes — §5 Company endpoints.
 * GET /company returns company name + logo for the top nav.
 * PATCH /company lets Admin update company name or logo.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireOnboarded, requireRole } from '../../middleware/auth';
import { upload } from '../../lib/upload';

const router = Router();
router.use(requireAuth, requireOnboarded);

// ── GET /company ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { company: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user.company.id, name: user.company.name, logoUrl: user.company.logoUrl });
  } catch (e) { next(e); }
});

// ── PATCH /company ───────────────────────────────────────────────────────────
router.patch('/', requireRole(Role.ADMIN), upload.single('logo'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().trim().min(2).max(120).optional(),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const logoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(logoUrl ? { logoUrl } : {}),
      },
    });
    res.json(company);
  } catch (e) { next(e); }
});

export default router;
