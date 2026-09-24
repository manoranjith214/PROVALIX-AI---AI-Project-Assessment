import React from 'react';
import { Link } from 'react-router-dom';

export type LogoVariant = 'full' | 'compact' | 'horizontal' | 'icon-only';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ProvalixLogoProps {
  /**
   * Variant of the logo:
   * - 'full': Complete vertical official logo with mark, wordmark, and tagline (/provalix-logo.png)
   * - 'horizontal': Official horizontal lockup mark + wordmark (/provalix-logo-horizontal.png)
   * - 'compact': Official icon mark with modern typographic wordmark & optional subtitle
   * - 'icon-only': Official P+brain+check+book icon mark only (/provalix-icon.png)
   */
  variant?: LogoVariant;
  /**
   * Predefined size presets
   */
  size?: LogoSize;
  /**
   * Optional custom CSS class name applied to container
   */
  className?: string;
  /**
   * Whether to display the subtitle under the wordmark in 'compact' variant
   */
  showSubtitle?: boolean;
  /**
   * Custom subtitle text (default: 'AI PROJECT ASSESSMENT')
   */
  subtitle?: string;
  /**
   * If true, wraps the logo in a React Router <Link>
   */
  to?: string;
  /**
   * Add subtle pulse animation (useful for loading screens)
   */
  animated?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
}

const iconSizeMap: Record<LogoSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-9 h-9 sm:w-10 sm:h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const fullHeightMap: Record<LogoSize, string> = {
  xs: 'h-8 max-w-[120px]',
  sm: 'h-10 max-w-[160px]',
  md: 'h-14 max-w-[220px]',
  lg: 'h-20 max-w-[320px]',
  xl: 'h-28 max-w-[420px]',
};

const horizontalHeightMap: Record<LogoSize, string> = {
  xs: 'h-6',
  sm: 'h-7 sm:h-8',
  md: 'h-9 sm:h-10',
  lg: 'h-12 sm:h-14',
  xl: 'h-16 sm:h-20',
};

const titleSizeMap: Record<LogoSize, string> = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg sm:text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export const ProvalixLogo: React.FC<ProvalixLogoProps> = ({
  variant = 'compact',
  size = 'md',
  className = '',
  showSubtitle = true,
  subtitle = 'AI PROJECT ASSESSMENT',
  to,
  animated = false,
  onClick,
}) => {
  const animClass = animated ? 'animate-pulse' : '';

  const renderContent = () => {
    switch (variant) {
      case 'icon-only':
        return (
          <img
            src="/provalix-icon.png"
            alt="Provalix AI"
            className={`${iconSizeMap[size]} object-contain shrink-0 drop-shadow-sm select-none transition-transform duration-200 ${animClass}`}
            loading="eager"
            decoding="async"
          />
        );

      case 'full':
        return (
          <img
            src="/provalix-logo.png"
            alt="Provalix AI — From Project Submission to Intelligent Evaluation"
            className={`${fullHeightMap[size]} w-auto object-contain drop-shadow-md select-none transition-transform duration-200 ${animClass}`}
            loading="eager"
            decoding="async"
          />
        );

      case 'horizontal':
        return (
          <img
            src="/provalix-logo-horizontal.png"
            alt="Provalix AI"
            className={`${horizontalHeightMap[size]} w-auto object-contain drop-shadow-sm select-none transition-transform duration-200 ${animClass}`}
            loading="eager"
            decoding="async"
          />
        );

      case 'compact':
      default:
        return (
          <div className="flex items-center gap-2.5 sm:gap-3 select-none">
            <img
              src="/provalix-icon.png"
              alt="Provalix AI Mark"
              className={`${iconSizeMap[size]} object-contain shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105 ${animClass}`}
              loading="eager"
              decoding="async"
            />
            <div className="flex flex-col leading-none">
              <span className={`font-black tracking-tight text-[#F8FAFC] ${titleSizeMap[size]}`}>
                PROVALIX <span className="text-[#A78BFA] font-bold">AI</span>
              </span>
              {showSubtitle && subtitle && (
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#94A3B8] tracking-widest uppercase mt-0.5">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        );
    }
  };

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#7C3AED] rounded-xl group ${className}`}
        aria-label="Provalix AI"
      >
        {renderContent()}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      aria-label="Provalix AI"
    >
      {renderContent()}
    </div>
  );
};

export default ProvalixLogo;
