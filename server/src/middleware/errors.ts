/** Consistent JSON error responses prevent Express internals leaking to the client. */
import { NextFunction, Request, Response } from 'express';
export function notFound(_req:Request,res:Response) { res.status(404).json({message:'Route not found'}); }
export function errors(err:unknown,_req:Request,res:Response,_next:NextFunction) { console.error(err); const message=err instanceof Error?err.message:'Unexpected server error'; res.status(500).json({message}); }
