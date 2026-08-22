/**
 * Auth routes — §5 Company & Auth, §7.1 Authentication & Employee Onboarding.
 * Handles company signup, email verification, signin (loginId or email),
 * token refresh, logout, and password change with mustChangePassword flow.
 */
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { sendVerification } from '../../lib/mailer';
import { signAccess, signRefresh, verifyRefresh } from '../../lib/tokens';
import { requireAuth } from '../../middleware/auth';
import { upload } from '../../lib/upload';
import { generateLoginId } from '../../lib/loginid';

const router = Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/\d/, 'Password needs at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one symbol');

function makeTokens(user: { id: string; role: Role; email: string }) {
  return { accessToken: signAccess(user), refreshToken: signRefresh(user) };
}

// ── POST /auth/signup — Company registration (§7.1) ─────────────────────────
const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+() -]{7,20}$/),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

router.post('/signup', upload.single('logo'), async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { email: body.email } });
    if (existing) return res.status(409).json({ message: 'Email is already registered' });

    const logoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Create company
    const company = await prisma.company.create({
      data: { name: body.companyName, logoUrl },
    });

    // Generate login ID for the first admin
    const dateOfJoining = new Date();
    const loginId = await generateLoginId(prisma, body.companyName, body.fullName, dateOfJoining);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create the first ADMIN user
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        loginId,
        email: body.email,
        phone: body.phone,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: Role.ADMIN,
        verificationToken,
        verificationExpiresAt: new Date(Date.now() + 86400000),
        profile: {
          create: {
            fullName: body.fullName,
            department: 'People Operations',
            designation: 'HR Officer',
            dateOfJoining,
          },
        },
      },
    });

    // Create default leave allocations for the current year
    const year = new Date().getFullYear();
    await prisma.leaveAllocation.createMany({
      data: [
        { userId: user.id, leaveType: 'PAID', year, totalDays: 24, usedDays: 0 },
        { userId: user.id, leaveType: 'SICK', year, totalDays: 7, usedDays: 0 },
        { userId: user.id, leaveType: 'UNPAID', year, totalDays: 0, usedDays: 0 },
      ],
    });

    await sendVerification(user.email, verificationToken);

    res.status(201).json({
      message: 'Company registered. Check your email to verify your account.',
      loginId,
    });
  } catch (e) { next(e); }
});

// ── GET /auth/verify-email ───────────────────────────────────────────────────
router.get('/verify-email', async (req, res, next) => {
  try {
    const token = z.string().min(1).parse(req.query.token);
    const user = await prisma.user.findFirst({
      where: { verificationToken: token, verificationExpiresAt: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ message: 'Verification link is invalid or expired' });

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verificationToken: null, verificationExpiresAt: null },
    });
    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (e) { next(e); }
});

// ── POST /auth/signin — Login ID or Email + Password (§7.1) ────────────────
const signinSchema = z.object({
  identifier: z.string().min(1, 'Login ID or email is required'),
  password: z.string().min(1),
});

router.post('/signin', async (req, res, next) => {
  try {
    const body = signinSchema.parse(req.body);

    // Find user by email or loginId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.identifier },
          { loginId: body.identifier },
        ],
      },
      include: { profile: true, company: true },
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Incorrect login credentials' });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before signing in' });
    }

    const t = makeTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: t.refreshToken } });

    res.json({
      ...t,
      user: {
        id: user.id,
        email: user.email,
        loginId: user.loginId,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        fullName: user.profile?.fullName,
        companyName: user.company.name,
        companyLogo: user.company.logoUrl,
        profilePicture: user.profile?.profilePictureUrl,
      },
    });
  } catch (e) { next(e); }
});

// ── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const rt = z.string().min(1).parse(req.body.refreshToken);
    const decoded = verifyRefresh(rt);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== rt) {
      return res.status(401).json({ message: 'Refresh token is invalid' });
    }
    const t = makeTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: t.refreshToken } });
    res.json(t);
  } catch (e) { next(e); }
});

// ── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user!.id }, data: { refreshToken: null } });
  res.status(204).end();
});

// ── PATCH /auth/change-password ──────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

router.patch('/change-password', requireAuth, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If not a forced first change, require current password
    if (!user.mustChangePassword) {
      if (!body.currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(body.newPassword, 12),
        mustChangePassword: false,
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (e) { next(e); }
});

export default router;
