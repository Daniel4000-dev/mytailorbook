'use client';

import React from 'react';
import { formatCurrency } from '@/lib/formatters';

export default function DebtMeter({
  collected,
  outstanding,
  currency,
}: {
  collected: number;
  outstanding: number;
  currency?: string;
}) {
  const total = collected + outstanding;
  const collectedPct = total > 0 ? Math.round((collected / total) * 100) : 0;
  const outstandingPct = total > 0 ? 100 - collectedPct : 0;

  const healthStatus =
    total === 0
      ? { label: 'Ready to Track', color: '#4338CA', bg: 'rgba(67, 56, 202, 0.08)' }
      : collectedPct >= 80
      ? { label: 'Strong Liquidity', color: '#059669', bg: 'rgba(16, 185, 129, 0.12)' }
      : collectedPct >= 55
      ? { label: 'Moderate Receivables', color: '#D97706', bg: 'rgba(245, 158, 11, 0.14)' }
      : { label: 'High Uncollected Balance', color: '#E11D48', bg: 'rgba(225, 29, 72, 0.12)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Top Status Summary Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--sf-text-primary)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {collectedPct}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)', fontWeight: 500 }}>
            of total billed value collected in cash ({formatCurrency(total, currency)} total)
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '999px',
            color: healthStatus.color,
            background: healthStatus.bg,
          }}
        >
          {healthStatus.label}
        </span>
      </div>

      {/* Dual-Tone Segmented Gauge Bar */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '14px',
          borderRadius: '999px',
          overflow: 'hidden',
          background: 'var(--sf-bg-surface-sunken, rgba(67, 56, 202, 0.08))',
          gap: total > 0 && collected > 0 && outstanding > 0 ? '3px' : '0',
          padding: '2px',
        }}
        role="progressbar"
        aria-valuenow={collectedPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {total > 0 ? (
          <>
            {collectedPct > 0 && (
              <div
                style={{
                  width: `${collectedPct}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #059669 0%, #10B981 100%)',
                  transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )}
            {outstandingPct > 0 && (
              <div
                style={{
                  width: `${outstandingPct}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
                  transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )}
          </>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '999px',
              background: 'rgba(67, 56, 202, 0.12)',
            }}
          />
        )}
      </div>

      {/* Split Comparison Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#059669',
                }}
              >
                Cash Collected
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
              {collectedPct}%
            </span>
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--sf-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(collected, currency)}
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#D97706',
                }}
              >
                Client Receivables
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706' }}>
              {outstandingPct}%
            </span>
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--sf-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(outstanding, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
