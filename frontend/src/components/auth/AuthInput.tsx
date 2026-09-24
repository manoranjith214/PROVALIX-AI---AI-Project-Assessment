import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  hint?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightElement,
      hint,
      id,
      className = '',
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `auth-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="block text-xs font-semibold tracking-wider text-[#CBD5E1] uppercase"
            >
              {label} {required && <span className="text-[#EF4444] normal-case">*</span>}
            </label>
            {hint && !error && (
              <span id={hintId} className="text-[11px] text-[#94A3B8]">
                {hint}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-xl bg-[#0F172A] border text-sm text-[#F8FAFC] placeholder-[#64748B] transition-all duration-200 outline-none
              ${leftIcon ? 'pl-10' : 'pl-3.5'}
              ${rightElement ? 'pr-11' : 'pr-3.5'}
              py-2.5 sm:py-3
              ${
                error
                  ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]'
                  : 'border-[#243047] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed bg-[#111827]' : 'hover:border-[#334155]'}
              ${className}
            `}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-[#EF4444] font-medium pt-0.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
