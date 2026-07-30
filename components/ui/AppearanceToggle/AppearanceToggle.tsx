'use client';

import { useState } from 'react';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import SettingsRow from '@/components/ui/SettingsRow/SettingsRow';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import styles from './AppearanceToggle.module.css';

const OPTIONS: { value: ThemePreference; label: string; subtitle: string; icon: string }[] = [
  { value: 'system', label: 'Match Device', subtitle: 'Follows your phone’s setting', icon: 'smartphone' },
  { value: 'light', label: 'Light', subtitle: 'Always light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', subtitle: 'Always dark', icon: 'dark_mode' },
];

const LABELS: Record<ThemePreference, string> = {
  system: 'Match Device',
  light: 'Light',
  dark: 'Dark',
};

/** A single Settings row that opens a sheet to pick Light/Dark/Match
 *  Device — self-contained so it drops into any settings screen without
 *  touching that page's own open-sheet state machine. */
export default function AppearanceToggle() {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        icon="contrast"
        label="Appearance"
        subtitle={LABELS[preference]}
        onClick={() => setOpen(true)}
      />
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Appearance">
        <div className={styles.list}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={styles.option}
              onClick={() => {
                setPreference(opt.value);
                setOpen(false);
              }}
            >
              <Symbol name={opt.icon} size={22} className={styles.optionIcon} />
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{opt.label}</span>
                <span className={styles.optionSubtitle}>{opt.subtitle}</span>
              </span>
              {preference === opt.value && <Symbol name="check_circle" size={20} className={styles.optionCheck} fill />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
