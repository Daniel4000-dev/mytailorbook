'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './page.module.css';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Panel Error]', error);
  }, [error]);

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '640px', margin: '0 auto' }}>
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
          <Symbol name="error" size={24} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Admin Dashboard Diagnostic</h2>
        </div>
        <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          An error occurred loading the control tower data.
        </p>
        <div
          style={{
            background: 'var(--bg-muted, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            color: '#b91c1c',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '1.5rem',
          }}
        >
          {error?.message || 'Unknown server error'}
          {error?.digest && (
            <div style={{ marginTop: '0.5rem', color: '#64748b' }}>
              Digest: {error.digest}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: 'var(--brand-primary, #0f172a)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.2rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Retry Loading
          </button>
          <Link
            href={ROUTES.dashboard}
            style={{
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              padding: '0.6rem 1rem',
            }}
          >
            Back to Tailor App
          </Link>
        </div>
      </div>
    </div>
  );
}
