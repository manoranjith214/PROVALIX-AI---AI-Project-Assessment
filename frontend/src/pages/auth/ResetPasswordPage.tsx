import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthPasswordField } from '../../components/auth/AuthPasswordField';
import { PasswordStrengthMeter, evaluatePassword } from '../../components/auth/PasswordStrengthMeter';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Field errors
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');

  const { success } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // If incoming with a PKCE code from Supabase password reset email
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          setSessionReady(true);
        } else {
          console.warn('[ResetPassword] Code exchange notice:', error.message);
        }
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        }
      });
    }
  }, [searchParams]);

  const validate = () => {
    let isValid = true;

    const { allValid } = evaluatePassword(newPassword);
    if (!newPassword) {
      setPasswordError('New password is required');
      isValid = false;
    } else if (!allValid) {
      setPasswordError('Password does not meet the required security requirements.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      isValid = false;
    } else {
      setConfirmError('');
    }

    return isValid;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!validate()) return;

    setFormError('');
    setIsLoading(true);

    try {
      // 1. Supabase Auth update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // Fallback to custom backend token if provided
        if (token) {
          await authService.resetPassword({
            token: token.trim(),
            newPassword,
          });
        } else {
          throw error;
        }
      }

      setIsSuccess(true);
      success('Your password has been reset successfully.');
      // Sign out from recovery session so user signs in cleanly
      await supabase.auth.signOut().catch(() => {});
    } catch (err: any) {
      setFormError(
        err?.message?.includes('expired') || err?.message?.includes('Invalid')
          ? 'Your reset link has expired. Please request a new verification email.'
          : err?.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout activeTab="reset">
      <AuthCard
        title="Set new password"
        subtitle="Ensure your new password meets the security requirements."
      >
        {/* Form Error */}
        {formError && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleReset} className="space-y-4" noValidate>
            <AuthPasswordField
              label="New Password"
              id="reset-new-password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (formError) setFormError('');
                if (confirmPassword && e.target.value !== confirmPassword) {
                  setConfirmError('Passwords do not match.');
                } else if (confirmPassword && e.target.value === confirmPassword) {
                  setConfirmError('');
                }
              }}
              placeholder="Enter new password"
              error={passwordError}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />

            <AuthPasswordField
              label="Confirm New Password"
              id="reset-confirm-password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (confirmError) setConfirmError('');
                if (formError) setFormError('');
                if (newPassword && e.target.value !== newPassword) {
                  setConfirmError('Passwords do not match.');
                } else if (newPassword && e.target.value === newPassword) {
                  setConfirmError('');
                }
              }}
              placeholder="Confirm new password"
              error={confirmError}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />

            {/* Password strength checklist */}
            <PasswordStrengthMeter password={newPassword} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-xs text-[#CBD5E1] space-y-2">
              <div className="flex items-center gap-2 text-[#22C55E] font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your password has been reset successfully.</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                You can now authenticate to Provalix AI using your new credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] transition-colors shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation to Sign In */}
        <div className="mt-8 pt-6 border-t border-[#243047] text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-[#7C3AED] rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign in</span>
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
