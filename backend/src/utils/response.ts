import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  pagination?: ApiResponse<T>['pagination']
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(pagination ? { pagination } : {}),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: any[] = [],
  extra?: Record<string, any>
): Response {
  const payload: any = {
    success: false,
    message,
    errors,
    ...(extra ? extra : {}),
  };
  return res.status(statusCode).json(payload);
}
