/**
 * Payroll routes — §5 Payroll (Admin-only), §7.6.
 * Normalized salary model: SalaryWage → SalaryComponents → PF → Tax.
 * Server-side auto-calculation with the ≤-wage validation rule.
 * Fixed Allowance is always the remainder (wage - sum(other components)).
 */
import { Router } from 'express';
import { BasisOf, ComponentName, ComputationType, PfPayer, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireOnboarded, requireRole } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireOnboarded, requireRole(Role.ADMIN));

// ── GET /payroll/:userId — Full salary object ───────────────────────────────
router.get('/:userId', async (req, res) => {
  const userId = String(req.params.userId);
  const wage = await prisma.salaryWage.findUnique({ where: { userId } });
  const components = await prisma.salaryComponent.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  const pf = await prisma.pfContribution.findMany({ where: { userId } });
  const tax = await prisma.taxDeduction.findMany({ where: { userId } });

  res.json({ wage, components, pf, tax });
});

// ── PUT /payroll/:userId/wage — Set month wage / working days / break time ──
router.put('/:userId/wage', async (req, res, next) => {
  try {
    const body = z.object({
      monthWage: z.coerce.number().positive(),
      workingDaysPerWeek: z.coerce.number().int().min(1).max(7).default(5),
      breakTimeMinutes: z.coerce.number().int().min(0).max(240).default(60),
      effectiveFrom: z.coerce.date(),
    }).parse(req.body);

    const userId = String(req.params.userId);
    const yearlyWage = body.monthWage * 12;

    const wage = await prisma.salaryWage.upsert({
      where: { userId },
      update: {
        monthWage: body.monthWage,
        yearlyWage,
        workingDaysPerWeek: body.workingDaysPerWeek,
        breakTimeMinutes: body.breakTimeMinutes,
        effectiveFrom: body.effectiveFrom,
        updatedBy: req.user!.id,
      },
      create: {
        userId,
        monthWage: body.monthWage,
        yearlyWage,
        workingDaysPerWeek: body.workingDaysPerWeek,
        breakTimeMinutes: body.breakTimeMinutes,
        effectiveFrom: body.effectiveFrom,
        updatedBy: req.user!.id,
      },
    });

    // Recalculate all existing components against new wage
    await recalculateComponents(userId, body.monthWage);

    res.json(wage);
  } catch (e) { next(e); }
});

// Helper: recalculate component amounts when wage changes
async function recalculateComponents(userId: string, monthWage: number) {
  const components = await prisma.salaryComponent.findMany({ where: { userId } });

  // First pass: find BASIC amount (needed for BASIC-based percentages)
  let basicAmount = 0;
  for (const c of components) {
    if (c.name === ComponentName.BASIC) {
      if (c.computationType === ComputationType.PERCENTAGE) {
        const basis = c.basisOf === BasisOf.WAGE ? monthWage : 0;
        basicAmount = Math.round((basis * Number(c.value) / 100) * 100) / 100;
      } else {
        basicAmount = Number(c.value);
      }
    }
  }

  // Second pass: compute all components
  let nonFixedTotal = 0;
  for (const c of components) {
    if (c.name === ComponentName.FIXED_ALLOWANCE) continue;

    let computed: number;
    if (c.computationType === ComputationType.PERCENTAGE) {
      const basis = c.basisOf === BasisOf.WAGE ? monthWage : basicAmount;
      computed = Math.round((basis * Number(c.value) / 100) * 100) / 100;
    } else {
      computed = Number(c.value);
    }

    nonFixedTotal += computed;
    await prisma.salaryComponent.update({ where: { id: c.id }, data: { computedAmount: computed } });
  }

  // FIXED_ALLOWANCE is always the remainder
  const fixedAllowance = components.find(c => c.name === ComponentName.FIXED_ALLOWANCE);
  if (fixedAllowance) {
    const remainder = Math.max(0, Math.round((monthWage - nonFixedTotal) * 100) / 100);
    await prisma.salaryComponent.update({ where: { id: fixedAllowance.id }, data: { computedAmount: remainder, value: remainder } });
  }

  // Recalculate PF (based on Basic)
  const pfContribs = await prisma.pfContribution.findMany({ where: { userId } });
  for (const pf of pfContribs) {
    const computed = Math.round((basicAmount * Number(pf.ratePercent) / 100) * 100) / 100;
    await prisma.pfContribution.update({ where: { id: pf.id }, data: { computedAmount: computed } });
  }
}

// ── PUT /payroll/:userId/components — Set component list ────────────────────
const componentSchema = z.object({
  name: z.nativeEnum(ComponentName),
  computationType: z.nativeEnum(ComputationType),
  basisOf: z.nativeEnum(BasisOf).default('WAGE'),
  value: z.coerce.number().nonnegative(),
  description: z.string().max(500).optional().nullable(),
});

router.put('/:userId/components', async (req, res, next) => {
  try {
    const body = z.array(componentSchema).parse(req.body);
    const userId = String(req.params.userId);

    const wage = await prisma.salaryWage.findUnique({ where: { userId } });
    if (!wage) return res.status(400).json({ message: 'Set the month wage first' });
    const monthWage = Number(wage.monthWage);

    // Compute amounts and validate total ≤ wage
    let basicAmount = 0;
    const basicComp = body.find(c => c.name === ComponentName.BASIC);
    if (basicComp) {
      if (basicComp.computationType === ComputationType.PERCENTAGE) {
        const basis = basicComp.basisOf === BasisOf.WAGE ? monthWage : 0;
        basicAmount = Math.round((basis * basicComp.value / 100) * 100) / 100;
      } else {
        basicAmount = basicComp.value;
      }
    }

    let total = 0;
    const computedComponents = body.map(c => {
      if (c.name === ComponentName.FIXED_ALLOWANCE) return { ...c, computedAmount: 0 };
      let computed: number;
      if (c.computationType === ComputationType.PERCENTAGE) {
        const basis = c.basisOf === BasisOf.WAGE ? monthWage : basicAmount;
        computed = Math.round((basis * c.value / 100) * 100) / 100;
      } else {
        computed = c.value;
      }
      total += computed;
      return { ...c, computedAmount: computed };
    });

    if (total > monthWage) {
      return res.status(400).json({ message: `Component total (₹${total}) exceeds month wage (₹${monthWage})` });
    }

    // Set Fixed Allowance to remainder
    const fixedIdx = computedComponents.findIndex(c => c.name === ComponentName.FIXED_ALLOWANCE);
    if (fixedIdx >= 0) {
      const remainder = Math.round((monthWage - total) * 100) / 100;
      computedComponents[fixedIdx].computedAmount = remainder;
      computedComponents[fixedIdx].value = remainder;
    }

    // Replace all components
    await prisma.salaryComponent.deleteMany({ where: { userId } });
    await prisma.salaryComponent.createMany({
      data: computedComponents.map(c => ({
        userId,
        name: c.name,
        computationType: c.computationType,
        basisOf: c.basisOf,
        value: c.value,
        computedAmount: c.computedAmount,
        description: c.description,
      })),
    });

    const result = await prisma.salaryComponent.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    res.json(result);
  } catch (e) { next(e); }
});

// ── PUT /payroll/:userId/pf — Set PF contribution rates ─────────────────────
router.put('/:userId/pf', async (req, res, next) => {
  try {
    const body = z.array(z.object({
      payer: z.nativeEnum(PfPayer),
      ratePercent: z.coerce.number().nonnegative().max(100),
    })).parse(req.body);

    const userId = String(req.params.userId);

    // Get basic salary for PF computation
    const basicComp = await prisma.salaryComponent.findFirst({
      where: { userId, name: ComponentName.BASIC },
    });
    const basicAmount = basicComp ? Number(basicComp.computedAmount) : 0;

    await prisma.pfContribution.deleteMany({ where: { userId } });
    await prisma.pfContribution.createMany({
      data: body.map(p => ({
        userId,
        payer: p.payer,
        ratePercent: p.ratePercent,
        computedAmount: Math.round((basicAmount * p.ratePercent / 100) * 100) / 100,
      })),
    });

    const result = await prisma.pfContribution.findMany({ where: { userId } });
    res.json(result);
  } catch (e) { next(e); }
});

// ── PUT /payroll/:userId/tax — Set tax deductions ───────────────────────────
router.put('/:userId/tax', async (req, res, next) => {
  try {
    const body = z.array(z.object({
      name: z.string().trim().min(1).max(100),
      amount: z.coerce.number().nonnegative(),
    })).parse(req.body);

    const userId = String(req.params.userId);

    await prisma.taxDeduction.deleteMany({ where: { userId } });
    await prisma.taxDeduction.createMany({
      data: body.map(t => ({ userId, name: t.name, amount: t.amount })),
    });

    const result = await prisma.taxDeduction.findMany({ where: { userId } });
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
