'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Drawer } from 'vaul';

import { useHasMounted } from '@/lib/hooks/useHasMounted';
import styles from './BottomSheet.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subHeader?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
  /** Desktop-only distinction — mobile is always the bottom sheet either
   *  way. 'panel' (default) slides in from the right, for anything with
   *  multiple fields, a list, or photo+form content. 'modal' is a small
   *  centered dialog, for a quick single choice or single-field edit
   *  where a full-height side panel would be oversized. */
  variant?: 'panel' | 'modal';
}

export default function BottomSheet({ isOpen, onClose, title, subHeader, children, footer, noPadding, variant = 'panel' }: BottomSheetProps) {
  const [direction, setDirection] = useState<'bottom' | 'right'>('bottom');
  const [isDesktop, setIsDesktop] = useState(false);
  const mounted = useHasMounted();

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setDirection(desktop ? 'right' : 'bottom');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render until client-side so direction and vaul styles never mismatch SSR
  if (!mounted) return null;

  const isModal = isDesktop && variant === 'modal';

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction={direction}
      dismissible={isModal}
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content className={`${styles.content} ${isModal ? styles.contentModal : ''}`}>
          <div className={styles.handle} />
          <div className={styles.header}>
            {title && <Drawer.Title className={styles.title}>{title}</Drawer.Title>}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close details">
              <Symbol name="close" />
            </button>
          </div>
          {subHeader && <div className={styles.subHeader}>{subHeader}</div>}
          <div className={`${styles.body} ${noPadding ? styles.noPadding : ''}`}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
