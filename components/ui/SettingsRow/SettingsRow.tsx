'use client';

import type { ReactNode } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './SettingsRow.module.css';

export type SettingsIconColor =
  | 'indigo'
  | 'amber'
  | 'emerald'
  | 'blue'
  | 'purple'
  | 'rose'
  | 'slate'
  | 'coral';

interface SettingsRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  iconColor?: SettingsIconColor;
  /** e.g. a count badge ("4", "7") shown before the chevron. */
  meta?: ReactNode;
  onClick: () => void;
  /** Danger-styled label for irreversible/destructive-leaning rows. */
  destructive?: boolean;
}

/** A single tappable row: colored squircle icon tile, label (+ optional subtitle),
 *  optional trailing meta, chevron. The building block for every grouped list
 *  in Settings matching Apple iOS / Atelier luxury standards. */
export default function SettingsRow({
  icon,
  label,
  subtitle,
  iconColor = 'indigo',
  meta,
  onClick,
  destructive,
}: SettingsRowProps) {
  const colorClass = destructive ? styles.tileCoral : (styles[`tile_${iconColor}`] || styles.tile_indigo);

  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <div className={`${styles.iconTile} ${colorClass}`}>
        <Symbol name={icon} size={18} className={destructive ? styles.iconDanger : styles.iconGlyph} />
      </div>
      <span className={styles.textCol}>
        <span className={`${styles.label} ${destructive ? styles.labelDanger : ''}`}>{label}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <Symbol name="chevron_right" size={18} className={styles.chevron} />
    </button>
  );
}
