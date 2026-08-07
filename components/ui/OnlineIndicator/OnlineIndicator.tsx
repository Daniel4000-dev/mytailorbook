'use client';

import { useState, useEffect } from 'react';
import styles from './OnlineIndicator.module.css';

interface OnlineIndicatorProps {
  className?: string;
}

export default function OnlineIndicator({ className = '' }: OnlineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`${styles.indicator} ${isOnline ? styles.online : styles.offline} ${className}`}>
      <div className={styles.dot} />
      <span className={styles.text}>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
