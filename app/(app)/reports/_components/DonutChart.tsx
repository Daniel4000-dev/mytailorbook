'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#4338CA', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

export default function DonutChart({
  data,
  currency,
}: {
  data: DataPoint[];
  currency?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  const radius = 74;
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
      color: d.color || PALETTE[i % PALETTE.length],
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        alignItems: 'center',
        gap: '24px',
        width: '100%',
      }}
    >
      {/* Interactive SVG Donut with Center Telemetry Readout */}
      <div
        style={{
          position: 'relative',
          width: '204px',
          height: '204px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="204"
          height="204"
          viewBox="0 0 200 200"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
          role="img"
          aria-label="Workshop expense allocation ring"
        >
          {/* Base Ring Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--sf-bg-surface-sunken, rgba(67, 56, 202, 0.08))"
            strokeWidth="22"
          />

          {total > 0 ? (
            segments.map((seg) => {
              if (seg.value <= 0) return null;
              const isHovered = hoveredIdx === seg.index;
              return (
                <circle
                  key={seg.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 27 : 22}
                  strokeDasharray={`${Math.max(seg.strokeLength - 2, 1)} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                  }}
                  onMouseEnter={() => setHoveredIdx(seg.index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(isHovered ? null : seg.index)}
                />
              );
            })
          ) : (
            /* Zero-Expense Calm Ready Ring */
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(16, 185, 129, 0.28)"
              strokeWidth="16"
              strokeDasharray="8 6"
            />
          )}
        </svg>

        {/* Center Readout Inside Donut Hole */}
        <div
          style={{
            position: 'absolute',
            inset: '34px',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '8px',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--sf-text-tertiary)',
            }}
          >
            {activeSegment ? activeSegment.label : total > 0 ? 'Total Outflow' : 'Zero Outflow'}
          </span>
          <span
            style={{
              fontSize: '16px',
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
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: activeSegment ? activeSegment.color : 'var(--sf-text-secondary)',
              marginTop: '2px',
            }}
          >
            {activeSegment
              ? `${activeSegment.percentLabel}% of spend`
              : total > 0
              ? '100% allocated'
              : '100% lean'}
          </span>
        </div>
      </div>

      {/* Interactive Category Allocation Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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
                padding: '8px 10px',
                borderRadius: '12px',
                background: isHovered
                  ? 'var(--sf-bg-surface-sunken, rgba(67, 56, 202, 0.06))'
                  : 'transparent',
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
                      width: '10px',
                      height: '10px',
                      borderRadius: '3px',
                      backgroundColor: seg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>
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
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--sf-text-secondary)',
                      minWidth: '34px',
                      textAlign: 'right',
                    }}
                  >
                    {seg.percentLabel}%
                  </span>
                </div>
              </div>

              {/* Proportional Micro-Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'var(--sf-bg-surface-sunken, rgba(67, 56, 202, 0.08))',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(seg.percentLabel, seg.value > 0 ? 4 : 0)}%`,
                    height: '100%',
                    borderRadius: '999px',
                    backgroundColor: seg.color,
                    transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
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
