'use client';

import { useTransition } from 'react';
import { toggleAffiliateActive } from './actions';
import styles from './page.module.css';

export default function AffiliateToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={styles.toggleButton}
      disabled={pending}
      onClick={() => startTransition(async () => {
        await toggleAffiliateActive(id, !active);
      })}
    >
      {active ? 'Deactivate' : 'Activate'}
    </button>
  );
}
