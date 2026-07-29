'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getOrderRatingsAction, setOrderRatingModerationAction, type OrderRating } from '@/app/actions';
import { formatDate } from '@/lib/formatters';
import styles from './ReviewsSection.module.css';

export default function ReviewsSection({ shopId }: { shopId: string }) {
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<OrderRating[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(() => {
    getOrderRatingsAction(shopId)
      .then((r) => {
        setRatings(r);
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (rating: OrderRating, updates: { approved?: boolean; featured?: boolean }) => {
    const reverted = rating;
    const next = { ...rating, ...updates };
    setRatings((prev) => prev.map((r) => (r.id === rating.id ? next : r)));
    try {
      await setOrderRatingModerationAction(rating.id, updates);
    } catch {
      showToast('Could not update this review', 'error');
      setRatings((prev) => prev.map((r) => (r.id === reverted.id ? reverted : r)));
    }
  };

  if (!isLoaded) return null;

  if (ratings.length === 0) {
    return (
      <EmptyState
        icon={<Symbol name="reviews" size={40} />}
        title="No reviews yet"
        description="When a customer rates a completed order from their tracking page, it shows up here for your approval."
      />
    );
  }

  return (
    <div className={styles.list}>
      {ratings.map((r) => (
        <div key={r.id} className={styles.row}>
          <div className={styles.rowHead}>
            <span className={styles.stars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            {!r.approved && <span className={styles.pendingBadge}>Pending</span>}
          </div>
          {r.comment && <p className={styles.comment}>&ldquo;{r.comment}&rdquo;</p>}
          <div className={styles.rowMeta}>
            <span className={styles.customerName}>{r.customerName}</span>
            <span className={styles.date}>{formatDate(r.submittedAt)}</span>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${r.approved ? styles.actionBtnActive : ''}`}
              onClick={() => handleToggle(r, { approved: !r.approved })}
            >
              <Symbol name={r.approved ? 'check_circle' : 'radio_button_unchecked'} size={16} />
              {r.approved ? 'Approved — shown publicly' : 'Approve'}
            </button>
            {r.approved && (
              <button
                type="button"
                className={`${styles.actionBtn} ${r.featured ? styles.actionBtnActive : ''}`}
                onClick={() => handleToggle(r, { featured: !r.featured })}
              >
                <Symbol name="star" size={16} />
                {r.featured ? 'Featured' : 'Feature'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
