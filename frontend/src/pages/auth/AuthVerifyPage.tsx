import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { supabase } from '../../lib/supabase';
import { supabaseDataService } from '../../services/supabaseDataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type VerificationStatus = 'loading' | 'success' | 'expired' | 'invalid' | 'info';

export const AuthVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { resendVerificationEmail } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const handleVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

        if (errorCode || errorDesc) {
          if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')) {
            if (isMounted) {
              setStatus('expired');
              setErrorMessage('Your verification link has expired. Please request a new verification email.');
            }
          } else {
            if (isMounted) {
              setStatus('invalid');
              setErrorMessage(errorDesc || 'Invalid verification link or credentials.');
            }
          }
          return;
        }

        const code = urlParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (error.message.toLowerCase().includes('expired')) {
              if (isMounted) {
                setStatus('expired');
                setErrorMessage('Your verification link has expired. Please request a new verification email.');
              }
            } else {
              if (isMounted) {
                setStatus('invalid');
                setErrorMessage('Your verification link is invalid or already used.');
              }
            }
            return;
          }

          if (data.session?.user) {
            // Synchronize verified user to public.profiles
            await supabaseDataService.syncUserProfile(data.session.user);
            // Sign out so user explicitly signs in with Email + Password on Login Page
            await supabase.auth.signOut().catch(() => {});
          }

          if (isMounted) {
            setStatus('success');
          }
          return;
        }

        // Check if access_token in hash or active session exists
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabaseDataService.syncUserProfile(session.user);
            await supabase.auth.signOut().catch(() => {});
            if (isMounted) setStatus('success');
            return;
          }
        }

        // Check if user has an existing session that got verified
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          await supabaseDataService.syncUserProfile(session.user);
          await supabase.auth.signOut().catch(() => {});
          if (isMounted) {
            setStatus('success');
          }
          return;
        }

        // If no verification parameters are present, show info screen
        if (isMounted) {
          setStatus('info');
        }
      } catch (err: any) {
        console.warn('[AuthVerifyPage] Verification notice:', err);
        if (isMounted) {
          setStatus('invalid');
          setErrorMessage('Something went wrong during verification. Please try again.');
        }
      }
    };

    handleVerification();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toastError('Please enter your registered email address.');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(resendEmail.trim());
      setResendSuccess(true);
      success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout activeTab="login">
      <AuthCard
        title={
          status === 'success'
            ? 'Email Verified'
            : status === 'expired'
            ? 'Link Expired'
            : status === 'invalid'
            ? 'Verification Failed'
            : status === 'info'
            ? 'Check Your Email'
            : 'Verifying Email'
        }
        subtitle={
          status === 'success'
            ? 'Your email address has been confirmed successfully.'
            : status === 'info'
            ? 'We sent a verification link to your email address.'
            : 'Provalix AI Email Verification System'
        }
      >
        {status === 'loading' && (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            <p className="text-sm text-[#94A3B8]">Validating your verification link...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-xs text-[#CBD5E1] space-y-1">
              <p className="font-semibold text-sm text-[#22C55E]">Email verified successfully.</p>
              <p className="text-[#94A3B8]">You can now sign in with your email and password.</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] transition-all duration-200 shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {(status === 'expired' || status === 'invalid') && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Verification Issue</p>
                <p className="text-[#CBD5E1] mt-1">{errorMessage}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0F172A] border border-[#243047] space-y-3">
              <p className="text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider">
                Resend Verification Link
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 transition-colors"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend verification email</span>
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

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs text-[#94A3B8] hover:text-[#CBD5E1] hover:underline">
                Back to Sign in
              </Link>
            </div>
          </div>
        )}

        {status === 'info' && (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
              <MailCheck className="w-8 h-8" />
            </div>

            <div className="p-4 rounded-xl bg-[#0F172A] border border-[#243047] text-xs text-[#CBD5E1] space-y-2 text-left">
              <p className="font-semibold text-sm text-[#F8FAFC]">Check your email</p>
              <p className="text-[#94A3B8] leading-relaxed">
                We sent a verification link to your email address. Please click the link to activate your account before signing in.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111827] border border-[#243047] text-left space-y-3">
              <p className="text-xs font-semibold text-[#CBD5E1]">Didn't receive the email?</p>
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="Enter email to resend link"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#243047] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#7C3AED] outline-none"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 transition-colors"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </button>
              </form>
              {resendSuccess && (
                <p className="text-xs text-[#22C55E]">
                  A new verification link has been sent to your email.
                </p>
              )}
            </div>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs text-[#94A3B8] hover:text-[#CBD5E1] hover:underline">
                Ready to sign in? Proceed to Login
              </Link>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
