import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div 
        role="dialog"
        aria-modal="true"
        className={`relative bg-[#111827] text-[#F8FAFC] rounded-2xl border border-[#243047] shadow-2xl w-full ${maxWidthStyles[maxWidth]} z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#243047] bg-[#0F172A]/70">
          <div>
            <h3 className="text-lg font-semibold text-[#F8FAFC]">{title}</h3>
            {description && <p className="text-xs text-[#94A3B8] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] p-1.5 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[calc(85vh-130px)] overflow-y-auto text-[#CBD5E1]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#243047] bg-[#0F172A]/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
