import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { formatUserFriendlyError } from '../utils/formatError.ts';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: { title?: string; duration?: number }) => {
      if (!message || !message.trim()) return;

      const cleanMessage = type === 'error'
        ? formatUserFriendlyError(message)
        : message.trim();

      // Deduplication: prevent stacking identical messages within 3 seconds
      const now = Date.now();
      const dedupKey = `${type}:${cleanMessage}`;
      const lastShown = recentToastsRef.current.get(dedupKey);

      if (lastShown && now - lastShown < 3000) {
        // Already active or shown within last 3s; ignore duplicate trigger
        return;
      }
      recentToastsRef.current.set(dedupKey, now);

      // Clean up aged entries from map
      for (const [key, timestamp] of recentToastsRef.current.entries()) {
        if (now - timestamp > 10000) {
          recentToastsRef.current.delete(key);
        }
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const duration = options?.duration ?? (type === 'error' ? 5000 : 4000);
      const title =
        options?.title ??
        (type === 'error'
          ? 'Action Required'
          : type === 'success'
          ? 'Success'
          : type === 'warning'
          ? 'Attention'
          : 'Notice');

      const newToast: Toast = {
        id,
        type,
        message: cleanMessage,
        title,
        duration,
      };

      setToasts((prev) => {
        // Also ensure not currently already in active array with same message
        const alreadyInList = prev.some((t) => t.type === type && t.message === cleanMessage);
        if (alreadyInList) return prev;
        return [...prev.slice(-2), newToast]; // keep max 3 on screen
      });

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const showError = useCallback(
    (message: string, title?: string, duration?: number) => {
      const friendly = formatUserFriendlyError(message);
      showToast(friendly, 'error', { title: title || 'Action Required', duration: duration || 5000 });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast(message, 'success', { title: title || 'Completed', duration: duration || 4000 });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast(message, 'warning', { title: title || 'Warning', duration: duration || 4500 });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast(message, 'info', { title: title || 'Information', duration: duration || 4000 });
    },
    [showToast]
  );

  // Expose global window helpers so any service/API handler can fire a toast
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showToast = showToast;
      (window as any).showError = showError;
      (window as any).showSuccess = showSuccess;
      (window as any).showWarning = showWarning;
    }
  }, [showToast, showError, showSuccess, showWarning]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} color="var(--color-danger, #ef4444)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'success':
        return <CheckCircle2 size={18} color="var(--color-success, #10a37f)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-warning, #f59e0b)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'info':
      default:
        return <Info size={18} color="var(--color-info, #38bdf8)" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        dismissToast,
      }}
    >
      {children}

      {/* Floating Material Toast / Snackbar Container at Bottom Right */}
      <div className="toast-container" aria-live="polite" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}`}
            onClick={() => dismissToast(t.id)}
            role="alert"
          >
            {renderIcon(t.type)}
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.25, marginBottom: '2px' }}>
                  {t.title}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #b4b4b4)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {t.message}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(t.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim, #8e8ea0)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0,
              }}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if called outside provider
    return {
      toasts: [],
      showToast: (msg: string, type: ToastType = 'info') => {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(msg, type);
        } else {
          console.warn(`[Toast:${type}] ${msg}`);
        }
      },
      showError: (msg: string) => {
        if (typeof window !== 'undefined' && (window as any).showError) {
          (window as any).showError(msg);
        } else {
          console.error(`[Toast:error] ${msg}`);
        }
      },
      showSuccess: (msg: string) => {
        if (typeof window !== 'undefined' && (window as any).showSuccess) {
          (window as any).showSuccess(msg);
        } else {
          console.log(`[Toast:success] ${msg}`);
        }
      },
      showWarning: (msg: string) => {
        if (typeof window !== 'undefined' && (window as any).showWarning) {
          (window as any).showWarning(msg);
        } else {
          console.warn(`[Toast:warning] ${msg}`);
        }
      },
      showInfo: (msg: string) => {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(msg, 'info');
        } else {
          console.info(`[Toast:info] ${msg}`);
        }
      },
      dismissToast: () => {},
    };
  }
  return context;
};

