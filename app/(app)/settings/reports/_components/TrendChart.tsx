import React from 'react';
import { formatCurrency } from '@/lib/formatters';

interface TrendData {
  label: string;
  revenue: number;
  expenses: number;
}

export default function TrendChart({ data, currency }: { data: TrendData[], currency?: string }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', width: '100%', gap: '8px', paddingBottom: '24px', borderBottom: '1px solid var(--sf-border-light)', position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%', width: '100%', justifyContent: 'center' }}>
            {/* Revenue Bar */}
            <div style={{ 
              width: '40%', 
              maxWidth: '30px', 
              height: `${(d.revenue / maxVal) * 100}%`, 
              backgroundColor: 'var(--sf-success)', 
              borderRadius: '4px 4px 0 0',
              minHeight: d.revenue > 0 ? '4px' : '0'
            }} title={`Revenue: ${formatCurrency(d.revenue, currency)}`} />
            {/* Expense Bar */}
            <div style={{ 
              width: '40%', 
              maxWidth: '30px', 
              height: `${(d.expenses / maxVal) * 100}%`, 
              backgroundColor: 'var(--sf-error)', 
              borderRadius: '4px 4px 0 0',
              minHeight: d.expenses > 0 ? '4px' : '0'
            }} title={`Expenses: ${formatCurrency(d.expenses, currency)}`} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--sf-text-tertiary)', position: 'absolute', bottom: 0, whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
