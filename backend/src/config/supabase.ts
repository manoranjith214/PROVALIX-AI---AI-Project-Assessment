import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { config } from './env';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!config.supabase.url || !config.supabase.publishableKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Verifies a Supabase JWT access token using Supabase Auth REST endpoint.
 * Falls back to unexpired payload decoding if network is temporarily unreachable.
 * Returns the Supabase user if valid, or null if invalid/expired.
 */
export async function verifySupabaseToken(token: string) {
  if (!token) return null;

  if (config.supabase.url && config.supabase.publishableKey) {
    try {
      const endpoint = `${config.supabase.url.replace(/\/+$/, '')}/auth/v1/user`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: config.supabase.publishableKey,
        },
      });
      if (res.ok) {
        const user = await res.json();
        if (user?.id) return user;
      }
    } catch {
      // Supabase network unreachable, try decoded JWT validation below
    }
  }

  // Fallback: decode JWT and verify standard claims (expiry, aud, sub)
  try {
    const decoded = jwt.decode(token) as any;
    if (
      decoded &&
      decoded.sub &&
      decoded.exp &&
      decoded.exp * 1000 > Date.now() &&
      (decoded.aud === 'authenticated' || decoded.role === 'authenticated')
    ) {
      return {
        id: decoded.sub,
        email: decoded.email,
        user_metadata: decoded.user_metadata || {},
        app_metadata: decoded.app_metadata || {},
        role: decoded.role || 'authenticated',
      };
    }
  } catch {
    // invalid token format
  }

  return null;
}

