import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B1120] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] active:bg-[#5B21B6] focus:ring-[#7C3AED] shadow-sm shadow-[#7C3AED]/20',
    secondary: 'bg-[#111827] border border-[#334155] text-[#E2E8F0] hover:bg-[#172033] hover:text-white focus:ring-[#7C3AED]',
    outline: 'bg-transparent border border-[#334155] text-[#CBD5E1] hover:bg-[#172033] hover:text-[#F8FAFC] focus:ring-[#7C3AED]',
    ghost: 'text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC] focus:ring-[#7C3AED]',
    danger: 'bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.2)] focus:ring-[#EF4444]',
    ai: 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] focus:ring-[#7C3AED] shadow-sm shadow-[#7C3AED]/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
