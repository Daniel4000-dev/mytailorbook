'use client';

import { type SelectHTMLAttributes, useId } from 'react';

import styles from './Select.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export default function Select({
  label,
  error,
  options,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className,
  ...rest
}: SelectProps) {
  const id = useId();

  const wrapperClasses = [
    styles.wrapper,
    error ? styles.error : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && ' *'}
        </label>
      )}
      <div className={styles.selectContainer}>
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={styles.select}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className={styles.placeholder}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Symbol name="expand_more" className={styles.chevron} />
      </div>
      {error && (
        <span id={`${id}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
