'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  icon?: ReactNode;
  prefix?: string;
}

export default function Input({
  label,
  error,
  icon,
  prefix,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={`${styles.inputContainer} ${error ? styles.hasError : ''} ${className || ''}`}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input id={inputId} className={styles.input} {...props} />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
