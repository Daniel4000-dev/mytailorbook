'use client';

import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import Symbol from '@/components/ui/Symbol/Symbol';

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

  // Merge existing data points into the 6-month window, preserving any custom labels
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
  const [chartMode, setChartMode] = useState<'area' | 'bars'>('area');
  const series = useMemo(() => buildHorizonSeries(data || []), [data]);

  const defaultActiveIndex = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].revenue > 0 || series[i].expenses > 0) return i;
    }
    return series.length - 1;
  }, [series]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const effectiveIndex = activeIndex !== null && activeIndex < series.length ? activeIndex : defaultActiveIndex;
  const activePoint = series[effectiveIndex] || { label: '--', revenue: 0, expenses: 0 };
  const activeNet = activePoint.revenue - activePoint.expenses;
  const activeMarginPct =
    activePoint.revenue > 0 ? Math.round((activeNet / activePoint.revenue) * 100) : null;

  const maxVal = useMemo(() => {
    const peak = Math.max(...series.map((d) => Math.max(d.revenue, d.expenses)), 0);
    return peak > 0 ? peak * 1.15 : 100000;
  }, [series]);

  // SVG Coordinate System
  const width = 640;
  const height = 220;
  const padLeft = 18;
  const padRight = 18;
  const padTop = 24;
  const padBottom = 34;
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

  const expenseAreaPath = useMemo(() => {
    if (coords.length === 0) return '';
    return `${expenseLinePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY} L ${coords[0].x.toFixed(1)} ${baselineY} Z`;
  }, [expenseLinePath, coords, baselineY]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Live Scrubbing Telemetry Readout Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'var(--sf-bg-surface-sunken, #f8fafc)',
          border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.1))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--sf-text-tertiary)',
              }}
            >
              Selected Period ({activePoint.label})
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#059669',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(activePoint.revenue, currency)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', fontWeight: 500 }}>
                inflow
              </span>
            </div>
          </div>

          <div
            style={{
              width: '1px',
              height: '28px',
              background: 'var(--sf-border-light, rgba(67, 56, 202, 0.12))',
            }}
          />

          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--sf-text-tertiary)',
              }}
            >
              Outflow
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 650,
                color: '#E11D48',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(activePoint.expenses, currency)}
            </span>
          </div>

          <div
            style={{
              width: '1px',
              height: '28px',
              background: 'var(--sf-border-light, rgba(67, 56, 202, 0.12))',
            }}
          />

          <div>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--sf-text-tertiary)',
              }}
            >
              Net Position
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: activeNet >= 0 ? '#4338CA' : '#E11D48',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {activeNet >= 0 ? '+' : ''}
                {formatCurrency(activeNet, currency)}
              </span>
              {activeMarginPct !== null && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: activeNet >= 0 ? 'rgba(67, 56, 202, 0.1)' : 'rgba(225, 29, 72, 0.1)',
                    color: activeNet >= 0 ? '#4338CA' : '#E11D48',
                  }}
                >
                  {activeMarginPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Switcher: Spline Curve vs Comparison Bars */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--sf-bg-surface-elevated, #ffffff)',
            padding: '3px',
            borderRadius: '999px',
            border: '1px solid var(--sf-border-light, rgba(67, 56, 202, 0.12))',
            gap: '2px',
          }}
          role="group"
          aria-label="Chart visualization mode"
        >
          <button
            type="button"
            onClick={() => setChartMode('area')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '999px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: chartMode === 'area' ? '#4338CA' : 'transparent',
              color: chartMode === 'area' ? '#ffffff' : 'var(--sf-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Symbol name="trending_up" size={13} />
            <span>Wave</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '999px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: chartMode === 'bars' ? '#4338CA' : 'transparent',
              color: chartMode === 'bars' ? '#ffffff' : 'var(--sf-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Symbol name="bar_chart" size={13} />
            <span>Bars</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div style={{ position: 'relative', width: '100%' }}>
        {chartMode === 'area' ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: '220px', overflow: 'visible', display: 'block' }}
            role="img"
            aria-label="Revenue and expense wave chart"
          >
            <defs>
              <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.34" />
                <stop offset="75%" stopColor="#10B981" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.26" />
                <stop offset="85%" stopColor="#F43F5E" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="revStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* Horizontal Reference Grid Lines */}
            {[0, 0.33, 0.66, 1].map((ratio, idx) => {
              const y = padTop + plotHeight * ratio;
              return (
                <line
                  key={idx}
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--sf-border-light, rgba(67, 56, 202, 0.1))"
                  strokeDasharray={idx === 3 ? undefined : '4 4'}
                  strokeWidth="1"
                />
              );
            })}

            {/* Filled Gradient Areas */}
            <path d={expenseAreaPath} fill="url(#expAreaGrad)" />
            <path d={revenueAreaPath} fill="url(#revAreaGrad)" />

            {/* Smooth Spline Curves */}
            <path
              d={expenseLinePath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeDasharray="5 3"
            />
            <path
              d={revenueLinePath}
              fill="none"
              stroke="url(#revStrokeGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Active Scrubber Guide Line & Nodes */}
            {coords.map((pt, i) => {
              const isSelected = i === effectiveIndex;
              return (
                <g
                  key={pt.data.label + i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => setActiveIndex(i)}
                >
                  {/* Vertical Scrubber Beam */}
                  {isSelected && (
                    <line
                      x1={pt.x}
                      y1={padTop}
                      x2={pt.x}
                      y2={baselineY}
                      stroke="rgba(67, 56, 202, 0.28)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Expense Node */}
                  <circle
                    cx={pt.x}
                    cy={pt.expY}
                    r={isSelected ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#F43F5E"
                    strokeWidth={isSelected ? 2.5 : 1.75}
                  />

                  {/* Revenue Glow Ring when active */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.revY}
                      r={11}
                      fill="rgba(16, 185, 129, 0.18)"
                    />
                  )}

                  {/* Revenue Node */}
                  <circle
                    cx={pt.x}
                    cy={pt.revY}
                    r={isSelected ? 6.5 : 4}
                    fill={isSelected ? '#10B981' : '#ffffff'}
                    stroke="#059669"
                    strokeWidth={2.5}
                  />

                  {/* Month Axis Label */}
                  <text
                    x={pt.x}
                    y={height - 8}
                    textAnchor="middle"
                    fill={isSelected ? 'var(--sf-text-primary)' : 'var(--sf-text-tertiary)'}
                    fontSize="11.5"
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    {pt.data.label}
                  </text>

                  {/* Invisible Wide Hit Target for Touch / Hover */}
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
        ) : (
          /* Grouped Interactive Bar Comparison View */
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '210px',
              width: '100%',
              gap: '10px',
              padding: '16px 8px 28px',
              borderBottom: '1px solid var(--sf-border-light)',
              position: 'relative',
            }}
          >
            {series.map((d, i) => {
              const isSelected = i === effectiveIndex;
              const revPct = Math.max((d.revenue / maxVal) * 100, d.revenue > 0 ? 6 : 2);
              const expPct = Math.max((d.expenses / maxVal) * 100, d.expenses > 0 ? 6 : 2);

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
                    background: isSelected ? 'rgba(67, 56, 202, 0.05)' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
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
                      gap: '5px',
                      height: '100%',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Revenue Bar */}
                    <div
                      style={{
                        width: '38%',
                        maxWidth: '24px',
                        height: `${revPct}%`,
                        background: 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
                        borderRadius: '6px 6px 2px 2px',
                        boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                        transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                      title={`Revenue: ${formatCurrency(d.revenue, currency)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{
                        width: '38%',
                        maxWidth: '24px',
                        height: `${expPct}%`,
                        background: 'linear-gradient(180deg, #FB7185 0%, #E11D48 100%)',
                        borderRadius: '6px 6px 2px 2px',
                        boxShadow: isSelected ? '0 4px 12px rgba(225, 29, 72, 0.3)' : 'none',
                        transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                      title={`Expenses: ${formatCurrency(d.expenses, currency)}`}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
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
        )}
      </div>

      {/* Legend Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--sf-text-secondary)',
          paddingTop: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #34D399, #059669)',
                display: 'inline-block',
              }}
            />
            Gross Revenue Inflow
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FB7185, #E11D48)',
                display: 'inline-block',
              }}
            />
            Workshop Outflow
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--sf-text-tertiary)' }}>
          Tap or hover any month to inspect period performance
        </span>
      </div>
    </div>
  );
}
