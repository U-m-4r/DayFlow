/** JWT helpers centralise the short-lived access / rotatable refresh token contract. */
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me';
export type TokenUser = { id:string; role:Role; email:string };
export const signAccess = (u:TokenUser) => jwt.sign(u, accessSecret, {expiresIn:'15m'});
export const signRefresh = (u:TokenUser) => jwt.sign(u, refreshSecret, {expiresIn:'7d'});
export const verifyAccess = (t:string) => jwt.verify(t, accessSecret) as TokenUser;
export const verifyRefresh = (t:string) => jwt.verify(t, refreshSecret) as TokenUser;
