'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import FilterPill from '@/components/ui/FilterPill/FilterPill';
import { GARMENT_STYLES } from '@/lib/constants';
import { getPendingStyleCountsAction } from '@/app/actions';
import styles from './page.module.css';

type GenderFilter = 'all' | 'male' | 'female';

export default function StyleGalleryPage() {
  const { currentShop } = useData();
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentShop?.id) return;
    getPendingStyleCountsAction(currentShop.id)
      .then(setPendingCounts)
      .finally(() => setLoaded(true));
  }, [currentShop?.id]);

  const visibleStyles = useMemo(
    () => (genderFilter === 'all' ? GARMENT_STYLES : GARMENT_STYLES.filter((s) => s.gender === genderFilter)),
    [genderFilter]
  );

  return (
    <PageLayout
      header={
        <TopBar
          title="Style Gallery"
          subtitle="Photos worth showing your customers"
          rightAction={
            <div className={styles.headerActions}>
              <NotificationBell />
            </div>
          }
        />
      }
    >
      <p className={styles.intro}>
        Spot a great style somewhere? Add a photo here. Once the owner approves it, it&apos;s ready to send
        to any customer who loves that style.
      </p>

      <div className={styles.pillRow}>
        <FilterPill label="All" active={genderFilter === 'all'} onClick={() => setGenderFilter('all')} />
        <FilterPill label="Male" active={genderFilter === 'male'} onClick={() => setGenderFilter('male')} />
        <FilterPill label="Female" active={genderFilter === 'female'} onClick={() => setGenderFilter('female')} />
      </div>

      <div className={styles.grid}>
        {visibleStyles.map((s) => {
          const pending = pendingCounts[s.name] || 0;
          return (
            <Link key={s.name} href={`/styles/${encodeURIComponent(s.name)}`} className={styles.card}>
              <div className={styles.photo}>
                <Image src={s.photoUrl} alt="" width={400} height={400} />
                {loaded && pending > 0 && <span className={styles.pendingBadge}>{pending} new</span>}
              </div>
              <div className={styles.label}>
                <h3>{s.name}</h3>
                <p>{s.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
