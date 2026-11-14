'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './ThemeTogglePill.module.css';

interface ThemeTogglePillProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeTogglePill({ className = '', showLabel = true }: ThemeTogglePillProps) {
  const { preference, setPreference } = useTheme();

  const handleToggle = () => {
    if (preference === 'light') {
      setPreference('dark');
    } else if (preference === 'dark') {
      setPreference('system');
    } else {
      setPreference('light');
    }
  };

  const getIcon = () => {
    if (preference === 'dark') return 'dark_mode';
    if (preference === 'light') return 'light_mode';
    return 'contrast';
  };

  const getLabel = () => {
    if (preference === 'dark') return 'Dark';
    if (preference === 'light') return 'Light';
    return 'Auto';
  };

  return (
    <button
      type="button"
      className={`${styles.toggleBtn} ${className}`}
      onClick={handleToggle}
      title={`Appearance: ${getLabel()} (click to cycle: Light → Dark → Auto)`}
      aria-label={`Appearance: ${getLabel()}`}
    >
      <Symbol name={getIcon()} size={15} />
      {showLabel && <span className={styles.label}>{getLabel()}</span>}
    </button>
  );
}

