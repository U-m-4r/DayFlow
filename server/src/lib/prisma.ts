/** Singleton Prisma client prevents excess connections during local hot reload. */
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
