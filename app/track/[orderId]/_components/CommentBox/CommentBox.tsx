'use client';

import { useState } from 'react';
import { FaRegCommentDots, FaPaperPlane } from 'react-icons/fa6';
import { submitOrderComment } from '@/app/public-actions';
import { formatDate } from '@/lib/formatters';
import type { OrderComment, OrderStatus } from '@/lib/types';
import styles from './CommentBox.module.css';

interface CommentBoxProps {
  orderId: string;
  currentStage: OrderStatus;
  initialComments: OrderComment[];
}

export default function CommentBox({ orderId, currentStage, initialComments }: CommentBoxProps) {
  const [comments, setComments] = useState(initialComments);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    const result = await submitOrderComment(orderId, trimmed);
    if (result.success) {
      setComments((prev) => [
        { id: crypto.randomUUID(), orderId, message: trimmed, stage: currentStage, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setMessage('');
    } else {
      setError(result.error || 'Could not send your comment. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>
        <FaRegCommentDots style={{ marginRight: 6 }} /> Leave a Comment
      </h3>
      <p className={styles.hint}>Have a note about your garment? It&apos;s shared with the shop right away.</p>

      <div className={styles.inputRow}>
        <textarea
          className={styles.textarea}
          placeholder="Write a comment..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={1000}
        />
        <button type="button" className={styles.sendBtn} onClick={handleSubmit} disabled={submitting || !message.trim()} aria-label="Send comment">
          <FaPaperPlane />
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {comments.length > 0 && (
        <div className={styles.commentList}>
          {comments.map((c) => (
            <div key={c.id} className={styles.commentRow}>
              <div className={styles.commentMetaRow}>
                <span className={styles.commentStage}>{c.stage}</span>
                <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
              </div>
              <p className={styles.commentMessage}>{c.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
