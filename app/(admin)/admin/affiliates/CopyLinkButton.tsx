'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be denied (permissions, non-secure context) —
      // fail quietly rather than throwing in front of the admin.
    }
  }

  return (
    <button type="button" className={styles.copyButton} onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
