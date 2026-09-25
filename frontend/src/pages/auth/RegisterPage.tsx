import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Building, Calendar, GraduationCap, Image, ArrowRight, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthPasswordField } from '../../components/auth/AuthPasswordField';
import { PasswordStrengthMeter, evaluatePassword } from '../../components/auth/PasswordStrengthMeter';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('1st Year');
  const [college, setCollege] = useState('Apex Institute of Technology & Research');
  const [profileImage, setProfileImage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const { register, resendVerificationEmail } = useAuth();
  const { success, error: toastError } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Institutional email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid institutional email address';
    }

    const { allValid } = evaluatePassword(password);
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!allValid) {
      newErrors.password = 'Password does not meet the required security requirements.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!year.trim()) {
      newErrors.year = 'Academic year is required';
    }

    if (!college.trim()) {
      newErrors.college = 'College is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!validateForm()) return;

    setFormError('');
    setIsLoading(true);

    try {
      await register(name.trim(), email.trim(), password, {
        department: department.trim(),
        year: year.trim(),
        college: college.trim(),
        avatarUrl: profileImage.trim() || undefined,
      });

      setRegisteredEmail(email.trim());
      setIsRegistered(true);
      success('Account created successfully. Please check your email and click the verification link before signing in.');
    } catch (err: any) {
      const msg =
        err?.message?.includes('already registered') || err?.message?.includes('already exists')
          ? 'This email is already registered. Please sign in instead.'
          : err?.message || 'Unable to complete registration. Please try again.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(registeredEmail);
      setResendSuccess(true);
      success('Verification email resent.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout activeTab="register" cardMaxWidth="max-w-xl">
      <AuthCard
        title={isRegistered ? 'Account Created' : 'Create your Provalix account'}
        subtitle={
          isRegistered
            ? 'Please verify your email before signing in.'
            : 'Join Provalix AI and start managing your project evaluations.'
        }
      >
        {isRegistered ? (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
              <MailCheck className="w-9 h-9" />
            </div>

            <div className="p-4 rounded-xl bg-[#0F172A] border border-[#243047] text-left text-xs text-[#CBD5E1] space-y-2">
              <p className="font-semibold text-sm text-[#F8FAFC]">
                Account created successfully. Please check your email and click the verification link before signing in.
              </p>
              <p className="text-[#94A3B8] leading-relaxed">
                We sent a secure verification link to <strong className="text-[#F8FAFC]">{registeredEmail}</strong>.
                Please click the link in your inbox to confirm your institutional email.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111827] border border-[#243047] text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8]">Didn't receive the email?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] hover:text-[#C4B5FD] transition-colors underline disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </button>
              </div>

              {resendSuccess && (
                <p className="text-xs text-[#22C55E]">
                  A new verification link has been sent to your email. Check your spam folder if needed.
                </p>
              )}
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors shadow-md shadow-[#7C3AED]/20"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
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

            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              {/* Row 1: Full Name & Institutional Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                  label="Full Name"
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Alex Rivera"
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.name}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                />

                <AuthInput
                  label="Institutional Email"
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    if (formError) setFormError('');
                  }}
                  placeholder="alex.rivera@institution.edu"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* Row 2: Department & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="register-department"
                    className="block text-xs font-semibold tracking-wider text-[#CBD5E1] uppercase"
                  >
                    Department <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Building className="w-4 h-4" />
                    </div>
                    <select
                      id="register-department"
                      value={department}
                      onChange={e => {
                        setDepartment(e.target.value);
                        if (errors.department) setErrors(prev => ({ ...prev, department: '' }));
                      }}
                      disabled={isLoading}
                      className="w-full rounded-xl bg-[#0F172A] border border-[#243047] pl-10 pr-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-colors"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Artificial Intelligence & Data Science">AI & Data Science</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                    </select>
                  </div>
                  {errors.department && (
                    <p className="text-xs text-[#EF4444] pt-0.5">{errors.department}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="register-year"
                    className="block text-xs font-semibold tracking-wider text-[#CBD5E1] uppercase"
                  >
                    Year <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <select
                      id="register-year"
                      value={year}
                      onChange={e => {
                        setYear(e.target.value);
                        if (errors.year) setErrors(prev => ({ ...prev, year: '' }));
                      }}
                      disabled={isLoading}
                      className="w-full rounded-xl bg-[#0F172A] border border-[#243047] pl-10 pr-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-colors"
                    >
                      <option value="1st Year">1st Year (Freshman)</option>
                      <option value="2nd Year">2nd Year (Sophomore)</option>
                      <option value="3rd Year">3rd Year (Junior)</option>
                      <option value="4th Year">4th Year (Senior)</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>
                  {errors.year && (
                    <p className="text-xs text-[#EF4444] pt-0.5">{errors.year}</p>
                  )}
                </div>
              </div>

              {/* Row 3: College & Optional Profile Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                  label="College"
                  id="register-college"
                  type="text"
                  value={college}
                  onChange={e => {
                    setCollege(e.target.value);
                    if (errors.college) setErrors(prev => ({ ...prev, college: '' }));
                  }}
                  placeholder="e.g. Apex Institute of Technology & Research"
                  leftIcon={<GraduationCap className="w-4 h-4" />}
                  error={errors.college}
                  required
                  disabled={isLoading}
                />

                <AuthInput
                  label="Profile Image"
                  id="register-image"
                  type="url"
                  value={profileImage}
                  onChange={e => setProfileImage(e.target.value)}
                  placeholder="https://... (optional)"
                  leftIcon={<Image className="w-4 h-4" />}
                  hint="Optional"
                  disabled={isLoading}
                />
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthPasswordField
                  label="Password"
                  id="register-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    if (confirmPassword && e.target.value !== confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                    } else if (confirmPassword && e.target.value === confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  placeholder="Create strong password"
                  error={errors.password}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />

                <AuthPasswordField
                  label="Confirm Password"
                  id="register-confirm-password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (password !== e.target.value) {
                      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                    } else {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  placeholder="Re-enter password"
                  error={errors.confirmPassword}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {/* Live Password Checklist & Strength Meter */}
              <PasswordStrengthMeter password={password} />

              {/* User ID note */}
              <div className="p-3 bg-[#0F172A] border border-[#243047] rounded-xl text-xs text-[#94A3B8] flex items-center justify-between">
                <span>Permanent User ID (e.g. PRV-10482):</span>
                <span className="font-semibold text-[#CBD5E1] font-mono">Auto-generated</span>
              </div>

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 rounded-xl font-semibold text-sm text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-[#7C3AED]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-[#7C3AED] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Navigation to Sign In */}
            <div className="mt-8 pt-6 border-t border-[#243047] text-center text-xs text-[#94A3B8]">
              <span>Already have an account? </span>
              <Link
                to="/login"
                className="font-semibold text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors hover:underline focus:outline-none focus:ring-1 focus:ring-[#7C3AED] rounded"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
