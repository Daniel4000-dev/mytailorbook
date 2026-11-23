'use client';

import { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import BroadcastComposer from './BroadcastComposer';
import BroadcastDetailModal from './BroadcastDetailModal';
import { getBroadcastDetailAction, type BroadcastDetailResult } from './actions';
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
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<BroadcastDetailResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleOpenDetail = async (broadcastId: string) => {
    setSelectedBroadcastId(broadcastId);
    setLoadingDetail(true);
    setDetailData(null);
    try {
      const res = await getBroadcastDetailAction(broadcastId);
      if (res.success && res.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error('[BroadcastsClient] Error loading broadcast details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedBroadcastId(null);
    setDetailData(null);
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
          <div>
            <h3 className={styles.historyTitle}>Recent Broadcast Dispatches</h3>
            <p className={styles.historySubtitle}>
              Click any dispatch row below to monitor individual recipient delivery, read receipts, and device push statuses.
            </p>
          </div>
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
                  <th>Date &amp; Time</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className={styles.clickableRow}
                    onClick={() => handleOpenDetail(item.id)}
                    title="Click to view recipient delivery and read receipts"
                  >
                    <td>
                      <div className={styles.titleCell}>
                        <strong>{item.title}</strong>
                        <span className={styles.clickHint}>Click to view recipient activity</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.targetBadge}>
                        {item.targetMode} · {item.targetPlan}
                      </span>
                    </td>
                    <td>
                      <span className={styles.audienceBadge}>
                        {item.targetAudience === 'owners_only'
                          ? 'Owners Only'
                          : item.targetAudience === 'staff_only'
                          ? 'Staff Only'
                          : 'Everyone'}
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
                    <td>
                      <button
                        className={styles.inspectBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item.id);
                        }}
                      >
                        <Symbol name="visibility" size={14} />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Recipient Detail Modal */}
      {selectedBroadcastId && (
        <BroadcastDetailModal
          data={detailData}
          loading={loadingDetail}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

