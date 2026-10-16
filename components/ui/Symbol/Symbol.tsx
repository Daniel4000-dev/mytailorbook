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

  // Graceful fallback to self-hosted Material Symbols font
  return (
    <span
      className={`material-symbols-outlined ${styles.symbol} ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: fill ? "'FILL' 1" : undefined,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
