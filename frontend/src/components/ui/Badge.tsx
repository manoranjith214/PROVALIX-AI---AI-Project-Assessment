import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'slate' | 'success' | 'amber' | 'error' | 'ai';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  icon,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 font-medium rounded-lg gap-1.5',
  };

  const variantStyles = {
    primary: 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30',
    slate: 'bg-[#1E293B] text-[#CBD5E1] border border-[#334155]',
    success: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    amber: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    error: 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
    ai: 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40',
  };

  return (
    <span className={`inline-flex items-center select-none font-sans ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
