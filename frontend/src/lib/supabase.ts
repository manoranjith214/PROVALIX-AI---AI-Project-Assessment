import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY are not configured. Google OAuth may fail.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder_key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

/**
 * Resolves the OAuth redirect URL:
 * - Localhost / local dev: returns current local origin + /auth/callback (e.g. http://localhost:5173/auth/callback)
 * - Production: returns https://provalix-ai.vercel.app/auth/callback (or VITE_AUTH_REDIRECT_URL if configured)
 */
export const getOAuthRedirectUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://provalix-ai.vercel.app/auth/callback';
  }

  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname === '[::1]';

  if (isLocal) {
    return `${window.location.origin}/auth/callback`;
  }

  return (
    import.meta.env.VITE_AUTH_REDIRECT_URL ||
    'https://provalix-ai.vercel.app/auth/callback'
  );
};
