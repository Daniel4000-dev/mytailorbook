'use client';

import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/formatters';

export interface TrendData {
  label: string;
  revenue: number;
  expenses: number;
}

const MONTH_SEQUENCE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildHorizonSeries(raw: TrendData[]): TrendData[] {
  if (raw.length >= 4) return raw;

  const nowMonthIdx = new Date().getMonth();
  const targetMonths: string[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const idx = (nowMonthIdx - offset + 12) % 12;
    targetMonths.push(MONTH_SEQUENCE[idx]);
  }

  const byLabel = new Map<string, TrendData>();
  for (const item of raw) {
    byLabel.set(item.label, item);
  }

  const series = targetMonths.map((m) => byLabel.get(m) ?? { label: m, revenue: 0, expenses: 0 });
  for (const item of raw) {
    if (!targetMonths.includes(item.label)) {
      series.push(item);
    }
  }
  return series.slice(-6);
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const ctrlX1 = curr.x + (next.x - curr.x) * 0.42;
    const ctrlY1 = curr.y;
    const ctrlX2 = curr.x + (next.x - curr.x) * 0.58;
    const ctrlY2 = next.y;
    d += ` C ${ctrlX1.toFixed(1)} ${ctrlY1.toFixed(1)}, ${ctrlX2.toFixed(1)} ${ctrlY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return d;
}

export default function TrendChart({
  data,
  currency,
}: {
  data: TrendData[];
  currency?: string;
}) {
  const [chartMode, setChartMode] = useState<'bars' | 'line'>('bars');
  const series = useMemo(() => buildHorizonSeries(data || []), [data]);

  const defaultActiveIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].revenue > 0 || series[i].expenses > 0) return i;
    }
    return series.length - 1;
  }, [series]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const effectiveIndex =
    activeIndex !== null && activeIndex < series.length ? activeIndex : defaultActiveIndex;
  const activePoint = series[effectiveIndex] || { label: '--', revenue: 0, expenses: 0 };
  const activeNet = activePoint.revenue - activePoint.expenses;

  const maxVal = useMemo(() => {
    const peak = Math.max(...series.map((d) => Math.max(d.revenue, d.expenses)), 0);
    return peak > 0 ? peak * 1.15 : 100000;
  }, [series]);

  const width = 640;
  const height = 210;
  const padLeft = 16;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 32;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const baselineY = padTop + plotHeight;

  const coords = useMemo(() => {
    const step = series.length > 1 ? plotWidth / (series.length - 1) : 0;
    return series.map((d, i) => {
      const x = padLeft + (series.length > 1 ? i * step : plotWidth / 2);
      const revY = baselineY - (Math.min(d.revenue, maxVal) / maxVal) * plotHeight;
      const expY = baselineY - (Math.min(d.expenses, maxVal) / maxVal) * plotHeight;
      return { x, revY, expY, data: d };
    });
  }, [series, maxVal, plotWidth, plotHeight, baselineY]);

  const revenueLinePath = useMemo(
    () => buildSmoothPath(coords.map((c) => ({ x: c.x, y: c.revY }))),
    [coords]
  );
  const expenseLinePath = useMemo(
    () => buildSmoothPath(coords.map((c) => ({ x: c.x, y: c.expY }))),
    [coords]
  );
  const revenueAreaPath = useMemo(() => {
    if (coords.length === 0) return '';
    return `${revenueLinePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY} L ${coords[0].x.toFixed(1)} ${baselineY} Z`;
  }, [revenueLinePath, coords, baselineY]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Editorial Ledger Readout Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.09))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--sf-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {activePoint.label} Revenue
            </span>
            <span
              style={{
                fontSize: '19px',
                fontWeight: 700,
                color: 'var(--sf-text-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(activePoint.revenue, currency)}
            </span>
          </div>

          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--sf-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Expenses
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--sf-text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(activePoint.expenses, currency)}
            </span>
          </div>

          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--sf-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Net
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 650,
                color: 'var(--sf-brand-indigo, #4338CA)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {activeNet >= 0 ? '+' : ''}
              {formatCurrency(activeNet, currency)}
            </span>
          </div>
        </div>

        {/* Minimal Segmented View Toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--sf-bg-surface-sunken, #F1F5F9)',
            padding: '2px',
            borderRadius: '8px',
            border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.09))',
          }}
          role="group"
          aria-label="Chart format"
        >
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: chartMode === 'bars' ? 'var(--sf-bg-surface, #ffffff)' : 'transparent',
              color: chartMode === 'bars' ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)',
              boxShadow: chartMode === 'bars' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Columns
          </button>
          <button
            type="button"
            onClick={() => setChartMode('line')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: chartMode === 'line' ? 'var(--sf-bg-surface, #ffffff)' : 'transparent',
              color: chartMode === 'line' ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)',
              boxShadow: chartMode === 'line' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Curve
          </button>
        </div>
      </div>

      {/* Chart Plot Surface */}
      {chartMode === 'bars' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: '196px',
            width: '100%',
            gap: '8px',
            padding: '12px 4px 28px',
            borderBottom: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.1))',
            position: 'relative',
          }}
        >
          {series.map((d, i) => {
            const isSelected = i === effectiveIndex;
            const revPct = Math.max((d.revenue / maxVal) * 100, d.revenue > 0 ? 5 : 1.5);
            const expPct = Math.max((d.expenses / maxVal) * 100, d.expenses > 0 ? 5 : 1.5);

            return (
              <button
                key={d.label + i}
                type="button"
                onClick={() => setActiveIndex(i)}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                  background: isSelected ? 'rgba(67, 56, 202, 0.04)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 4px 0',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '4px',
                    height: '100%',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {/* Revenue Bar — Solid Adire Indigo */}
                  <div
                    style={{
                      width: '36%',
                      maxWidth: '20px',
                      height: `${revPct}%`,
                      backgroundColor: isSelected ? '#312E81' : '#4338CA',
                      borderRadius: '4px 4px 1px 1px',
                      transition: 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.15s ease',
                    }}
                    title={`Revenue: ${formatCurrency(d.revenue, currency)}`}
                  />
                  {/* Expense Bar — Soft Woven Indigo-Slate */}
                  <div
                    style={{
                      width: '36%',
                      maxWidth: '20px',
                      height: `${expPct}%`,
                      backgroundColor: isSelected ? '#64748B' : '#CBD5E1',
                      borderRadius: '4px 4px 1px 1px',
                      transition: 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.15s ease',
                    }}
                    title={`Expenses: ${formatCurrency(d.expenses, currency)}`}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isSelected ? 650 : 500,
                    color: isSelected ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)',
                    position: 'absolute',
                    bottom: '-22px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '196px', overflow: 'visible', display: 'block' }}
          role="img"
          aria-label="Monthly revenue and expense curve"
        >
          <defs>
            <linearGradient id="indigoWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4338CA" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4338CA" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio, idx) => {
            const y = padTop + plotHeight * ratio;
            return (
              <line
                key={idx}
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="var(--sf-border-light, rgba(67, 56, 202, 0.09))"
                strokeDasharray={idx === 2 ? undefined : '3 3'}
                strokeWidth="1"
              />
            );
          })}

          <path d={revenueAreaPath} fill="url(#indigoWash)" />
          <path
            d={expenseLinePath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <path
            d={revenueLinePath}
            fill="none"
            stroke="#4338CA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {coords.map((pt, i) => {
            const isSelected = i === effectiveIndex;
            return (
              <g
                key={pt.data.label + i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => setActiveIndex(i)}
              >
                {isSelected && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={baselineY}
                    stroke="rgba(67, 56, 202, 0.22)"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.expY}
                  r={isSelected ? 4.5 : 3}
                  fill="var(--sf-bg-surface, #ffffff)"
                  stroke="#94A3B8"
                  strokeWidth="1.75"
                />
                <circle
                  cx={pt.x}
                  cy={pt.revY}
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? '#4338CA' : 'var(--sf-bg-surface, #ffffff)'}
                  stroke="#4338CA"
                  strokeWidth="2.25"
                />
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  fill={isSelected ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)'}
                  fontSize="11"
                  fontWeight={isSelected ? '650' : '500'}
                >
                  {pt.data.label}
                </text>
                <rect
                  x={pt.x - plotWidth / (series.length * 2)}
                  y={0}
                  width={plotWidth / series.length}
                  height={height}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Quiet Editorial Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11.5px',
          color: 'var(--sf-text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#4338CA',
                display: 'inline-block',
              }}
            />
            Revenue
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: '#CBD5E1',
                display: 'inline-block',
              }}
            />
            Expenses
          </span>
        </div>
        <span style={{ color: 'var(--sf-text-tertiary)' }}>Select a month to inspect</span>
      </div>
    </div>
  );
}
