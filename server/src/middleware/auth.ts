/** Authentication and authorization guards keep role enforcement at the API boundary. */
import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyAccess } from '../lib/tokens';
import { prisma } from '../lib/prisma';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, '');
    if (!token) throw new Error();
    req.user = verifyAccess(token);
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required' });
  }
}

export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) =>
  !req.user || !roles.includes(req.user.role)
    ? res.status(403).json({ message: 'Insufficient permissions' })
    : next();

/** Blocks app APIs until invite OTP is verified and a real password is set. */
export async function requireOnboarded(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    if (!user.isOtpVerified) {
      return res.status(403).json({ message: 'OTP verification required', code: 'OTP_REQUIRED' });
    }
    if (user.mustChangePassword) {
      return res.status(403).json({ message: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    next();
  } catch {
    res.status(500).json({ message: 'Unable to verify onboarding status' });
  }
}
