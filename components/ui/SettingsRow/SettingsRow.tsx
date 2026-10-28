'use client';

import type { ReactNode } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './SettingsRow.module.css';

interface SettingsRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  /** e.g. a count badge ("4", "7") shown before the chevron. */
  meta?: ReactNode;
  onClick: () => void;
  /** Danger-styled label for irreversible/destructive-leaning rows. */
  destructive?: boolean;
}

/** A single tappable settings row matching Apple iOS / WhatsApp "You" tab standard:
 *  Crisp monochrome glyph icon, label (+ optional subtitle), optional trailing meta, chevron. */
export default function SettingsRow({
  icon,
  label,
  subtitle,
  meta,
  onClick,
  destructive,
}: SettingsRowProps) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <div className={styles.iconWrap}>
        <Symbol
          name={icon}
          size={21}
          className={destructive ? styles.iconDanger : styles.iconGlyph}
        />
      </div>
      <span className={styles.textCol}>
        <span className={`${styles.label} ${destructive ? styles.labelDanger : ''}`}>{label}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <Symbol name="chevron_right" size={17} className={styles.chevron} />
    </button>
  );
}
