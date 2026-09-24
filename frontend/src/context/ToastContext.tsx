import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from './ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Sanitizes technical, unhandled, or low-level API error messages
 * into clean, user-friendly and actionable text.
 */
function sanitizeMessage(rawInput: any): { title?: string; message: string } {
  if (rawInput === null || rawInput === undefined || rawInput === '') {
    return { message: 'An unexpected event occurred. Please try again.' };
  }

  let text = '';
  if (typeof rawInput === 'string') {
    text = rawInput.trim();
  } else if (rawInput instanceof Error) {
    text = rawInput.message || String(rawInput);
  } else if (typeof rawInput === 'object') {
    text = rawInput.message || rawInput.error || rawInput.msg || String(rawInput);
  } else {
    text = String(rawInput);
  }

  // Strip technical exception prefixes
  text = text.replace(/^(Error|ApiError|AxiosError|Exception|Uncaught Exception):\s*/i, '').trim();

  // Pattern matches for technical status codes / network errors
  if (/^Request failed with status code 400$/i.test(text) || (/status code 400/i.test(text) && text.length < 50)) {
    return {
      title: 'Invalid Request',
      message: 'The request could not be processed. Please check your inputs and try again.',
    };
  }

  if (/^Request failed with status code 401$/i.test(text) || /401 unauthorized/i.test(text) || /jwt expired/i.test(text)) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please sign in again to continue.',
    };
  }

  if (/^Request failed with status code 403$/i.test(text) || /403 forbidden/i.test(text)) {
    return {
      title: 'Access Restricted',
      message: 'You do not have permission to perform this action.',
    };
  }

  if (/^Request failed with status code 404$/i.test(text) || /404 not found/i.test(text)) {
    return {
      title: 'Not Found',
      message: 'The requested resource or code could not be found.',
    };
  }

  if (/Request failed with status code 5\d\d/i.test(text) || /500 internal server error/i.test(text) || /502 bad gateway/i.test(text)) {
    return {
      title: 'Server Error',
      message: 'The server is temporarily unavailable. Please try again in a few moments.',
    };
  }

  if (/failed to fetch|networkerror|econnrefused|unable to connect to provalix/i.test(text)) {
    return {
      title: 'Connection Error',
      message: 'Unable to reach the server. Please check your network connection and try again.',
    };
  }

  if (/cannot read propert(y|ies) of (undefined|null)|null is not an object|is not a function/i.test(text)) {
    return {
      title: 'Processing Error',
      message: 'Something went wrong while processing your request. Please try again.',
    };
  }

  if ((text.includes('at ') && text.includes('.js')) || text.includes('node_modules')) {
    return {
      title: 'Application Error',
      message: 'An unexpected application error occurred. Please try again.',
    };
  }

  return { message: text };
}

// Single Toast Card Component
const ToastCard: React.FC<{
  toast: ToastItem;
  theme: 'dark' | 'light';
  onDismiss: (id: string) => void;
}> = ({ toast, theme, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingTimeRef = useRef(toast.duration);

  // Visual appearance styles based on semantic type and theme
  const isDark = theme !== 'light';

  // Config per toast type
  const typeConfig = {
    error: {
      icon: <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />,
      dark: {
        container: 'bg-[#1F1115] border-[#7F1D1D] shadow-2xl shadow-red-950/40',
        iconColor: 'text-[#EF4444]',
        titleColor: 'text-[#FCA5A5]',
        messageColor: 'text-[#F8FAFC]',
        closeColor: 'text-[#CBD5E1] hover:text-white hover:bg-white/10 focus:ring-[#EF4444]/60',
        progressBar: 'bg-[#EF4444]',
      },
      light: {
        container: 'bg-[#FEF2F2] border-[#FCA5A5] shadow-xl shadow-red-500/10',
        iconColor: 'text-[#DC2626]',
        titleColor: 'text-[#7F1D1D]',
        messageColor: 'text-[#991B1B]',
        closeColor: 'text-[#7F1D1D] hover:text-[#450A0A] hover:bg-red-100 focus:ring-red-400',
        progressBar: 'bg-[#DC2626]',
      },
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />,
      dark: {
        container: 'bg-[#0E1E17] border-[#166534] shadow-2xl shadow-emerald-950/40',
        iconColor: 'text-[#22C55E]',
        titleColor: 'text-[#86EFAC]',
        messageColor: 'text-[#DCFCE7]',
        closeColor: 'text-[#CBD5E1] hover:text-white hover:bg-white/10 focus:ring-[#22C55E]/60',
        progressBar: 'bg-[#22C55E]',
      },
      light: {
        container: 'bg-[#F0FDF4] border-[#86EFAC] shadow-xl shadow-emerald-500/10',
        iconColor: 'text-[#16A34A]',
        titleColor: 'text-[#14532D]',
        messageColor: 'text-[#166534]',
        closeColor: 'text-[#166534] hover:text-[#052E16] hover:bg-emerald-100 focus:ring-emerald-400',
        progressBar: 'bg-[#16A34A]',
      },
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />,
      dark: {
        container: 'bg-[#24180A] border-[#92400E] shadow-2xl shadow-amber-950/40',
        iconColor: 'text-[#F59E0B]',
        titleColor: 'text-[#FDE68A]',
        messageColor: 'text-[#FEF3C7]',
        closeColor: 'text-[#CBD5E1] hover:text-white hover:bg-white/10 focus:ring-[#F59E0B]/60',
        progressBar: 'bg-[#F59E0B]',
      },
      light: {
        container: 'bg-[#FFFBEB] border-[#FDE68A] shadow-xl shadow-amber-500/10',
        iconColor: 'text-[#D97706]',
        titleColor: 'text-[#78350F]',
        messageColor: 'text-[#92400E]',
        closeColor: 'text-[#92400E] hover:text-[#451A03] hover:bg-amber-100 focus:ring-amber-400',
        progressBar: 'bg-[#D97706]',
      },
    },
    info: {
      icon: <Info className="w-5 h-5 shrink-0" aria-hidden="true" />,
      dark: {
        container: 'bg-[#0B1E2E] border-[#075985] shadow-2xl shadow-sky-950/40',
        iconColor: 'text-[#38BDF8]',
        titleColor: 'text-[#BAE6FD]',
        messageColor: 'text-[#E0F2FE]',
        closeColor: 'text-[#CBD5E1] hover:text-white hover:bg-white/10 focus:ring-[#38BDF8]/60',
        progressBar: 'bg-[#38BDF8]',
      },
      light: {
        container: 'bg-[#F0F9FF] border-[#BAE6FD] shadow-xl shadow-sky-500/10',
        iconColor: 'text-[#0284C7]',
        titleColor: 'text-[#0C4A6E]',
        messageColor: 'text-[#075985]',
        closeColor: 'text-[#075985] hover:text-[#082F49] hover:bg-sky-100 focus:ring-sky-400',
        progressBar: 'bg-[#0284C7]',
      },
    },
  }[toast.type];

  const currentStyle = isDark ? typeConfig.dark : typeConfig.light;

  // Auto-dismiss countdown with hover pause
  useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const intervalStep = 50;
    const interval = setInterval(() => {
      remainingTimeRef.current -= intervalStep;
      const pct = Math.max(0, (remainingTimeRef.current / toast.duration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, intervalStep);

    return () => clearInterval(interval);
  }, [isHovered, onDismiss, toast.duration, toast.id]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-200 transform animate-in fade-in slide-in-from-bottom-3 ${currentStyle.container}`}
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Semantic Icon */}
      <div className={`mt-0.5 shrink-0 ${currentStyle.iconColor}`}>
        {typeConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${currentStyle.titleColor}`}>
            {toast.title}
          </h4>
        )}
        <p className={`text-sm sm:text-[14px] font-medium leading-snug break-words ${currentStyle.messageColor}`}>
          {toast.message}
        </p>
      </div>

      {/* Keyboard accessible close button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={`p-1 -mr-1 -mt-0.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 ${currentStyle.closeColor}`}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 dark:bg-white/5 overflow-hidden">
        <div
          className={`h-full opacity-70 transition-all duration-75 ease-linear ${currentStyle.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { theme } = useTheme();

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    rawMessage: string,
    type: ToastType = 'info',
    customTitle?: string,
    duration: number = 4500
  ) => {
    const sanitized = sanitizeMessage(rawMessage);
    const finalMessage = sanitized.message;
    const finalTitle = customTitle || sanitized.title;

    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      id,
      type,
      message: finalMessage,
      title: finalTitle,
      duration,
      createdAt: Date.now(),
    };

    setToasts(prev => {
      // Limit maximum concurrent toasts to 5 to avoid screen clutter
      const filtered = prev.length >= 5 ? prev.slice(prev.length - 4) : prev;
      return [...filtered, newToast];
    });
  }, []);

  const success = useCallback(
    (msg: string, title?: string, duration?: number) => showToast(msg, 'success', title, duration),
    [showToast]
  );

  const error = useCallback(
    (msg: string, title?: string, duration?: number) => showToast(msg, 'error', title, duration),
    [showToast]
  );

  const warning = useCallback(
    (msg: string, title?: string, duration?: number) => showToast(msg, 'warning', title, duration),
    [showToast]
  );

  const info = useCallback(
    (msg: string, title?: string, duration?: number) => showToast(msg, 'info', title, duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Fixed Toast Container */}
      <aside
        aria-label="Notifications"
        className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map(toast => (
          <ToastCard
            key={toast.id}
            toast={toast}
            theme={theme}
            onDismiss={removeToast}
          />
        ))}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
