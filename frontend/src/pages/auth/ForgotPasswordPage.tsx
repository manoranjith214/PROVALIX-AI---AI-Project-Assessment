import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthInput } from '../../components/auth/AuthInput';
import { supabase, getPasswordResetRedirectUrl } from '../../lib/supabase';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { success } = useToast();

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!validate()) return;

    setFormError('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      // Supabase Auth password reset request
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        // Also attempt backend fallback if available
        await authService.forgotPassword(cleanEmail).catch(() => {});
      }

      setIsSuccess(true);
      success('Password reset instructions have been dispatched.');
    } catch (err: any) {
      setFormError(
        err?.message?.includes('network') || err?.message?.includes('Failed to fetch')
          ? 'Unable to connect to the server. Please try again.'
          : err?.message || 'Unable to process password reset request.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout activeTab="forgot">
      <AuthCard
        title="Reset your password"
        subtitle="Enter your email and we'll help you reset your password."
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
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthInput
              label="Email Address"
              id="forgot-email"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
                if (formError) setFormError('');
              }}
              placeholder="alex.rivera@institution.edu"
              leftIcon={<Mail className="w-4 h-4" />}
              error={emailError}
              required
              disabled={isLoading}
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-left animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-xs text-[#CBD5E1] space-y-2">
              <div className="flex items-center gap-2 text-[#22C55E] font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password reset instructions sent</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                If an account matches <strong className="text-[#F8FAFC]">{email}</strong>, a secure link to reset your credentials has been dispatched.
              </p>
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs text-[#CBD5E1] border border-[#334155] hover:bg-[#1E293B] hover:text-[#F8FAFC] transition-colors"
              >
                Back to Sign in
              </Link>
            </div>
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
