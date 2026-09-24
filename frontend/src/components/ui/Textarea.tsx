import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 3,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full bg-[#0F172A] border ${
          error ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#334155] focus:border-[#7C3AED] focus:ring-[#7C3AED]/30'
        } text-[#F8FAFC] placeholder:text-[#64748B] text-sm rounded-xl p-3.5 transition-all outline-none focus:ring-2 disabled:bg-[#111827] disabled:opacity-50 resize-y ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-[#EF4444] font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[#94A3B8]">{helperText}</p>
      ) : null}
    </div>
  );
};
