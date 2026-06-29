'use client';

import type { ReactNode } from 'react';
import { FaPlus } from 'react-icons/fa6';
import styles from './FAB.module.css';

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export default function FAB({ onClick, icon, label = 'Create new' }: FABProps) {
  return (
    <button className={styles.fab} onClick={onClick} aria-label={label}>
      {icon || <FaPlus />}
    </button>
  );
}
