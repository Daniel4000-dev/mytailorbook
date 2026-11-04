'use client';

import { useEffect, type ReactNode } from 'react';
import styles from './Modal.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');

      // Prevent wheel/touch scrolling on background document
      const handlePreventBackgroundTouch = (e: TouchEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target || !target.closest(`.${styles.body}`)) {
          e.preventDefault();
        }
      };

      document.addEventListener('touchmove', handlePreventBackgroundTouch, { passive: false });

      return () => {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
        document.removeEventListener('touchmove', handlePreventBackgroundTouch);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {title ? <h3 className={styles.title}>{title}</h3> : null}
          <button className={styles.close} onClick={onClose} aria-label="Close modal">
            <Symbol name="close" size={20} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
