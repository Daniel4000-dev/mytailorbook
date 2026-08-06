'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { FaXmark } from 'react-icons/fa6';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subHeader?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
}

export default function BottomSheet({ isOpen, onClose, title, subHeader, children, footer, noPadding }: BottomSheetProps) {
  const [direction, setDirection] = useState<'bottom' | 'right'>('bottom');
  const mounted = useHasMounted();

  useEffect(() => {
    const handleResize = () => {
      setDirection(window.innerWidth >= 1024 ? 'right' : 'bottom');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render until client-side so direction and vaul styles never mismatch SSR
  if (!mounted) return null;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction={direction}
      dismissible={false}
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content className={styles.content}>
          <div className={styles.handle} />
          <div className={styles.header}>
            {title && <Drawer.Title className={styles.title}>{title}</Drawer.Title>}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close details">
              <FaXmark />
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
