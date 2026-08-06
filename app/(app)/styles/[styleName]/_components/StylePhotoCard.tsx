'use client';

import { useState } from 'react';
import Image from 'next/image';

import Symbol from '@/components/ui/Symbol/Symbol';
import { formatDate } from '@/lib/formatters';
import type { StylePhotoSubmission } from '@/lib/types';
import styles from '../page.module.css';

interface StylePhotoCardProps {
  submission: StylePhotoSubmission;
  isOwner: boolean;
  busy: boolean;
  daysLeft?: number;
  onApprove?: (submission: StylePhotoSubmission) => void;
  onDiscard: (submission: StylePhotoSubmission) => void;
}

export default function StylePhotoCard({
  submission,
  isOwner,
  busy,
  daysLeft,
  onApprove,
  onDiscard,
}: StylePhotoCardProps) {
  const isPending = daysLeft !== undefined;
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.photoCard}>
      <div className={styles.photoWrap}>
        {failed ? (
          <div className={styles.photoError}>
            <Symbol name="broken_image" size={28} />
            <span>Photo unavailable</span>
          </div>
        ) : (
          <Image src={submission.photoUrl} alt="" width={400} height={400} onError={() => setFailed(true)} />
        )}
        {isPending && (
          <span className={`${styles.expiryTag} ${daysLeft <= 3 ? styles.expiryTagSoon : ''}`}>
            {daysLeft <= 0 ? 'Expires today' : `${daysLeft}d left`}
          </span>
        )}
      </div>
      <p className={styles.meta}>
        {isPending
          ? `${submission.uploadedByName} · ${formatDate(submission.createdAt)}`
          : `Approved ${formatDate(submission.savedAt || submission.createdAt)}`}
      </p>
      <div className={styles.actions}>
        {isPending && isOwner && onApprove && (
          <button
            type="button"
            className={styles.approveBtn}
            disabled={busy}
            onClick={() => onApprove(submission)}
          >
            {busy && <Symbol name="progress_activity" className="global-spinner" />} <Symbol name="check" size={16} /> Approve
          </button>
        )}
        <button
          type="button"
          className={styles.discardBtn}
          disabled={busy}
          onClick={() => onDiscard(submission)}
        >
          {busy && <Symbol name="progress_activity" className="global-spinner" />} <Symbol name="close" size={16} /> {isPending ? 'Discard' : 'Remove'}
        </button>
      </div>
    </div>
  );
}
