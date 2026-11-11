import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}

/**
 * Shared accessible native `<dialog>` wrapper for Super-Admin modals.
 * Pins the close icon permanently in the top-right header corner, provides
 * light-dismiss (`closedby="any"` + fallback) and scroll containment.
 */
export const AdminDialog: React.FC<AdminDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  maxWidth = 960,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    } else if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  }, [open]);

  // Progressive fallback for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, [open]);

  if (!open) return null;

  const handleCloseClick = () => {
    const dialog = dialogRef.current;
    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      style={{ width: `min(${maxWidth}px, calc(100vw - 24px))` }}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {/* Fixed Header with Pinned Top-Right Close Icon */}
      <div
        style={{
          padding: '20px 24px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: 700,
                lineHeight: 1.35,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div style={{ fontSize: '12.5px', color: '#9ca3af', marginTop: '5px' }}>
                {subtitle}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            aria-label="Close dialog"
            title="Close (Esc)"
            style={{
              flexShrink: 0,
              width: '34px',
              height: '34px',
              borderRadius: '9999px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#e5e7eb',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {headerExtra && <div style={{ marginTop: '14px' }}>{headerExtra}</div>}
      </div>

      {/* Scrollable Dialog Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '20px 24px',
        }}
      >
        {children}
      </div>
    </dialog>
  );
};
