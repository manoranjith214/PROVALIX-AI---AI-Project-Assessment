import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const LogoutDialog: React.FC<LogoutDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-subtitle"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={!isLoading ? onClose : undefined}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-[#111827] border border-[#243047] rounded-2xl p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-200 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center shrink-0 text-[#EF4444]">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="logout-dialog-title"
              className="text-lg font-bold text-[#F8FAFC] tracking-tight"
            >
              Sign out of Provalix AI?
            </h2>
            <p
              id="logout-dialog-subtitle"
              className="mt-1 text-xs sm:text-sm text-[#94A3B8] leading-relaxed"
            >
              You will need to sign in again to access your account.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#243047]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#CBD5E1] bg-transparent border border-[#334155] hover:bg-[#1E293B] hover:text-[#F8FAFC] transition-colors focus:outline-none focus:ring-1 focus:ring-[#7C3AED] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] active:bg-[#B91C1C] disabled:opacity-60 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:ring-offset-2 focus:ring-offset-[#111827] cursor-pointer"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
