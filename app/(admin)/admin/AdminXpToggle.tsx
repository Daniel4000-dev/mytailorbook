'use client';

import { useState, useTransition, useEffect } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import { adminToggleXpSystemAction } from './active-users/actions';
import styles from './layout.module.css';

interface AdminXpToggleProps {
  initialEnabled?: boolean;
}

export default function AdminXpToggle({ initialEnabled = false }: AdminXpToggleProps) {
  const [isPluggedIn, setIsPluggedIn] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const val = getClientCookie('mtb_xp_plugged_in');
    if (val !== null) {
      setIsPluggedIn(val === '1');
    }
  }, []);

  const handleToggle = () => {
    if (isPending) return;
    const targetState = !isPluggedIn;

    // Optimistic UI update
    setIsPluggedIn(targetState);
    setClientCookie('mtb_xp_plugged_in', targetState ? '1' : '0');

    startTransition(async () => {
      const res = await adminToggleXpSystemAction(targetState);
      if (res.success) {
        setIsPluggedIn(res.isPluggedIn);
        setClientCookie('mtb_xp_plugged_in', res.isPluggedIn ? '1' : '0');
      } else {
        // Rollback on failure
        setIsPluggedIn(!targetState);
        setClientCookie('mtb_xp_plugged_in', !targetState ? '1' : '0');
        alert(res.error || 'Failed to toggle XP system.');
      }
    });
  };

  return (
    <button
      type="button"
      className={`${styles.xpToggleBtn} ${isPluggedIn ? styles.xpToggleBtnOn : styles.xpToggleBtnOff}`}
      onClick={handleToggle}
      disabled={isPending}
      title={
        isPluggedIn
          ? 'XP System is PLUGGED IN (Active). Click to unplug and suspend XP awards.'
          : 'XP System is UNPLUGGED (Suspended). Click to plug in and activate XP awards.'
      }
      aria-label={isPluggedIn ? 'XP System Plugged In' : 'XP System Unplugged'}
    >
      <Symbol
        name={isPluggedIn ? 'bolt' : 'power_settings_new'}
        size={14}
      />
      <span>
        {isPending
          ? 'Switching...'
          : isPluggedIn
          ? 'XP: ON'
          : 'XP: OFF'}
      </span>
    </button>
  );
}
