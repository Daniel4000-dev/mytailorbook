'use client';


import type { ToastItem } from '@/contexts/ToastContext';
import styles from './Toast.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

const ICONS = {
  success: <Symbol name="check_circle" />,
  error: <Symbol name="error" />,
  info: <Symbol name="info" />,
};

export default function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.icon}>{ICONS[toast.type]}</span>
          <span className={styles.message}>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <Symbol name="close" />
          </button>
        </div>
      ))}
    </div>
  );
}
