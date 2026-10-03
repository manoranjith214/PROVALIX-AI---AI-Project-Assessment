import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: config.supabase.publishableKey,
          Connection: 'close',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const user = await res.json();
        if (user?.id) return user;
      }
    } catch (err: any) {
      console.warn('[SupabaseAuth] Verification network attempt failed:', err?.message || err);
    }
  }

  // Token was not verified by Supabase Auth API
  return null;
}

