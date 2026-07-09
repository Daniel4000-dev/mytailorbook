'use client';

import { useState } from 'react';
import { FaStar } from 'react-icons/fa6';
import { submitOrderRating } from '@/app/public-actions';
import styles from './RatingWidget.module.css';

interface RatingWidgetProps {
  orderId: string;
  shopName: string;
  initialRating?: number;
}

export default function RatingWidget({ orderId, shopName, initialRating }: RatingWidgetProps) {
  const [rating, setRating] = useState<number | undefined>(initialRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rating) {
    return (
      <section className={styles.card}>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <FaStar key={n} className={n <= rating ? styles.starFilled : styles.starEmpty} />
          ))}
        </div>
        <p className={styles.thankYou}>Thank you for your feedback!</p>
      </section>
    );
  }

  const handleRate = async (n: number) => {
    setSubmitting(true);
    setError(null);
    const result = await submitOrderRating(orderId, n);
    if (result.success) {
      setRating(n);
    } else {
      setError(result.error || 'Could not submit your rating. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>How was your experience with {shopName}?</h3>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            className={styles.starBtn}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleRate(n)}
          >
            <FaStar className={n <= (hovered ?? 0) ? styles.starFilled : styles.starEmpty} />
          </button>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
