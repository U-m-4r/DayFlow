/**
 * Seed script — creates a demo company with 1 admin + 4 employees.
 * All accounts are pre-verified so the app is usable immediately.
 * Includes default leave allocations and sample salary data.
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, Role, LeaveType, ComponentName, ComputationType, BasisOf, PfPayer } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Welcome@123', 12);
  const year = new Date().getFullYear();

  // Create company
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Orbit Innovations',
    },
  });

  const people = [
    { loginId: 'OIAVMO20240001', email: 'admin@dayflow.local', role: Role.ADMIN, name: 'Avery Morgan', dept: 'People Operations', title: 'HR Officer' },
    { loginId: 'OIMISH20240001', email: 'employee1@dayflow.local', role: Role.EMPLOYEE, name: 'Mina Shah', dept: 'Product', title: 'UX Designer' },
    { loginId: 'OINOCH20240001', email: 'employee2@dayflow.local', role: Role.EMPLOYEE, name: 'Noah Chen', dept: 'Engineering', title: 'Software Engineer' },
    { loginId: 'OIIRPA20240001', email: 'employee3@dayflow.local', role: Role.EMPLOYEE, name: 'Iris Patel', dept: 'Marketing', title: 'Content Lead' },
    { loginId: 'OILEMA20240001', email: 'employee4@dayflow.local', role: Role.EMPLOYEE, name: 'Leo Martin', dept: 'Engineering', title: 'Backend Engineer' },
  ];

  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        companyId: company.id,
        loginId: person.loginId,
        email: person.email,
        phone: '+1 555-0100',
        passwordHash,
        role: person.role,
        isEmailVerified: true,
        profile: {
          create: {
            fullName: person.name,
            department: person.dept,
            designation: person.title,
            dateOfJoining: new Date('2024-01-15'),
            location: 'San Francisco, CA',
          },
        },
      },
    });

    // Default leave allocations
    for (const leaveType of [LeaveType.PAID, LeaveType.SICK, LeaveType.UNPAID]) {
      const total = leaveType === 'PAID' ? 24 : leaveType === 'SICK' ? 7 : 0;
      await prisma.leaveAllocation.upsert({
        where: { userId_leaveType_year: { userId: user.id, leaveType, year } },
        update: {},
        create: { userId: user.id, leaveType, year, totalDays: total, usedDays: 0 },
      });
    }

    // Sample salary for employees
    if (person.role === Role.EMPLOYEE) {
      const monthWage = 75000;
      await prisma.salaryWage.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          monthWage,
          yearlyWage: monthWage * 12,
          workingDaysPerWeek: 5,
          breakTimeMinutes: 60,
          effectiveFrom: new Date('2024-01-15'),
          updatedBy: user.id,
        },
      });

      // Basic at 40% of wage
      const basicAmount = monthWage * 0.4;
      const components = [
        { name: ComponentName.BASIC, computationType: ComputationType.PERCENTAGE, basisOf: BasisOf.WAGE, value: 40, computedAmount: basicAmount },
        { name: ComponentName.HRA, computationType: ComputationType.PERCENTAGE, basisOf: BasisOf.BASIC, value: 50, computedAmount: basicAmount * 0.5 },
        { name: ComponentName.STANDARD_ALLOWANCE, computationType: ComputationType.FIXED, basisOf: BasisOf.WAGE, value: 5000, computedAmount: 5000 },
        { name: ComponentName.PERFORMANCE_BONUS, computationType: ComputationType.PERCENTAGE, basisOf: BasisOf.WAGE, value: 5, computedAmount: monthWage * 0.05 },
        { name: ComponentName.LTA, computationType: ComputationType.FIXED, basisOf: BasisOf.WAGE, value: 3000, computedAmount: 3000 },
      ];
      const nonFixedTotal = components.reduce((s, c) => s + c.computedAmount, 0);
      components.push({
        name: ComponentName.FIXED_ALLOWANCE,
        computationType: ComputationType.FIXED,
        basisOf: BasisOf.WAGE,
        value: monthWage - nonFixedTotal,
        computedAmount: monthWage - nonFixedTotal,
      });

      for (const c of components) {
        await prisma.salaryComponent.create({ data: { userId: user.id, ...c } });
      }

      // PF
      await prisma.pfContribution.upsert({
        where: { userId_payer: { userId: user.id, payer: PfPayer.EMPLOYEE } },
        update: {},
        create: { userId: user.id, payer: PfPayer.EMPLOYEE, ratePercent: 12, computedAmount: basicAmount * 0.12 },
      });
      await prisma.pfContribution.upsert({
        where: { userId_payer: { userId: user.id, payer: PfPayer.EMPLOYER } },
        update: {},
        create: { userId: user.id, payer: PfPayer.EMPLOYER, ratePercent: 12, computedAmount: basicAmount * 0.12 },
      });

      // Professional Tax
      await prisma.taxDeduction.create({ data: { userId: user.id, name: 'Professional Tax', amount: 200 } });
    }
  }

  console.log('✅ Seed complete: 1 company, 1 admin, 4 employees with leave allocations and salary data.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
