import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[#94A3B8] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#0F172A] border ${
            error ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#334155] focus:border-[#7C3AED] focus:ring-[#7C3AED]/30'
          } text-[#F8FAFC] placeholder:text-[#64748B] text-sm rounded-xl px-3.5 py-2.5 transition-all outline-none focus:ring-2 disabled:bg-[#111827] disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-[#94A3B8] flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[#EF4444] font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[#94A3B8]">{helperText}</p>
      ) : null}
    </div>
  );
};
