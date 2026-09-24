import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <Loader2 className={`animate-spin text-primary ${sizeClasses[size]} ${className}`} />
  );
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm font-medium text-brand-muted">{message}</p>
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-saas border border-brand-border p-5 shadow-subtle animate-pulse ${className}`}>
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
      <div className="h-8 bg-slate-200 rounded w-1/2 mb-4" />
      <div className="h-2.5 bg-slate-200 rounded w-full" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="bg-white rounded-saas border border-brand-border overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-100 border-b border-brand-border" />
      <div className="divide-y divide-brand-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-1/6" />
            <div className="h-4 bg-slate-200 rounded w-1/8" />
            <div className="h-6 bg-slate-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};
