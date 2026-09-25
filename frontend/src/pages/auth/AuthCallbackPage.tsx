import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { supabase } from '../../lib/supabase';
import { supabaseDataService } from '../../services/supabaseDataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Global execution lock to prevent double-processing of single-use PKCE codes
let globalExchangeInFlight: Promise<{ user: any; error: any }> | null = null;
let globalProcessedCode: string | null = null;

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { resendVerificationEmail, setAuthenticatedUser } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // Check if Supabase returned an explicit error parameter
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

        if (errorCode || errorDesc) {
          setStatus('error');
          if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')) {
            setErrorMessage('Your verification link has expired. Please request a new verification email.');
          } else {
            setErrorMessage(errorDesc || 'Your verification link is invalid or already used.');
          }
          return;
        }

        const code = urlParams.get('code');

        // Case 1: Active session already established (e.g. detected by client or pre-exchanged)
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession?.user) {
          await handleVerificationSuccess(initialSession.user);
          return;
        }

        // Case 2: URL contains PKCE authorization code
        if (code) {
          if (!globalExchangeInFlight || globalProcessedCode !== code) {
            globalProcessedCode = code;
            globalExchangeInFlight = (async () => {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                // Check if session was created concurrently
                const { data: { session: postSession } } = await supabase.auth.getSession();
                if (postSession?.user) {
                  return { user: postSession.user, error: null };
                }
                return { user: null, error };
              }
              return { user: data.session?.user || null, error: null };
            })();
          }

          const result = await globalExchangeInFlight;

          if (result.error) {
            // Check session one last time
            const { data: { session: finalCheckSession } } = await supabase.auth.getSession();
            if (finalCheckSession?.user) {
              await handleVerificationSuccess(finalCheckSession.user);
              return;
            }

            console.warn('[AuthCallback] PKCE exchange notice:', result.error.message);
            setStatus('error');
            setErrorMessage('Your verification link is invalid or already used.');
            return;
          }

          if (result.user) {
            await handleVerificationSuccess(result.user);
            return;
          }
        }

        // Case 3: No code parameter found
        // Verify if a session was restored
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession?.user) {
          await handleVerificationSuccess(fallbackSession.user);
          return;
        }

        // If no code and no session
        setStatus('error');
        setErrorMessage('No verification code found. Please check your verification email link.');
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error during verification:', err);
        setStatus('error');
        setErrorMessage('Your verification link is invalid or already used.');
      }
    };

    processCallback();
  }, []);

  const handleVerificationSuccess = async (authUser: any) => {
    try {
      // 1. Call supabase.auth.getUser() to verify active session
      const { data: { user } } = await supabase.auth.getUser();
      const verifiedUser = user || authUser;

      // 2. Synchronize authenticated user with application profile table (public.profiles)
      let profile = await supabaseDataService.fetchUserProfile(verifiedUser.id);
      if (!profile) {
        profile = await supabaseDataService.syncUserProfile(verifiedUser);
      }

      // 3. Update AuthContext / session state
      if (profile && setAuthenticatedUser) {
        setAuthenticatedUser(profile);
      }

      // 4. Remove code/token from browser URL after successful verification
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 5. Redirect user to /dashboard
      navigate('/dashboard', { replace: true });
    } catch (syncErr) {
      console.warn('[AuthCallback] Sync notice:', syncErr);
      navigate('/dashboard', { replace: true });
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toastError('Please enter your registered institutional email.');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(resendEmail.trim());
      setResendSuccess(true);
      success('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout activeTab="login">
      <AuthCard
        title={status === 'loading' ? 'Verifying Account' : 'Verification Failed'}
        subtitle={
          status === 'loading'
            ? 'Validating your email verification code...'
            : 'Unable to verify your account with this link.'
        }
      >
        {status === 'loading' ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
            <p className="text-sm text-[#94A3B8] font-medium">
              Confirming your email and preparing your dashboard...
            </p>
          </div>
        ) : (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            {/* Error Message */}
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Verification Link Issue</p>
                <p className="text-[#CBD5E1] mt-1">
                  {errorMessage || 'Your verification link is invalid or already used.'}
                </p>
              </div>
            </div>

            {/* Resend Verification Email Section */}
            <div className="p-4 rounded-xl bg-[#0F172A] border border-[#243047] space-y-3">
              <p className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                Resend Verification Email
              </p>
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-[#243047] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#7C3AED] outline-none"
                />

                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>
              </form>

              {resendSuccess && (
                <p className="text-xs text-[#22C55E]">
                  Verification email sent! Please check your inbox and spam folder.
                </p>
              )}
            </div>

            {/* Back to Sign In */}
            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-[#7C3AED] rounded"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
