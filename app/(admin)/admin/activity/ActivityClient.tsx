'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import { AdminAuditLogEntry } from '@/lib/admin/queries';
import { formatAuditAction, FormattedAuditAction } from '@/lib/admin/auditNarratives';
import styles from './ActivityClient.module.css';

interface ActivityClientProps {
  initialEntries: AdminAuditLogEntry[];
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function formatFullTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ActivityClient({ initialEntries }: ActivityClientProps) {
  const [entries] = useState<AdminAuditLogEntry[]>(initialEntries);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalEntry, setActiveModalEntry] = useState<{
    entry: AdminAuditLogEntry;
    formatted: FormattedAuditAction;
  } | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Pre-calculate formatted actions
  const formattedEntries = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      formatted: formatAuditAction(entry),
    }));
  }, [entries]);

  // Telemetry stats
  const stats = useMemo(() => {
    const total = entries.length;
    const uniqueAdmins = new Set(entries.map((e) => e.adminName || 'Admin')).size;
    const past24h = entries.filter((e) => {
      const time = new Date(e.createdAt).getTime();
      return Date.now() - time < 24 * 60 * 60 * 1000;
    }).length;

    return { total, uniqueAdmins, past24h };
  }, [entries]);

  // Filtered rows
  const filtered = useMemo(() => {
    return formattedEntries.filter(({ entry, formatted }) => {
      if (selectedCategory !== 'all' && formatted.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAdmin = (entry.adminName || '').toLowerCase().includes(q);
        const matchesSummary = formatted.summary.toLowerCase().includes(q);
        const matchesLabel = formatted.label.toLowerCase().includes(q);
        const matchesTarget = (entry.targetId || '').toLowerCase().includes(q);
        if (!matchesAdmin && !matchesSummary && !matchesLabel && !matchesTarget) {
          return false;
        }
      }
      return true;
    });
  }, [formattedEntries, selectedCategory, searchQuery]);

  function handleCopyPayload(diff: unknown) {
    navigator.clipboard.writeText(JSON.stringify(diff, null, 2)).then(() => {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    });
  }

  // Handle escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && activeModalEntry) {
        setActiveModalEntry(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModalEntry]);

  const categories = ['all', 'Craft Modes', 'Subscriptions', 'Affiliates', 'Security', 'General'];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Audit Trail & Admin Activity</h1>
          <p className={styles.subheading}>
            Immutable ledger of every mutating administrative action taken across tailor shops, craft settings, and partner referrals.
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Total Recorded Events</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="history" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.total}</div>
          <div className={styles.kpiFooter}>Full audit history captured</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Active Admins</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="verified_user" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.uniqueAdmins}</div>
          <div className={styles.kpiFooter}>Operators performing shop overrides</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Last 24 Hours</span>
            <div className={styles.kpiIconWrap}>
              <Symbol name="schedule" size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.past24h}</div>
          <div className={styles.kpiFooter}>Mutating actions today</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Symbol name="search" size={16} style={{ color: 'var(--sf-text-secondary)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by operator, tailor shop, or action…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.categoryPills}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === cat ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? `All Activities (${entries.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Table */}
      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Symbol name="search" size={32} style={{ color: 'var(--sf-text-secondary)' }} />
            <div className={styles.emptyTitle}>No matching activity records</div>
            <p>Try refining your search keyword or select a different category filter.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Operator</th>
                <th>Category</th>
                <th>Action & Impact</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ entry, formatted }) => {
                const badgeClass =
                  formatted.badgeStyle === 'emerald'
                    ? styles.badgeEmerald
                    : formatted.badgeStyle === 'blue'
                    ? styles.badgeBlue
                    : formatted.badgeStyle === 'purple'
                    ? styles.badgePurple
                    : formatted.badgeStyle === 'amber'
                    ? styles.badgeAmber
                    : styles.badgeGray;

                return (
                  <tr key={entry.id}>
                    {/* Operator */}
                    <td>
                      <div className={styles.adminCell}>
                        <div className={styles.adminAvatar}>{formatted.adminInitial}</div>
                        <span className={styles.adminName}>{entry.adminName || 'Admin'}</span>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td>
                      <span className={`${styles.badge} ${badgeClass}`}>
                        <Symbol name={formatted.iconName} size={12} />
                        <span>{formatted.label}</span>
                      </span>
                    </td>

                    {/* Narrative Description */}
                    <td>
                      <div className={styles.narrative}>
                        <span>{formatted.summary}</span>
                        {formatted.targetUrl && (
                          <Link
                            href={formatted.targetUrl}
                            className={styles.targetLink}
                            target="_blank"
                          >
                            <span>Open</span>
                            <Symbol name="arrow_forward" size={11} />
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Time */}
                    <td>
                      <span className={styles.timeCell} title={formatFullTime(entry.createdAt)}>
                        {timeAgo(entry.createdAt)}
                      </span>
                    </td>

                    {/* Payload Inspect Button */}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.inspectBtn}
                          onClick={() => setActiveModalEntry({ entry, formatted })}
                          title="Inspect raw audit diff"
                        >
                          <Symbol name="notes" size={13} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Raw Audit Diff Inspection */}
      {activeModalEntry && (
        <div className={styles.modalBackdrop} onClick={() => setActiveModalEntry(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <span>Audit Details: {activeModalEntry.formatted.label}</span>
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setActiveModalEntry(null)}
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <strong style={{ fontSize: 13, color: 'var(--sf-text-secondary)' }}>
                  Action Summary
                </strong>
                <p style={{ margin: '4px 0 12px 0', fontSize: 14 }}>
                  {activeModalEntry.formatted.summary}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13, color: 'var(--sf-text-secondary)' }}>
                  Raw Mutation Diff
                </strong>
                <button
                  type="button"
                  className={styles.inspectBtn}
                  onClick={() => handleCopyPayload(activeModalEntry.entry.diff)}
                >
                  <Symbol
                    name={copiedPayload ? 'check' : 'content_copy'}
                    size={13}
                    style={copiedPayload ? { color: '#10b981' } : undefined}
                  />
                  <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className={styles.codeBlock}>
                {activeModalEntry.entry.diff
                  ? JSON.stringify(activeModalEntry.entry.diff, null, 2)
                  : 'No payload diff recorded'}
              </pre>

              <div style={{ fontSize: 12, color: 'var(--sf-text-secondary)' }}>
                Target Type: <code>{activeModalEntry.entry.targetType || 'unknown'}</code> • Target ID:{' '}
                <code>{activeModalEntry.entry.targetId || 'n/a'}</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
