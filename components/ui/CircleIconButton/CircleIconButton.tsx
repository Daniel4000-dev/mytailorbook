'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './CircleIconButton.module.css';

interface CircleIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  ariaLabel: string;
}

export default function CircleIconButton({
  icon,
  ariaLabel,
  className = '',
  ...props
}: CircleIconButtonProps) {
  return (
    <button
      className={`${styles.circleBtn} ${className}`}
      aria-label={ariaLabel}
      type="button"
      {...props}
    >
      {icon}
    </button>
  );
}
