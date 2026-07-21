'use client';

import styles from './FilterPill.module.css';

interface FilterPillProps {
  label: string;
  /** Small count badge inside the pill */
  count?: number;
  /** Selected pills render solid in their stage color */
  active?: boolean;
  /** Stage color pair; omit for the neutral pill (e.g. "All", "My Orders") */
  color?: string;
  colorBg?: string;
  onClick?: () => void;
}

/**
 * Horizontally-scrollable filter pill from the mockup.
 * Neutral: quiet surface pill; solid surface-variant when active.
 * Stage-colored: tinted (10% bg + colored text) when idle,
 * solid stage color with white text + shadow when active.
 */
export default function FilterPill({ label, count, active = false, color, colorBg, onClick }: FilterPillProps) {
  const tone = color ? (active ? styles.stageActive : styles.stage) : (active ? styles.neutralActive : styles.neutral);
  return (
    <button
      type="button"
      className={`${styles.pill} ${tone}`}
      style={color ? ({ '--pill-color': color, '--pill-bg': colorBg } as React.CSSProperties) : undefined}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  );
}
