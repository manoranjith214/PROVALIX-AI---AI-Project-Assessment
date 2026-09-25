import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) are not configured.'
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
 * Resolves the email verification redirect URL:
 * Automatically uses current origin (e.g. http://localhost:5173/auth/verify or https://provalix-ai.vercel.app/auth/verify)
 */
export const getEmailVerifyRedirectUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://provalix-ai.vercel.app/auth/verify';
  }
  return `${window.location.origin}/auth/verify`;
};

/**
 * Resolves the password reset redirect URL:
 */
export const getPasswordResetRedirectUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://provalix-ai.vercel.app/reset-password';
  }
  return `${window.location.origin}/reset-password`;
};
