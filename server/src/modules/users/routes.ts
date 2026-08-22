/**
 * Users routes — §5 Employees / Profile.
 * Covers employee grid, admin employee creation with auto-generated loginId,
 * profile CRUD with field-level permission checks, skills, certifications, and documents.
 */
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { LeaveStatus, OtpPurpose, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireOnboarded, requireRole } from '../../middleware/auth';
import { upload } from '../../lib/upload';
import { generateLoginId } from '../../lib/loginid';
import { sendEmployeeInvite } from '../../lib/mailer';
import { generateInviteToken, inviteExpiry, issueOtp } from '../../lib/otp';

const router = Router();
router.use(requireAuth, requireOnboarded);
const optionalText = z.string().trim().max(500).optional().nullable();
const today = () => new Date(new Date().toISOString().slice(0, 10));

// Helper: compute today's status for an employee
async function getTodayStatus(userId: string): Promise<string> {
  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today() } },
  });
  if (attendance?.checkIn) return 'PRESENT';

  const onLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: LeaveStatus.APPROVED,
      startDate: { lte: today() },
      endDate: { gte: today() },
    },
  });
  if (onLeave) return 'ON_LEAVE';
  return 'ABSENT';
}

// ── GET /users — Employees grid (Auth) ───────────────────────────────────────
router.get('/', async (req, res) => {
  const q = String(req.query.search || '');
  const page = Math.max(1, Number(req.query.page) || 1);
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const companyId = (await prisma.user.findUnique({ where: { id: req.user!.id }, select: { companyId: true } }))?.companyId;

  const where: any = { companyId };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { loginId: { contains: q, mode: 'insensitive' } },
      { profile: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: { profile: true },
      skip: (page - 1) * take,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Attach today's status to each user
  const itemsWithStatus = await Promise.all(
    items.map(async (user) => ({
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
      fullName: user.profile?.fullName,
      designation: user.profile?.designation,
      department: user.profile?.department,
      profilePicture: user.profile?.profilePictureUrl,
      todayStatus: await getTodayStatus(user.id),
    }))
  );

  res.json({ items: itemsWithStatus, total, page, limit: take });
});

// ── POST /users — Admin create employee (§7.1) ──────────────────────────────
const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+() -]{7,20}$/),
  department: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
  dateOfJoining: z.coerce.date(),
  location: optionalText,
});

router.post('/', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const body = createEmployeeSchema.parse(req.body);

    const existing = await prisma.user.findFirst({ where: { email: body.email } });
    if (existing) return res.status(409).json({ message: 'Email is already registered' });

    // Get company info
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { company: true },
    });
    if (!admin) return res.status(404).json({ message: 'Admin user not found' });

    const loginId = await generateLoginId(prisma, admin.company.name, body.fullName, body.dateOfJoining);

    // Generate a temporary password (8 chars with required number + symbol)
    const tempPassword = `Df@${crypto.randomBytes(3).toString('hex')}1!`;
    const inviteToken = generateInviteToken();

    const user = await prisma.user.create({
      data: {
        companyId: admin.companyId,
        loginId,
        email: body.email,
        phone: body.phone,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        role: Role.EMPLOYEE,
        isEmailVerified: true, // Admin-created employees are pre-verified
        mustChangePassword: true,
        isOtpVerified: false,
        inviteToken,
        inviteExpiresAt: inviteExpiry(),
        profile: {
          create: {
            fullName: body.fullName,
            department: body.department,
            designation: body.designation,
            dateOfJoining: body.dateOfJoining,
            location: body.location || undefined,
          },
        },
      },
      include: { profile: true },
    });

    // Create default leave allocations
    const year = new Date().getFullYear();
    await prisma.leaveAllocation.createMany({
      data: [
        { userId: user.id, leaveType: 'PAID', year, totalDays: 24, usedDays: 0 },
        { userId: user.id, leaveType: 'SICK', year, totalDays: 7, usedDays: 0 },
        { userId: user.id, leaveType: 'UNPAID', year, totalDays: 0, usedDays: 0 },
      ],
    });

    const otp = await issueOtp(user.id, OtpPurpose.INVITE);
    await sendEmployeeInvite({ to: body.email, loginId, tempPassword, otp, inviteToken });

    res.status(201).json({
      id: user.id,
      loginId,
      email: user.email,
      fullName: user.profile?.fullName,
      message: 'Employee created. Invite email sent with login link, credentials, and OTP.',
    });
  } catch (e) { next(e); }
});

// ── GET /users/me — Own full profile ─────────────────────────────────────────
router.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      profile: true,
      company: true,
      skills: true,
      certifications: true,
      documents: true,
      leaveAllocations: { where: { year: new Date().getFullYear() } },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    companyName: user.company.name,
    companyLogo: user.company.logoUrl,
    profile: user.profile,
    skills: user.skills,
    certifications: user.certifications,
    documents: user.documents,
    leaveAllocations: user.leaveAllocations,
  });
});

// ── PATCH /users/me — Edit own employee-editable fields (§4.3) ──────────────
router.patch('/me', upload.single('profilePicture'), async (req, res, next) => {
  try {
    const body = z.object({
      phone: z.string().regex(/^[0-9+() -]{7,20}$/).optional(),
      personalEmail: z.string().email().optional().nullable(),
      residingAddress: z.string().max(500).optional().nullable(),
      dateOfBirth: z.coerce.date().optional().nullable(),
      nationality: z.string().max(100).optional().nullable(),
      gender: z.string().max(50).optional().nullable(),
      maritalStatus: z.string().max(50).optional().nullable(),
      bankAccountNumber: z.string().max(50).optional().nullable(),
      bankName: z.string().max(100).optional().nullable(),
      ifscCode: z.string().max(20).optional().nullable(),
      panNo: z.string().max(20).optional().nullable(),
      uanNo: z.string().max(30).optional().nullable(),
      aboutMe: z.string().max(2000).optional().nullable(),
      whatILoveMyJob: z.string().max(2000).optional().nullable(),
      interestsHobbies: z.string().max(2000).optional().nullable(),
    }).parse(req.body);

    const profilePictureUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Update phone on User model
    if (body.phone) {
      await prisma.user.update({ where: { id: req.user!.id }, data: { phone: body.phone } });
    }

    const { phone, ...profileData } = body;
    const profile = await prisma.employeeProfile.update({
      where: { userId: req.user!.id },
      data: { ...profileData, ...(profilePictureUrl ? { profilePictureUrl } : {}) },
    });

    res.json(profile);
  } catch (e) { next(e); }
});

// ── GET /users/:id — Any employee's profile ─────────────────────────────────
router.get('/:id', async (req, res) => {
  const isAdmin = req.user!.role === Role.ADMIN;
  const user = await prisma.user.findUnique({
    where: { id: String(req.params.id) },
    include: {
      profile: true,
      company: true,
      skills: true,
      certifications: true,
      documents: true,
    },
  });
  if (!user) return res.status(404).json({ message: 'Employee not found' });

  const result: any = {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    phone: user.phone,
    role: user.role,
    companyName: user.company.name,
    profile: user.profile,
    skills: user.skills,
    certifications: user.certifications,
    documents: user.documents,
  };

  // Salary info excluded for non-admin viewers (§7.6)
  if (isAdmin) {
    const salary = await prisma.salaryWage.findUnique({ where: { userId: user.id } });
    const components = await prisma.salaryComponent.findMany({ where: { userId: user.id } });
    const pf = await prisma.pfContribution.findMany({ where: { userId: user.id } });
    const tax = await prisma.taxDeduction.findMany({ where: { userId: user.id } });
    result.salary = { wage: salary, components, pf, tax };
  }

  res.json(result);
});

// ── PATCH /users/:id — Admin edit any field (§4.3) ──────────────────────────
router.patch('/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const body = z.object({
      fullName: z.string().min(2).max(120).optional(),
      department: optionalText,
      designation: optionalText,
      dateOfJoining: z.coerce.date().optional(),
      managerId: z.string().uuid().nullable().optional(),
      location: optionalText,
    }).parse(req.body);

    const profile = await prisma.employeeProfile.update({
      where: { userId: String(req.params.id) },
      data: body,
    });
    res.json(profile);
  } catch (e) { next(e); }
});

// ── POST /users/:id/documents ────────────────────────────────────────────────
router.post('/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (!req.file) return res.status(400).json({ message: 'A file is required' });

    const doc = await prisma.document.create({
      data: {
        userId: id,
        docType: z.string().min(2).max(80).parse(req.body.docType),
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

// ── POST/DELETE /users/:id/skills ────────────────────────────────────────────
router.post('/:id/skills', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const name = z.string().trim().min(1).max(100).parse(req.body.name);
    const skill = await prisma.skill.create({ data: { userId: id, name } });
    res.status(201).json(skill);
  } catch (e) { next(e); }
});

router.delete('/:id/skills/:skillId', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    await prisma.skill.delete({ where: { id: String(req.params.skillId) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ── POST/DELETE /users/:id/certifications ────────────────────────────────────
router.post('/:id/certifications', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    const name = z.string().trim().min(1).max(100).parse(req.body.name);
    const cert = await prisma.certification.create({ data: { userId: id, name } });
    res.status(201).json(cert);
  } catch (e) { next(e); }
});

router.delete('/:id/certifications/:certId', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    await prisma.certification.delete({ where: { id: String(req.params.certId) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
