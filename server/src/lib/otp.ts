/**
 * One-time-password issuance and verification for employee invites
 * (and later password reset). Codes are hashed at rest and expire quickly.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { OtpPurpose } from '@prisma/client';
import { prisma } from './prisma';

const OTP_TTL_MS = 15 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_MS);
}

export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.otp.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otp.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return code;
}

export async function consumeOtp(userId: string, purpose: OtpPurpose, code: string): Promise<boolean> {
  const otp = await prisma.otp.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return false;
  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) return false;
  await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}
