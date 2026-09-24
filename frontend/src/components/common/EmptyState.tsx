import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <Card className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-brand-border flex items-center justify-center text-brand-slate mb-4">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-brand-dark mb-1">
        {title}
      </h3>
      <p className="text-sm text-brand-muted max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </Card>
  );
};
