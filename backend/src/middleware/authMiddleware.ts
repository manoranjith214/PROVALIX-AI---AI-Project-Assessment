import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/token';
import { verifySupabaseToken } from '../config/supabase';
import { userRepository } from '../repositories/userRepository';
import { prisma } from '../config/prisma';

// In-memory token cache to prevent repeated remote Supabase Auth network calls & DB lookups on every concurrent request
interface CachedUserSession {
  user: any;
  cachedAt: number;
}
const tokenCache = new Map<string, CachedUserSession>();
const TOKEN_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Background cleanup for stale cached tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now - value.cachedAt > TOKEN_CACHE_TTL_MS) {
      tokenCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
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
      return next();
    }
  } catch {
    // Local JWT check failed or token is a Supabase JWT; proceed to Supabase verification
  }

  // 1.5 Fast-path: Check in-memory session cache (eliminates remote TLS handshake on concurrent requests)
  const cached = tokenCache.get(token);
  if (cached && Date.now() - cached.cachedAt < TOKEN_CACHE_TTL_MS) {
    req.user = cached.user;
    return next();
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

      // Cache verified session to accelerate parallel requests
      tokenCache.set(token, { user: req.user, cachedAt: Date.now() });
      if (tokenCache.size > 2000) {
        // Prune oldest if cache grows large
        const firstKey = tokenCache.keys().next().value;
        if (firstKey) tokenCache.delete(firstKey);
      }

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
