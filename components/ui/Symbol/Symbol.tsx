import React from 'react';
import styles from './Symbol.module.css';
import { SVG_ICONS } from './iconRegistry';

interface SymbolProps {
  /** Icon name, e.g. "needle", "content_cut", "menu", "check_circle" */
  name: string;
  /** Render the filled variant */
  fill?: boolean;
  /** Font size in px (Icons are square glyphs) */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Symbol Icon Component
 * Prioritizes native, bulletproof SVG vector icons so glyphs never break
 * across devices, offline modes, or missing web fonts.
 * Gracefully falls back to Material Symbols Outlined font if unmapped.
 */
export default function Symbol({ name, fill = false, size = 24, className = '', style }: SymbolProps) {
  const customSvgRenderer = SVG_ICONS[name];

  if (customSvgRenderer) {
    const color = (style?.color as string) || 'currentColor';
    return (
      <span
        className={`${styles.symbol} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          verticalAlign: 'middle',
          flexShrink: 0,
          ...style,
        }}
        aria-hidden="true"
      >
        {customSvgRenderer({ size, fill, color })}
      </span>
    );
  }

  // Resilient vector fallback if an unmapped icon name is ever provided
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Symbol] Icon "${name}" is not registered in iconRegistry.tsx`);
  }

  const color = (style?.color as string) || 'currentColor';
  return (
    <span
      className={`${styles.symbol} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="8" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    </span>
  );
}
