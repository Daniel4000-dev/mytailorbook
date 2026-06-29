'use client';

import { type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  variant?: 'default' | 'elevated';
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export default function Card({
  variant = 'default',
  onClick,
  children,
  className,
}: CardProps) {
  const classNames = [
    styles.card,
    variant === 'elevated' ? styles.elevated : '',
    onClick ? styles.interactive : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
