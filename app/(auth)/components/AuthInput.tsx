'use client';

import { useState, type InputHTMLAttributes } from 'react';
import styles from './AuthInput.module.css';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  hasEyeIcon?: boolean;
}

export default function AuthInput({
  label,
  id,
  type = 'text',
  hasEyeIcon = false,
  className,
  ...props
}: AuthInputProps) {
  const [showContent, setShowContent] = useState(false);

  // Toggle type between raw text and target type when visibility button is toggled
  const currentType = hasEyeIcon
    ? (showContent ? 'text' : type)
    : type;

  return (
    <div className={styles.fieldGroup}>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          className={`${styles.input} ${className || ''}`}
          placeholder=" "
          {...props}
          type={currentType}
        />
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {hasEyeIcon && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setShowContent(!showContent)}
            aria-label={`Toggle ${label} visibility`}
          >
            {showContent ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.062 12C3.418 8.054 7.397 5 12 5s8.582 3.054 9.938 7c-1.356 3.946-5.335 7-9.938 7s-8.582-3.054-9.938-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c4.6 0 8.58 3.05 9.94 7a10.42 10.42 0 0 1-4.13 4.88M3 3l18 18M18.66 18.66A10.8 10.8 0 0 1 12 19c-4.6 0-8.58-3.05-9.94-7a10.9 10.9 0 0 1 4.28-5" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
