'use client';

import { useState, useTransition } from 'react';
import { createAffiliate } from './actions';
import styles from './page.module.css';

export default function AffiliateForm() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAffiliate(name, code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName('');
      setCode('');
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        placeholder="Affiliate name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
      />
      <input
        className={styles.input}
        placeholder="Code (e.g. tunde)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={pending}
      />
      <button className={styles.submitButton} type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add affiliate'}
      </button>
      {error && <span className={styles.formError}>{error}</span>}
    </form>
  );
}
