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

/** A single tappable row: icon, label (+ optional subtitle), optional
 *  trailing meta, chevron. The building block for every grouped list in
 *  Settings — reusable rather than one bespoke card per section. */
export default function SettingsRow({ icon, label, subtitle, meta, onClick, destructive }: SettingsRowProps) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <Symbol name={icon} size={20} className={destructive ? styles.iconDanger : styles.icon} />
      <span className={styles.textCol}>
        <span className={`${styles.label} ${destructive ? styles.labelDanger : ''}`}>{label}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <Symbol name="chevron_right" size={18} className={styles.chevron} />
    </button>
  );
}
