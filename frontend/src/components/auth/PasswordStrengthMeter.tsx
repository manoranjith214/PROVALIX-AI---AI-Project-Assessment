import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allValid: boolean;
  score: number;
}

export const evaluatePassword = (password: string): PasswordRequirements => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const checks = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial];
  const score = checks.filter(Boolean).length;
  const allValid = score === 5;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    allValid,
    score,
  };
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    score,
  } = evaluatePassword(password);

  const getStrengthTier = () => {
    if (score <= 2) {
      return {
        label: 'Weak',
        textColor: 'text-[#EF4444]',
        bgColor: 'bg-[#EF4444]',
        percent: 33,
      };
    }
    if (score <= 4) {
      return {
        label: 'Medium',
        textColor: 'text-[#F59E0B]',
        bgColor: 'bg-[#F59E0B]',
        percent: 66,
      };
    }
    return {
      label: 'Strong',
      textColor: 'text-[#22C55E]',
      bgColor: 'bg-[#22C55E]',
      percent: 100,
    };
  };

  const strength = getStrengthTier();

  const rules = [
    { label: 'At least 8 characters', valid: hasMinLength },
    { label: 'One uppercase letter', valid: hasUppercase },
    { label: 'One lowercase letter', valid: hasLowercase },
    { label: 'One number', valid: hasNumber },
    { label: 'One special character (!@#$%^&*)', valid: hasSpecial },
  ];

  return (
    <div className="space-y-3 p-3.5 bg-[#0F172A] border border-[#243047] rounded-xl text-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[#94A3B8] font-medium">Password strength:</span>
        <span className={`font-semibold tracking-wide ${strength.textColor}`}>
          {strength.label}
        </span>
      </div>

      {/* Strength indicator track */}
      <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden flex gap-1">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.bgColor}`}
          style={{ width: `${strength.percent}%` }}
        />
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              rule.valid ? 'text-[#22C55E] font-medium' : 'text-[#64748B]'
            } ${idx === 4 ? 'sm:col-span-2' : ''}`}
          >
            {rule.valid ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-[#22C55E]" />
            ) : (
              <X className="w-3.5 h-3.5 shrink-0 text-[#64748B]" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
