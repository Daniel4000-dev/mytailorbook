'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FaTriangleExclamation } from 'react-icons/fa6';
import styles from './error.module.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface it in dev tools / server logs; a real error-tracking service
    // (Sentry, etc.) can be wired in here later without touching the UI.
    console.error(error);
  }, [error]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <FaTriangleExclamation />
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          We hit an unexpected error loading this page. This has been logged — try again, or head back to your dashboard.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.retryBtn} onClick={() => reset()}>
            Try Again
          </button>
          <Link href="/dashboard" className={styles.homeLink}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
