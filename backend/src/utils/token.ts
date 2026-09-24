import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { AuthenticatedUserPayload } from '../types';

export function signAccessToken(payload: AuthenticatedUserPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function verifyAccessToken(token: string): AuthenticatedUserPayload {
  return jwt.verify(token, config.jwt.secret) as AuthenticatedUserPayload;
}

export function signRefreshToken(payload: { id: string }): string {
  return jwt.sign(
    {
      id: payload.id,
      jti: crypto.randomUUID(), // Guarantee RFC 7519 unique JWT ID per token generation
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn as any,
    }
  );
}

export function verifyRefreshToken(token: string): { id: string; jti?: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { id: string; jti?: string };
}
