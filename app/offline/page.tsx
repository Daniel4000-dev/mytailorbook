'use client';


import styles from './page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

/** Last-resort fallback the service worker serves from its own cache when
 *  a navigation fails offline AND that specific page was never visited
 *  before (so there's no "last known" version of it to show instead —
 *  see public/sw.js). Must stay fully self-contained: no data fetching,
 *  no auth dependency, since it may render with zero network access. */
export default function OfflinePage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Symbol name="wifi" />
        </div>
        <h1 className={styles.title}>You&apos;re offline</h1>
        <p className={styles.message}>
          This page hasn&apos;t been loaded before, so there&apos;s nothing saved to show yet. Reconnect and
          try again — pages you&apos;ve already visited will keep working offline.
        </p>
        <button type="button" className={styles.retryBtn} onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
}
