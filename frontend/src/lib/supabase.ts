import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://tbclerczuvetkaaljdhh.supabase.co';
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_LfU3oC3fx_9TRhxy9ZHtUA_wjRreaBV';

if (!import.meta.env.VITE_SUPABASE_URL || (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) are not configured, using project defaults.'
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
 * Resolves the password reset redirect URL:
 */
export const getPasswordResetRedirectUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://provalix-ai.vercel.app/reset-password';
  }
  return `${window.location.origin}/reset-password`;
};
