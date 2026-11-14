'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

export default function AdminThemeToggle() {
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
    if (preference === 'dark') return 'Dark Mode';
    if (preference === 'light') return 'Light Mode';
    return 'Auto (System)';
  };

  return (
    <button
      type="button"
      className={styles.themeToggleBtn}
      onClick={handleToggle}
      title={`Appearance: ${getLabel()} (click to cycle)`}
      aria-label={`Appearance: ${getLabel()}`}
    >
      <Symbol name={getIcon()} size={14} />
      <span className={styles.themeToggleText}>
        {preference === 'system' ? 'Auto' : preference === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
