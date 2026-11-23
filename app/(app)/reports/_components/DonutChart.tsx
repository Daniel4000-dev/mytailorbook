import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DonutChart({ data }: { data: DataPoint[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sf-text-tertiary)' }}>No data available</div>;

  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '200px', height: '200px' }}>
        {data.map((slice, i) => {
          if (slice.value === 0) return null;
          
          const startPercent = cumulativePercent;
          const slicePercent = slice.value / total;
          cumulativePercent += slicePercent;
          
          const endPercent = cumulativePercent;
          
          const color = slice.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          
          if (slicePercent === 1) {
             return <circle key={i} cx="0" cy="0" r="0.8" fill="none" stroke={color} strokeWidth="0.4" />;
          }

          const [startX, startY] = getCoordinatesForPercent(startPercent);
          const [endX, endY] = getCoordinatesForPercent(endPercent);
          
          const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
          
          const pathData = [
            `M ${startX * 0.8} ${startY * 0.8}`,
            `A 0.8 0.8 0 ${largeArcFlag} 1 ${endX * 0.8} ${endY * 0.8}`,
          ].join(' ');

          return (
            <path key={i} d={pathData} fill="none" stroke={color} strokeWidth="0.4" />
          );
        })}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
        {data.map((d, i) => {
          const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
            <span style={{ color: 'var(--sf-text-secondary)' }}>{d.label}</span>
            <span style={{ fontWeight: 600 }}>{Math.round((d.value / total) * 100)}%</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}
