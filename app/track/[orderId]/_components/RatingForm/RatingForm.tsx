'use client';

import { useState } from 'react';
import { FaStar, FaSpinner } from 'react-icons/fa6';
import { submitOrderRatingAction } from '@/app/public-actions';
import styles from './RatingForm.module.css';

interface RatingFormProps {
  orderId: string;
  shopName: string;
  /** Whether this order already has a rating on file — the table only
   *  ever allows one per order, so this is a real "already submitted"
   *  state, not just a client-side guess. */
  alreadyRated: boolean;
}

export default function RatingForm({ orderId, shopName, alreadyRated }: RatingFormProps) {
  const [submitted, setSubmitted] = useState(alreadyRated);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Please pick a star rating first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitOrderRatingAction(orderId, rating, comment.trim() || undefined);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Could not send your review. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <section className={styles.card}>
        <div className={styles.doneIcon}>
          <FaStar />
        </div>
        <h3 className={styles.doneTitle}>Thank you for your feedback!</h3>
        <p className={styles.doneText}>Your review helps {shopName} — and other customers deciding to work with them.</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>Your outfit is delivered — how was it?</h3>
      <p className={styles.hint}>Leave {shopName} a quick review. It may be shared on their public portfolio.</p>

      <div className={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={styles.starBtn}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          >
            <FaStar className={n <= (hoverRating || rating) ? styles.starFilled : styles.starEmpty} />
          </button>
        ))}
      </div>

      <textarea
        className={styles.textarea}
        placeholder="Anything you'd like to add? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={500}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <>
            <FaSpinner className="global-spinner" /> Sending…
          </>
        ) : (
          'Send Review'
        )}
      </button>
    </section>
  );
}
