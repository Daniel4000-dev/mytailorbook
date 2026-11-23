'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { BroadcastDetailResult } from './actions';
import styles from './page.module.css';

interface BroadcastDetailModalProps {
  data: BroadcastDetailResult | null;
  loading: boolean;
  onClose: () => void;
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

export default function BroadcastDetailModal({ data, loading, onClose }: BroadcastDetailModalProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'read' | 'unread' | 'push'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredRecipients = useMemo(() => {
    if (!data) return [];
    return data.recipients.filter((item) => {
      // Tab filter
      if (filterTab === 'read' && item.status !== 'read') return false;
      if (filterTab === 'unread' && item.status !== 'unread') return false;
      if (filterTab === 'push' && !item.hasPushDevice) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesShop = item.shopName.toLowerCase().includes(q);
        const matchesName = item.recipientName.toLowerCase().includes(q);
        const matchesRole = item.recipientRole.toLowerCase().includes(q);
        const matchesEmail = (item.recipientEmail || '').toLowerCase().includes(q);
        return matchesShop || matchesName || matchesRole || matchesEmail;
      }

      return true;
    });
  }, [data, filterTab, searchQuery]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderInfo}>
            <div className={styles.modalBadgeRow}>
              <span className={styles.targetBadge}>
                {data?.targetMode || 'All'} · {data?.targetPlan || 'All'}
              </span>
              <span className={styles.audienceBadge}>
                {data?.targetAudience === 'owners_only'
                  ? 'Owners Only'
                  : data?.targetAudience === 'staff_only'
                  ? 'Staff Only'
                  : 'Everyone'}
              </span>
              {data?.targetFeature && data.targetFeature !== 'all' && (
                <span className={styles.featureBadge}>{data.targetFeature}</span>
              )}
            </div>
            <h2 className={styles.modalTitle}>{data?.title || 'Broadcast Dispatch Activity'}</h2>
            {data && (
              <p className={styles.modalMeta}>
                Dispatched by {data.adminName} on {formatDate(data.dispatchedAt)}
              </p>
            )}
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Close modal">
            <Symbol name="close" size={20} />
          </button>
        </div>

        {loading ? (
          <div className={styles.modalLoading}>
            <div className={styles.spinner} />
            <p>Loading recipient activity metrics...</p>
          </div>
        ) : !data ? (
          <div className={styles.modalLoading}>
            <p>Unable to retrieve broadcast dispatch metrics.</p>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className={styles.modalMetricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Total Delivered In-App</div>
                <div className={styles.metricValue}>{data.summary.totalDelivered}</div>
                <div className={styles.metricSub}>Workshops &amp; team recipients</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Read In-App</div>
                <div className={`${styles.metricValue} ${styles.metricValueSuccess}`}>
                  {data.summary.totalRead}{' '}
                  <span className={styles.metricPercentage}>({data.summary.readRatePercent}%)</span>
                </div>
                <div className={styles.metricSub}>Opened notification bell</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Pending / Unread</div>
                <div className={`${styles.metricValue} ${styles.metricValueWarning}`}>
                  {data.summary.totalUnread}
                </div>
                <div className={styles.metricSub}>Yet to view in notifications</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Push Registered Devices</div>
                <div className={styles.metricValue}>
                  {data.summary.pushDevicesCount}
                </div>
                <div className={styles.metricSub}>
                  {data.summary.pushPushesSent} mobile alert dispatches fired
                </div>
              </div>
            </div>

            {/* Announcement Message Preview */}
            {data.message && (
              <div className={styles.messagePreviewBox}>
                <div className={styles.messagePreviewLabel}>Dispatched Message Copy:</div>
                <div className={styles.messagePreviewText}>{data.message}</div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className={styles.modalFilterBar}>
              <div className={styles.filterTabs}>
                <button
                  className={`${styles.filterTab} ${filterTab === 'all' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  All ({data.recipients.length})
                </button>
                <button
                  className={`${styles.filterTab} ${filterTab === 'read' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterTab('read')}
                >
                  Read ({data.summary.totalRead})
                </button>
                <button
                  className={`${styles.filterTab} ${filterTab === 'unread' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterTab('unread')}
                >
                  Unread ({data.summary.totalUnread})
                </button>
                <button
                  className={`${styles.filterTab} ${filterTab === 'push' ? styles.filterTabActive : ''}`}
                  onClick={() => setFilterTab('push')}
                >
                  Push Registered ({data.summary.pushDevicesCount})
                </button>
              </div>

              <div className={styles.searchWrapper}>
                <Symbol name="search" size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search workshop or tailor name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                    <Symbol name="close" size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Recipients Table */}
            <div className={styles.modalBody}>
              {filteredRecipients.length === 0 ? (
                <div className={styles.modalEmpty}>
                  No recipient records found matching your active filter.
                </div>
              ) : (
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>Workshop</th>
                      <th>Primary Recipient &amp; Role</th>
                      <th>In-App Notification Status</th>
                      <th>Device Push Status</th>
                      <th>Delivered Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipients.map((r) => (
                      <tr key={r.notificationId}>
                        <td>
                          <div className={styles.recipientShop}>
                            <strong>{r.shopName}</strong>
                            <span className={styles.shopModeTag}>{r.businessMode}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.recipientProfile}>
                            <span className={styles.recipientName}>{r.recipientName}</span>
                            <span className={styles.recipientRole}>{r.recipientRole}</span>
                            {r.recipientEmail && (
                              <span className={styles.recipientEmail}>{r.recipientEmail}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {r.status === 'read' ? (
                            <div className={styles.statusReadWrap}>
                              <span className={styles.badgeRead}>
                                <Symbol name="done_all" size={14} /> Read
                              </span>
                              {r.readAt && (
                                <span className={styles.statusTimestamp}>
                                  {formatDate(r.readAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className={styles.statusUnreadWrap}>
                              <span className={styles.badgeUnread}>
                                <Symbol name="schedule" size={14} /> Unread
                              </span>
                              <span className={styles.statusPendingNote}>Pending tailor viewing</span>
                            </div>
                          )}
                        </td>
                        <td>
                          {r.hasPushDevice ? (
                            <div className={styles.pushActiveWrap}>
                              <span className={styles.badgePushActive}>
                                <Symbol name="notifications" size={14} /> Registered
                              </span>
                              <span className={styles.pushDevicesCount}>
                                {r.pushEndpointsCount} device{r.pushEndpointsCount > 1 ? 's' : ''} active
                              </span>
                            </div>
                          ) : (
                            <div className={styles.pushInactiveWrap}>
                              <span className={styles.badgePushInactive}>Not Subscribed</span>
                              <span className={styles.pushHelpText}>
                                Push permission not enabled in browser
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={styles.deliveredDate}>{formatDate(r.deliveredAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <div className={styles.modalFooterNote}>
                Showing {filteredRecipients.length} of {data.recipients.length} recipients
              </div>
              <button className={styles.modalCloseFooterBtn} onClick={onClose}>
                Close Details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

