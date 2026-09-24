import React, { useState, forwardRef } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { AuthInput, AuthInputProps } from './AuthInput';

export interface AuthPasswordFieldProps extends Omit<AuthInputProps, 'type' | 'leftIcon' | 'rightElement'> {
  label?: string;
}

export const AuthPasswordField = forwardRef<HTMLInputElement, AuthPasswordFieldProps>(
  ({ label = 'Password', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <AuthInput
        ref={ref}
        label={label}
        type={showPassword ? 'text' : 'password'}
        leftIcon={<Lock className="w-4 h-4" />}
        rightElement={
          <button
            type="button"
            tabIndex={0}
            onClick={() => setShowPassword(prev => !prev)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-[#94A3B8]" />
            ) : (
              <Eye className="w-4 h-4 text-[#94A3B8]" />
            )}
          </button>
        }
        {...props}
      />
    );
  }
);

AuthPasswordField.displayName = 'AuthPasswordField';
