import React from 'react';
import { Card } from '../ui/Card';
import { Progress } from '../ui/Progress';

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore: number;
  subtitle?: string;
  variant?: 'primary' | 'success' | 'amber' | 'error' | 'ai' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  maxScore,
  subtitle,
  variant = 'auto',
  size = 'md',
  className = '',
  icon,
}) => {
  const percentage = Math.round((score / maxScore) * 100);

  const getScoreColor = () => {
    if (variant === 'ai') return 'text-ai-purple';
    if (variant === 'primary') return 'text-primary';
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-amber';
    return 'text-error';
  };

  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted block">
            {title}
          </span>
          {subtitle && <p className="text-xs text-brand-slate mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-50 border border-brand-border text-brand-slate shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`font-bold tracking-tight ${size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-2xl' : 'text-3xl'} ${getScoreColor()}`}>
          {score}
        </span>
        <span className="text-sm font-semibold text-brand-muted">
          / {maxScore}
        </span>
        <span className="ml-auto text-xs font-medium text-brand-muted">
          {percentage}%
        </span>
      </div>

      <Progress value={score} max={maxScore} variant={variant} size={size === 'lg' ? 'md' : 'sm'} />
    </Card>
  );
};
