import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthPasswordField } from '../../components/auth/AuthPasswordField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Field validation errors
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    let isValid = true;
    const cleanId = identifier.trim();

    if (!cleanId) {
      setIdentifierError('Email or User ID is required');
      isValid = false;
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
      const isUserId = /^PRV-\d+$/i.test(cleanId) || cleanId.length >= 3;
      if (!isEmail && !isUserId) {
        setIdentifierError('Enter a valid email address or User ID');
        isValid = false;
      } else {
        setIdentifierError('');
      }
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!validate()) return;

    setFormError('');
    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
      success('Logged in successfully. Welcome to Provalix AI.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err?.message?.includes('Invalid email/User ID or password')) {
        setFormError('Invalid email/User ID or password.');
      } else {
        setFormError(err?.message || 'Unable to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout activeTab="login">
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to continue to Provalix AI"
      >
        {/* Form-level error alert */}
        {formError && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Email or User ID Input */}
          <AuthInput
            label="Email or User ID"
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={e => {
              setIdentifier(e.target.value);
              if (identifierError) setIdentifierError('');
              if (formError) setFormError('');
            }}
            placeholder="alex.rivera@institution.edu or PRV-10482"
            leftIcon={<Mail className="w-4 h-4" />}
            error={identifierError}
            required
            disabled={isLoading}
            autoComplete="username"
          />

          {/* Password Input */}
          <div>
            <AuthPasswordField
              label="Password"
              id="login-password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (formError) setFormError('');
              }}
              placeholder="••••••••"
              error={passwordError}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
            <div className="flex justify-end mt-1.5">
              <Link
                to="/forgot-password"
                className="text-xs text-[#94A3B8] hover:text-[#CBD5E1] transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-[#7C3AED] rounded"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Navigation to Register */}
        <div className="mt-8 pt-6 border-t border-[#243047] text-center text-xs text-[#94A3B8]">
          <span>Don't have an account? </span>
          <Link
            to="/register"
            className="font-semibold text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-[#7C3AED] rounded"
          >
            Create one
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
