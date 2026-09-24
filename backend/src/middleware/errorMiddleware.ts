import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export class AppError extends Error {
  statusCode: number;
  errors: any[];

  constructor(message: string, statusCode = 500, errors: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation error', 422, formattedErrors);
  }

  // Handle Custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  // Handle Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || [];
    return sendError(res, `A record with this ${target.join(', ') || 'field'} already exists.`, 409);
  }

  // Handle Prisma Record Not Found
  if (err.code === 'P2025') {
    return sendError(res, 'Requested resource not found.', 404);
  }

  // Handle Prisma Database Unreachable / Initialization Failure
  if (
    err.name === 'PrismaClientInitializationError' ||
    (typeof err.message === 'string' && err.message.includes("Can't reach database server"))
  ) {
    console.warn('⚠️ [Database Notice]: Unable to reach PostgreSQL database at the configured DATABASE_URL.');
    return sendError(
      res,
      'Database connection failed: The database server is unreachable. Please verify your Supabase DATABASE_URL in backend/.env.',
      503
    );
  }

  // Handle Syntax Error in JSON Body
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Malformed JSON payload.', 400);
  }

  // Generic 500
  console.error('[Unhandled Error]:', err);
  return sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal Server Error',
    500
  );
}

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `Resource not found: ${req.method} ${req.originalUrl}`, 404);
}
