import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
}) => {
  return (
    <div
      className={`w-full bg-[#111827] border border-[#243047] rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl transition-all duration-200 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-6 sm:mb-8 text-left">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
