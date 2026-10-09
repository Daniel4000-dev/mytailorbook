import React, { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatDate } from '@/lib/formatters';
import type { Customer, Measurements } from '@/lib/types';
import { MEASUREMENT_POINTS } from './MeasurementAnatomy';
import styles from './StyleProfileSheet.module.css'; // Reuse styles

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

export default function MeasurementHistorySheet({ isOpen, onClose, customer }: Props) {
  const history = customer.measurementsHistory || [];
  const currentMeasurements = customer.measurements || {};
  const currentUpdatedAt = customer.measurementsUpdatedAt;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Combine current and history for a full timeline
  const timeline = [];
  if (Object.keys(currentMeasurements).length > 0) {
    timeline.push({
      date: currentUpdatedAt || new Date().toISOString(),
      measurements: currentMeasurements,
      isCurrent: true,
    });
  }
  timeline.push(...history.map(h => ({ ...h, isCurrent: false })));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Measurement History">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
        {timeline.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--sf-text-secondary)', padding: '32px 0' }}>
            <Symbol name="history" size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p>No measurement history available.</p>
          </div>
        ) : (
          timeline.map((entry, index) => {
            const isExpanded = expandedIndex === index;
            // Compare with the PREVIOUS entry (which is chronologically OLDER, so it's index + 1 in the array)
            const olderEntry = timeline[index + 1];
            
            return (
              <div key={index} style={{ border: '1px solid var(--sf-border-color)', borderRadius: 'var(--sf-radius-md)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: entry.isCurrent ? 'var(--sf-bg-surface-hover)' : 'var(--sf-bg-surface)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Symbol name="straighten" size={18} style={{ color: entry.isCurrent ? 'var(--sf-text-primary)' : 'var(--sf-text-secondary)' }} />
                    <span style={{ fontWeight: 500 }}>
                      {formatDate(entry.date)} {entry.isCurrent && '(Current)'}
                    </span>
                  </div>
                  <Symbol name={isExpanded ? 'expand_less' : 'expand_more'} />
                </button>
                
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', background: entry.isCurrent ? 'var(--sf-bg-surface-hover)' : 'var(--sf-bg-surface)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      {Object.entries(entry.measurements).map(([key, val]) => {
                        const point = MEASUREMENT_POINTS.find(p => p.id === key);
                        if (!point || val === undefined) return null;
                        
                        // Check if it changed from the older entry
                        const olderVal = olderEntry?.measurements[key as keyof Measurements];
                        const diff = olderVal !== undefined ? Number(val) - Number(olderVal) : 0;
                        
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', padding: '8px', background: 'var(--sf-bg-default)', borderRadius: 'var(--sf-radius-sm)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>{point.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 500 }}>{val}&quot;</span>
                              {diff !== 0 && (
                                <span style={{ fontSize: '12px', color: diff > 0 ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center' }}>
                                  <Symbol name={diff > 0 ? 'trending_up' : 'trending_down'} size={14} />
                                  {Math.abs(diff)}&quot;
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}
