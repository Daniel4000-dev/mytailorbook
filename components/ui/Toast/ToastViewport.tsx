'use client';

import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaXmark } from 'react-icons/fa6';
import type { ToastItem } from '@/contexts/ToastContext';
import styles from './Toast.module.css';

const ICONS = {
  success: <FaCircleCheck />,
  error: <FaCircleExclamation />,
  info: <FaCircleInfo />,
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
            <FaXmark />
          </button>
        </div>
      ))}
    </div>
  );
}
