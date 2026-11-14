'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './AdminModeFilter.module.css';

export type AdminMode = 'all' | 'bespoke' | 'rtw' | 'hybrid';

interface AdminModeFilterProps {
  counts?: {
    all?: number;
    bespoke?: number;
    rtw?: number;
    hybrid?: number;
  };
}

export default function AdminModeFilter({ counts }: AdminModeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMode = (searchParams.get('mode') as AdminMode) || 'all';

  const setMode = (mode: AdminMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'all') {
      params.delete('mode');
    } else {
      params.set('mode', mode);
    }
    // Reset to page 1 if on paginated screen
    if (params.has('page')) params.set('page', '1');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className={styles.segmentedWrap} role="region" aria-label="Filter atelier mode">
      <div className={styles.segmentedControl}>
        <button
          type="button"
          onClick={() => setMode('all')}
          className={`${styles.segmentBtn} ${currentMode === 'all' ? styles.segmentBtnActive : ''}`}
        >
          <Symbol name="hub" size={15} />
          <span>All Modes</span>
          {typeof counts?.all === 'number' && <span className={styles.countBadge}>{counts.all}</span>}
        </button>

        <button
          type="button"
          onClick={() => setMode('bespoke')}
          className={`${styles.segmentBtn} ${currentMode === 'bespoke' ? styles.segmentBtnActive : ''}`}
        >
          <Symbol name="checkroom" size={15} />
          <span>Bespoke</span>
          {typeof counts?.bespoke === 'number' && <span className={styles.countBadge}>{counts.bespoke}</span>}
        </button>

        <button
          type="button"
          onClick={() => setMode('rtw')}
          className={`${styles.segmentBtn} ${currentMode === 'rtw' ? styles.segmentBtnActive : ''}`}
        >
          <Symbol name="inventory_2" size={15} />
          <span>Ready-to-Wear</span>
          {typeof counts?.rtw === 'number' && <span className={styles.countBadge}>{counts.rtw}</span>}
        </button>

        <button
          type="button"
          onClick={() => setMode('hybrid')}
          className={`${styles.segmentBtn} ${currentMode === 'hybrid' ? styles.segmentBtnActive : ''}`}
        >
          <Symbol name="layers" size={15} />
          <span>Hybrid</span>
          {typeof counts?.hybrid === 'number' && <span className={styles.countBadge}>{counts.hybrid}</span>}
        </button>
      </div>
    </div>
  );
}

