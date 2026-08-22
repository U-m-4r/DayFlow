/**
 * Shared password policy from the Validation Rules table.
 * Used by signup, change-password, and later reset-password.
 */
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/\d/, 'Password needs at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one symbol');
