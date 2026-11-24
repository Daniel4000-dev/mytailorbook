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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Editorial Ratio Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--sf-text-primary)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {collectedPct}%
          </span>
          <span style={{ fontSize: '12.5px', color: 'var(--sf-text-secondary)' }}>
            collected of {formatCurrency(total, currency)} total billed
          </span>
        </div>
      </div>

      {/* Two-Tone Sartorial Bar: Solid Adire Indigo vs Woven Diagonal Hatch */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '12px',
          borderRadius: '4px',
          overflow: 'hidden',
          background: 'var(--sf-bg-surface-sunken, #F1F5F9)',
          border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.12))',
        }}
        role="progressbar"
        aria-valuenow={collectedPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {total > 0 && (
          <>
            {collectedPct > 0 && (
              <div
                style={{
                  width: `${collectedPct}%`,
                  height: '100%',
                  backgroundColor: '#4338CA',
                  transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )}
            {outstandingPct > 0 && (
              <div
                style={{
                  width: `${outstandingPct}%`,
                  height: '100%',
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(67, 56, 202, 0.22) 0px, rgba(67, 56, 202, 0.22) 3px, transparent 3px, transparent 7px)',
                  backgroundColor: 'rgba(67, 56, 202, 0.06)',
                  transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Ledger Breakdown Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          paddingTop: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--sf-bg-surface-sunken, #F8FAFC)',
            border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#4338CA',
              }}
            />
            <span style={{ fontSize: '11.5px', color: 'var(--sf-text-secondary)', fontWeight: 500 }}>
              Collected
            </span>
          </div>
          <span
            style={{
              fontSize: '16px',
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
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--sf-bg-surface-sunken, #F8FAFC)',
            border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                border: '1px solid rgba(67, 56, 202, 0.45)',
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(67, 56, 202, 0.35) 0px, rgba(67, 56, 202, 0.35) 2px, transparent 2px, transparent 4px)',
              }}
            />
            <span style={{ fontSize: '11.5px', color: 'var(--sf-text-secondary)', fontWeight: 500 }}>
              Unpaid Balance
            </span>
          </div>
          <span
            style={{
              fontSize: '16px',
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
