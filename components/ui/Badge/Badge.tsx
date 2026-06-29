'use client';

import { type ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'cutting' | 'sewing' | 'ready' | 'completed' | 'default' | 'gold';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
}: BadgeProps) {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
  ].join(' ');

  return <span className={classNames}>{children}</span>;
}
