'use client';

import type { StatusChange } from '@/lib/types';
import { formatDate } from '@/lib/formatters';
import styles from './ActivityTimeline.module.css';

interface ActivityTimelineProps {
  history: StatusChange[];
}

export default function ActivityTimeline({ history }: ActivityTimelineProps) {
  return (
    <div className={styles.timeline}>
      {history.map((entry, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.dotLine}>
            <span className={`${styles.dot} ${i === history.length - 1 ? styles.dotActive : ''}`} />
            {i < history.length - 1 && <span className={styles.line} />}
          </div>
          <div className={styles.content}>
            <p className={styles.action}>
              {entry.from
                ? <>{entry.from} → <strong>{entry.to}</strong></>
                : <>Created as <strong>{entry.to}</strong></>
              }
            </p>
            <p className={styles.meta}>
              {entry.changedByName} · {formatDate(entry.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
