'use client';

import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button/Button';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger-styled confirm button for destructive actions (default) vs.
   *  primary styling for consequential-but-not-destructive ones. */
  destructive?: boolean;
  loading?: boolean;
}

/** A lightweight confirm step for hard-to-reverse actions. Deliberately its
 *  own small fixed overlay rather than a nested BottomSheet — it's routinely
 *  opened from inside an already-open sheet (e.g. confirming a delete from
 *  within StyleProfileSheet), and stacking two vaul Drawers is unreliable.
 *
 *  Rendered via a portal straight onto document.body: vaul's open
 *  Drawer.Content applies a CSS transform for its slide animation, which
 *  creates a new containing block for any `position: fixed` descendant —
 *  without the portal, this dialog would render fixed *relative to the
 *  sheet* instead of the viewport, pushing it (and its buttons) off-screen. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const mounted = useHasMounted();

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.actions}>
          <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} fullWidth onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
