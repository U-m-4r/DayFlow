/**
 * Login ID generator — §7.1 of the build plan.
 * Format: {CompanyCode}{First2First}{First2Last}{YearOfJoining}{4-digit serial}
 * Example: OIJODO20220001
 * The company code is derived from the first 2 chars of the company name (uppercased).
 * Collisions are resolved by incrementing the 4-digit serial.
 */
import { PrismaClient } from '@prisma/client';

export async function generateLoginId(
  prisma: PrismaClient,
  companyName: string,
  fullName: string,
  dateOfJoining: Date
): Promise<string> {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'XX';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : 'XX';

  const companyCode = companyName.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase().padEnd(2, 'X');
  const nameCode = (firstName.slice(0, 2) + lastName.slice(0, 2)).toUpperCase().padEnd(4, 'X');
  const year = dateOfJoining.getFullYear().toString();

  const prefix = `${companyCode}${nameCode}${year}`;

  // Find the highest existing serial with this prefix
  const existing = await prisma.user.findMany({
    where: { loginId: { startsWith: prefix } },
    select: { loginId: true },
    orderBy: { loginId: 'desc' },
    take: 1,
  });

  let serial = 1;
  if (existing.length > 0) {
    const lastSerial = parseInt(existing[0].loginId.slice(prefix.length), 10);
    if (!isNaN(lastSerial)) serial = lastSerial + 1;
  }

  return `${prefix}${serial.toString().padStart(4, '0')}`;
}
