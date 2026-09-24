import React from 'react';

interface AuthDividerProps {
  text?: string;
}

export const AuthDivider: React.FC<AuthDividerProps> = ({ text = 'OR' }) => {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[#243047]" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="px-3 bg-[#111827] text-[#94A3B8] font-semibold tracking-wider uppercase">
          {text}
        </span>
      </div>
    </div>
  );
};
