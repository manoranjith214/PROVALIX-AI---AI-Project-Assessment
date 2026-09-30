import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/token';
import { verifySupabaseToken } from '../config/supabase';
import { userRepository } from '../repositories/userRepository';
import { prisma } from '../config/prisma';

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;

  // Safe diagnostic log (NO passwords, tokens, secrets, or keys logged)
  const hasBearer = Boolean(authHeader && authHeader.startsWith('Bearer '));
  console.log(`[Auth] Request reached backend: ${endpoint} | Has Bearer: ${hasBearer}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[Auth] Endpoint: ${endpoint} | Status: 401 Unauthorized (No token provided)`);
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    console.log(`[Auth] Endpoint: ${endpoint} | Status: 401 Unauthorized (Invalid token parameter)`);
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Invalid token provided.',
    });
  }

  // 1. Try local JWT token verification first (fast, works in test suites & local sessions)
  try {
    const payload = verifyAccessToken(token);
    if (payload && payload.id) {
      req.user = payload;
      console.log(`[Auth] Endpoint: ${endpoint} | Authenticated: Yes (Local JWT) | Status: 200`);
      return next();
    }
  } catch {
    // Local JWT check failed or token is a Supabase JWT; proceed to Supabase verification
  }

  // 2. Verify with Supabase auth service
  try {
    const sbUser = await verifySupabaseToken(token);
    if (sbUser) {
      let localUser: any = await userRepository.findByEmail(sbUser.email || '');
      if (!localUser && sbUser.id) {
        localUser = await userRepository.findById(sbUser.id);
      }

      // If user exists in Supabase Auth but not yet in local DB, create user to satisfy foreign key constraints
      if (!localUser && sbUser.id && sbUser.email) {
        try {
          localUser = await prisma.user.create({
            data: {
              id: sbUser.id,
              email: sbUser.email.toLowerCase(),
              name:
                sbUser.user_metadata?.full_name ||
                sbUser.user_metadata?.name ||
                sbUser.email.split('@')[0] ||
                'User',
              permanentId:
                sbUser.user_metadata?.permanent_id ||
                sbUser.user_metadata?.permanent_user_id ||
                `PRV-${Date.now().toString().slice(-5)}`,
              passwordHash: 'EXTERNAL_SUPABASE_AUTH',
              department: sbUser.user_metadata?.department || 'Computer Science & Engineering',
              year: sbUser.user_metadata?.year || '1st Year',
              college: sbUser.user_metadata?.college || 'Apex Institute of Technology & Research',
            },
          });
        } catch {
          localUser = await userRepository.findByEmail(sbUser.email);
        }
      }

      req.user = {
        id: localUser?.id || sbUser.id,
        permanentId: localUser?.permanentId || sbUser.user_metadata?.permanent_id || '',
        email: sbUser.email || localUser?.email || '',
        name:
          localUser?.name ||
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          sbUser.email?.split('@')[0] ||
          'User',
      };
      console.log(`[Auth] Endpoint: ${endpoint} | Authenticated: Yes (Supabase JWT) | Status: 200`);
      return next();
    }
  } catch (sbErr: any) {
    console.warn('[Auth] Supabase verification notice:', sbErr?.message || 'Verification failed');
  }

  console.log(`[Auth] Endpoint: ${endpoint} | Status: 401 Unauthorized (Expired or invalid token)`);
  return res.status(401).json({
    success: false,
    error: 'AUTH_REQUIRED',
    message: 'Authentication required. Invalid or expired token.',
  });
}
