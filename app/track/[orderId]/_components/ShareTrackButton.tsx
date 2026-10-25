'use client';

import React, { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './ShareTrackButton.module.css';

interface ShareTrackButtonProps {
  orderTitle: string;
  shopName?: string;
}

export default function ShareTrackButton({ orderTitle, shopName }: ShareTrackButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `Tracking: ${orderTitle}${shopName ? ` at ${shopName}` : ''}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: `Track the progress of this bespoke piece live:`,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      className={styles.shareBtn}
      onClick={handleShare}
      aria-label="Share tracking link"
    >
      <Symbol name={copied ? 'check' : 'share'} size={15} />
      <span>{copied ? 'Link Copied' : 'Share'}</span>
    </button>
  );
}
