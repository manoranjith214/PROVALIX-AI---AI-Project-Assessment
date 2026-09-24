import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20, // 20 attempts per 15 minutes for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later after 15 minutes.',
    errors: [],
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
    errors: [],
  },
});
