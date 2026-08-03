'use client';

import React, { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from '../page.module.css';

export default function CopyDomain({ domain }: { domain: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      className={styles.domainCopy} 
      onClick={handleCopy}
      title="Copy link"
      type="button"
    >
      {domain}
      <Symbol name={copied ? "check" : "content_copy"} size={12} className={styles.copyIcon} />
    </button>
  );
}
