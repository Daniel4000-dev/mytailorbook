import React, { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { formatDate, parseMeasurementValue } from '@/lib/formatters';
import type { Customer, Measurements } from '@/lib/types';
import { FEMALE_MEASUREMENT_POINTS, MALE_MEASUREMENT_POINTS } from './MeasurementAnatomy';
import styles from './MeasurementHistorySheet.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

interface TimelineEntry {
  date: string;
  measurements: Record<string, number | string | undefined>;
  isCurrent: boolean;
}

export default function MeasurementHistorySheet({ isOpen, onClose, customer }: Props) {
  const history = customer.measurementsHistory || [];
  const currentMeasurements = customer.measurements || {};
  const currentUpdatedAt = customer.measurementsUpdatedAt;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Combine current and history for a full timeline
  const timeline: TimelineEntry[] = [];
  if (Object.keys(currentMeasurements).length > 0) {
    timeline.push({
      date: currentUpdatedAt || new Date().toISOString(),
      measurements: currentMeasurements,
      isCurrent: true,
    });
  }
  timeline.push(...history.map((h) => ({ ...h, isCurrent: false })));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Measurement History">
      <div className={styles.container}>
        {timeline.length === 0 ? (
          <div className={styles.emptyState}>
            <Symbol name="history" size={36} className={styles.emptyIcon} />
            <p>No measurement history recorded yet.</p>
          </div>
        ) : (
          timeline.map((entry, index) => {
            const isExpanded = expandedIndex === index;
            // Compare with the PREVIOUS entry (chronologically older, so index + 1)
            const olderEntry = timeline[index + 1];

            return (
              <div key={index} className={styles.entryCard}>
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className={`${styles.entryHeader} ${entry.isCurrent ? styles.currentHeader : ''}`}
                >
                  <div className={styles.headerTitle}>
                    <Symbol
                      name="straighten"
                      size={18}
                      className={entry.isCurrent ? styles.iconCurrent : styles.iconPast}
                    />
                    <span className={styles.headerDate}>
                      {formatDate(entry.date)}
                    </span>
                    {entry.isCurrent && <span className={styles.currentBadge}>Current</span>}
                  </div>
                  <Symbol
                    name={isExpanded ? 'expand_less' : 'expand_more'}
                    size={20}
                    className={styles.toggleIcon}
                  />
                </button>

                {isExpanded && (
                  <div className={styles.entryBody}>
                    <div className={styles.grid}>
                      {Object.entries(entry.measurements).map(([key, val]) => {
                        const point = [...FEMALE_MEASUREMENT_POINTS, ...MALE_MEASUREMENT_POINTS].find((p) => p.id === key);
                        if (!point || val === undefined || val === null || val === '') return null;

                        // Check if it changed from the older entry
                        const olderVal = olderEntry?.measurements[key as keyof Measurements];
                        const currentNum = parseMeasurementValue(val);
                        const olderNum = olderVal !== undefined && olderVal !== null ? parseMeasurementValue(olderVal) : null;
                        const diff = currentNum !== null && olderNum !== null
                          ? Math.round((currentNum - olderNum) * 100) / 100
                          : 0;

                        return (
                          <div key={key} className={styles.item}>
                            <span className={styles.itemLabel}>{point.name}</span>
                            <div className={styles.itemValueRow}>
                              <span className={styles.itemValue}>{String(val)}&quot;</span>
                              {diff !== 0 && (
                                <span
                                  className={`${styles.diffBadge} ${diff > 0 ? styles.diffUp : styles.diffDown}`}
                                  title={`Difference from previous session: ${diff > 0 ? '+' : ''}${diff}"`}
                                >
                                  <Symbol name={diff > 0 ? 'trending_up' : 'trending_down'} size={13} />
                                  {diff > 0 ? `+${diff}` : `${diff}`}&quot;
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
