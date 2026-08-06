'use client';


import styles from './SearchBar.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className={styles.wrapper}>
      <Symbol name="search" className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear search">
          <Symbol name="close" />
        </button>
      )}
    </div>
  );
}
