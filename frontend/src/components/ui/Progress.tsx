import React from 'react';

export interface ProgressProps {
  value: number; // 0 to max
  max?: number;
  variant?: 'primary' | 'success' | 'amber' | 'error' | 'ai' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  // Auto variant selects color based on score thresholds (e.g. >80 green, 60-79 amber, <60 red)
  let chosenVariant = variant;
  if (variant === 'auto') {
    if (percentage >= 80) chosenVariant = 'success';
    else if (percentage >= 60) chosenVariant = 'amber';
    else chosenVariant = 'error';
  }

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const fillStyles = {
    primary: 'bg-[#7C3AED]',
    success: 'bg-[#22C55E]',
    amber: 'bg-[#F59E0B]',
    error: 'bg-[#EF4444]',
    ai: 'bg-[#7C3AED]',
    auto: 'bg-[#7C3AED]',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs font-medium text-[#94A3B8] mb-1.5">
          <span>Progress</span>
          <span className="text-[#F8FAFC] font-semibold">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-[#1E293B] rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`${fillStyles[chosenVariant]} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
