'use client';

import type { TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function TextArea({
  label,
  error,
  className,
  id,
  ...props
}: TextAreaProps) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={`${styles.textareaContainer} ${error ? styles.hasError : ''} ${className || ''}`}
      >
        <textarea id={textareaId} className={styles.textarea} {...props} />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
