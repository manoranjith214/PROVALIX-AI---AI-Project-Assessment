import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full bg-[#0F172A] border ${
            error ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#334155] focus:border-[#7C3AED] focus:ring-[#7C3AED]/30'
          } text-[#F8FAFC] text-sm rounded-xl px-3.5 py-2.5 transition-all outline-none focus:ring-2 disabled:bg-[#111827] disabled:opacity-50 appearance-none pr-9 cursor-pointer ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#111827] text-[#F8FAFC]">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[#EF4444] font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[#94A3B8]">{helperText}</p>
      ) : null}
    </div>
  );
};
