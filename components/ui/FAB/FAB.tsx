'use client';

import type { ReactNode } from 'react';

import styles from './FAB.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export default function FAB({ onClick, icon, label = 'Create new' }: FABProps) {
  return (
    <button className={styles.fab} onClick={onClick} aria-label={label}>
      {icon || <Symbol name="add" />}
    </button>
  );
}
