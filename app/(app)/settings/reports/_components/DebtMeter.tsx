import React from 'react';
import { formatCurrency } from '@/lib/formatters';

export default function DebtMeter({ collected, outstanding, currency }: { collected: number, outstanding: number, currency?: string }) {
  const total = collected + outstanding;
  if (total === 0) return <div style={{ color: 'var(--sf-text-tertiary)', fontSize: '13px' }}>No revenue data yet.</div>;
  
  const collectedPct = (collected / total) * 100;
  const outstandingPct = (outstanding / total) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ width: `${collectedPct}%`, backgroundColor: 'var(--sf-success)' }} />
        <div style={{ width: `${outstandingPct}%`, backgroundColor: 'var(--sf-warning)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--sf-success)' }} />
          <span style={{ color: 'var(--sf-text-secondary)' }}>Collected</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(collected, currency)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--sf-warning)' }} />
          <span style={{ color: 'var(--sf-text-secondary)' }}>Outstanding</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(outstanding, currency)}</span>
        </div>
      </div>
    </div>
  );
}
