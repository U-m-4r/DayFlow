/** Consistent JSON error responses prevent Express internals leaking to the client. */
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

export function errors(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.errors.map(e => e.message).join('; '),
      errors: err.errors,
    });
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  res.status(500).json({ message });
}
