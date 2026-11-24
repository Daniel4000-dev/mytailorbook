'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Tonal Adire Indigo & Slate palette — follows the two-color system in tokens.css
 * (variants of #4338CA indigo and neutral charcoal/slate, never rainbow neon).
 */
const TONAL_INDIGO_PALETTE = ['#1E1B4B', '#4338CA', '#6366F1', '#94A3B8', '#CBD5E1'];

export default function DonutChart({
  data,
  currency,
}: {
  data: DataPoint[];
  currency?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;
  const segments = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const strokeLength = pct * circumference;
    const offset = circumference - accumulatedAngle * circumference;
    accumulatedAngle += pct;
    return {
      ...d,
      index: i,
      pct,
      percentLabel: total > 0 ? Math.round(pct * 100) : 0,
      color: TONAL_INDIGO_PALETTE[i % TONAL_INDIGO_PALETTE.length],
      strokeLength,
      offset,
    };
  });

  const activeSegment =
    hoveredIdx !== null && segments[hoveredIdx] && segments[hoveredIdx].value > 0
      ? segments[hoveredIdx]
      : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        alignItems: 'center',
        gap: '24px',
        width: '100%',
      }}
    >
      {/* Tonal Ring with Center Ledger Readout */}
      <div
        style={{
          position: 'relative',
          width: '184px',
          height: '184px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="184"
          height="184"
          viewBox="0 0 184 184"
          style={{ transform: 'rotate(-90deg)' }}
          role="img"
          aria-label="Expense breakdown ring"
        >
          <circle
            cx="92"
            cy="92"
            r={radius}
            fill="none"
            stroke="var(--sf-bg-surface-sunken, #F1F5F9)"
            strokeWidth="18"
          />

          {total > 0 &&
            segments.map((seg) => {
              if (seg.value <= 0) return null;
              const isHovered = hoveredIdx === seg.index;
              return (
                <circle
                  key={seg.label}
                  cx="92"
                  cy="92"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 22 : 18}
                  strokeDasharray={`${Math.max(seg.strokeLength - 1.5, 1)} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.18s ease, opacity 0.18s ease',
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.4,
                  }}
                  onMouseEnter={() => setHoveredIdx(seg.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(isHovered ? null : seg.index)}
                />
              );
            })}
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: '30px',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--sf-text-tertiary)',
            }}
          >
            {activeSegment ? activeSegment.label : 'Total Spend'}
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--sf-text-primary)',
              marginTop: '2px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {activeSegment
              ? formatCurrency(activeSegment.value, currency)
              : formatCurrency(total, currency)}
          </span>
          {activeSegment && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--sf-text-secondary)',
                marginTop: '1px',
              }}
            >
              {activeSegment.percentLabel}%
            </span>
          )}
        </div>
      </div>

      {/* Clean Ledger Table Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {segments.map((seg) => {
          const isHovered = hoveredIdx === seg.index;
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIdx(seg.index)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(isHovered ? null : seg.index)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '8px',
                background: isHovered ? 'rgba(67, 56, 202, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      backgroundColor: seg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500, color: 'var(--sf-text-secondary)' }}>
                    {seg.label}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span style={{ fontWeight: 650, color: 'var(--sf-text-primary)' }}>
                    {formatCurrency(seg.value, currency)}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--sf-text-tertiary)',
                      minWidth: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {seg.percentLabel}%
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--sf-bg-surface-sunken, #F1F5F9)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(seg.percentLabel, seg.value > 0 ? 3 : 0)}%`,
                    height: '100%',
                    backgroundColor: seg.color,
                    transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
