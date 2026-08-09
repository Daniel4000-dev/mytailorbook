'use client';

import { useState } from 'react';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import { DISCOVER_CARDS } from '../discoverCards';
import styles from './DiscoverBanner.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

const DISMISS_COOKIE = 'mtb_discover_dismissed';

// Desktop counterpart to mobile's swipeable DiscoverCarousel — the full
// four-card promotional grid is redundant on desktop (every destination it
// points to — Portfolio, Style Gallery, Settings — is already one click
// away in the sidebar, unlike mobile where they're a tap deeper), but
// dropping the tip entirely loses real onboarding value for shop owners
// who won't discover WhatsApp/portfolio-sharing from a nav label alone.
// One dismissible tip, not four permanent cards, splits the difference.
export default function DiscoverBanner({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [dismissed, setDismissed] = useState(() => getClientCookie(DISMISS_COOKIE) === '1');
  const tip = DISCOVER_CARDS[0];

  if (dismissed) return null;

  const dismiss = () => {
    setClientCookie(DISMISS_COOKIE, '1');
    setDismissed(true);
  };

  return (
    <div className={styles.banner}>
      <div className={styles.icon}>{tip.icon}</div>
      <div className={styles.text}>
        <span className={styles.title}>{tip.title}</span>
        <span className={styles.desc}>{tip.description}</span>
      </div>
      <button type="button" className={styles.cta} onClick={() => onNavigate(tip.href)}>
        {tip.cta}
      </button>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss tip">
        <Symbol name="close" size={16} />
      </button>
    </div>
  );
}
