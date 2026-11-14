'use client';

import { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import BroadcastComposer from './BroadcastComposer';
import styles from './page.module.css';

interface BroadcastHistoryItem {
  id: string;
  adminName: string;
  title: string;
  targetMode: string;
  targetPlan: string;
  targetAudience?: string;
  shopsCount: number;
  recipientsCount?: number;
  pushCount: number;
  createdAt: string;
}

interface BroadcastsClientProps {
  initialHistory: BroadcastHistoryItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BroadcastsClient({ initialHistory }: BroadcastsClientProps) {
  const [history, setHistory] = useState<BroadcastHistoryItem[]>(initialHistory);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <div className={styles.headingRow}>
        <div>
          <h1 className={styles.heading}>Announcement Broadcast Center</h1>
          <p className={styles.subheading}>
            Dispatch in-app notifications and device alerts directly to tailor shops.
          </p>
        </div>
      </div>

      <div className={styles.composerCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderIcon}>
            <Symbol name="campaign" size={18} />
          </div>
          <div>
            <h2 className={styles.cardTitle}>Compose New Broadcast</h2>
            <p className={styles.cardSubtitle}>
              Tailors will see this immediately in their notification bell and receive a mobile push notification.
            </p>
          </div>
        </div>

        <BroadcastComposer onSuccess={handleRefresh} />
      </div>

      <div className={styles.historyCard}>
        <div className={styles.historyHeader}>
          <h3 className={styles.historyTitle}>Recent Broadcast Dispatches</h3>
          <span className={styles.historyCount}>{history.length} logged</span>
        </div>

        {history.length === 0 ? (
          <p className={styles.empty}>No broadcasts dispatched yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Announcement Title</th>
                  <th>Target Shops</th>
                  <th>Target Audience</th>
                  <th>Delivered In-App</th>
                  <th>Device Pushes</th>
                  <th>Dispatched By</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>
                      <span className={styles.targetBadge}>
                        {item.targetMode} · {item.targetPlan}
                      </span>
                    </td>
                    <td>
                      <span className={styles.audienceBadge}>
                        {item.targetAudience === 'owners_only' ? 'Owners Only' : item.targetAudience === 'staff_only' ? 'Staff Only' : 'Everyone'}
                      </span>
                    </td>
                    <td>
                      <strong>{item.recipientsCount || item.shopsCount}</strong> delivered
                    </td>
                    <td>
                      {item.pushCount > 0 ? (
                        <span className={styles.pushActive}>{item.pushCount} pushes</span>
                      ) : (
                        <span className={styles.pushZero}>0</span>
                      )}
                    </td>
                    <td>{item.adminName}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

