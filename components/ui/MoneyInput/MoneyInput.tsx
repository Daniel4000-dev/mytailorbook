'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import Input from '@/components/ui/Input/Input';
import { formatNumber } from '@/lib/formatters';

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: ReactNode;
  error?: string;
  /** Raw digit string, e.g. "150000" — no commas, no currency symbol.
   *  This is what the parent stores/submits; formatting is display-only. */
  value: string;
  /** Always receives the same raw digit-string shape as `value`. */
  onChange: (rawDigits: string) => void;
}

/** Comma-formats a money amount live as the user types (e.g. typing
 *  "150000" displays as "150,000"), while the value the parent actually
 *  stores stays a plain digit string — no parsing/reformatting needed
 *  anywhere else. Drop-in replacement for any `<input inputMode="numeric">`
 *  or `<Input inputMode="numeric">` that collects a Naira amount. */
export default function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  const displayValue = value ? formatNumber(Number(value)) : '';

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
    />
  );
}
