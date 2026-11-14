'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import Symbol from '@/components/ui/Symbol/Symbol';
import type {
  EngagementTelemetry,
  AtRiskShop,
  StreakChampion,
  PowerWorkshop,
  LiveCraftAction,
} from '@/lib/admin/engagementTypes';
import { fetchEngagementTelemetryAction, sendTailorNudgeAction } from './actions';
import styles from './EngagementClient.module.css';

interface EngagementClientProps {
  initialData: EngagementTelemetry;
}

type TabType = 'live' | 'atRisk' | 'streak' | 'power';
type RefreshInterval = 15 | 30 | 0; // 0 = paused

const QUICK_NUDGE_TEMPLATES = [
  {
    label: '✂️ Pending Orders Check-In',
    title: 'Workshop Order Check-In',
    message: 'Hello from MyStitchBook! You have pending garment orders waiting. Hop into your workshop production board to advance your work!',
  },
  {
    label: '🔥 Streak At Risk',
    title: 'Your Tailoring Streak is at Risk!',
    message: "Don't let your daily cutting & sewing streak break! Open your workshop today to preserve your streak and earn craft XP.",
  },
  {
    label: '📏 Client Measurements Needed',
    title: 'Client Records Update Reminder',
    message: 'Friendly reminder to ensure all client measurements and order intake notes are saved on your production table.',
  },
];

export default function EngagementClient({ initialData }: EngagementClientProps) {
  const [data, setData] = useState<EngagementTelemetry>(initialData);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [modeFilter, setModeFilter] = useState<'all' | 'bespoke' | 'rtw' | 'hybrid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(15);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(initialData.lastRefreshedAt));
  const [isRefreshing, startRefreshTransition] = useTransition();

  // Nudge Modal State
  const [nudgeTarget, setNudgeTarget] = useState<{ shopId: string; shopName: string } | null>(null);
  const [nudgeTitle, setNudgeTitle] = useState('Workshop Order Check-In');
  const [nudgeMessage, setNudgeMessage] = useState(
    'Hello from MyStitchBook! You have pending garment orders waiting. Hop into your workshop production board to advance your work!'
  );
  const [isSendingNudge, startNudgeTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval === 0) return;

    const timer = setInterval(() => {
      startRefreshTransition(async () => {
        try {
          const fresh = await fetchEngagementTelemetryAction(modeFilter);
          setData(fresh);
          setLastUpdated(new Date(fresh.lastRefreshedAt));
        } catch (err) {
          console.error('[EngagementClient] Auto-refresh failed:', err);
        }
      });
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, modeFilter]);

  // Mode switcher trigger
  const handleModeChange = (newMode: 'all' | 'bespoke' | 'rtw' | 'hybrid') => {
    setModeFilter(newMode);
    startRefreshTransition(async () => {
      try {
        const fresh = await fetchEngagementTelemetryAction(newMode);
        setData(fresh);
        setLastUpdated(new Date(fresh.lastRefreshedAt));
      } catch (err) {
        console.error('[EngagementClient] Mode filter reload failed:', err);
      }
    });
  };

  const handleManualRefresh = () => {
    startRefreshTransition(async () => {
      try {
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
        setLastUpdated(new Date(fresh.lastRefreshedAt));
        showToast('Telemetry refreshed.');
      } catch (err) {
        console.error('[EngagementClient] Manual refresh failed:', err);
      }
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Nudge Modal Action
  const handleSendNudge = () => {
    if (!nudgeTarget) return;

    startNudgeTransition(async () => {
      const res = await sendTailorNudgeAction({
        shopId: nudgeTarget.shopId,
        title: nudgeTitle,
        message: nudgeMessage,
      });

      if (res.success) {
        setNudgeTarget(null);
        showToast(`Nudge delivered to ${nudgeTarget.shopName}!`);
      } else {
        alert(res.error || 'Failed to send tailor nudge.');
      }
    });
  };

  // Filtered views
  const filteredLiveFeed = useMemo(() => {
    if (!searchQuery.trim()) return data.liveFeed;
    const q = searchQuery.toLowerCase();
    return data.liveFeed.filter(
      (a) =>
        a.shopName.toLowerCase().includes(q) ||
        a.actorName.toLowerCase().includes(q) ||
        a.actionLabel.toLowerCase().includes(q)
    );
  }, [data.liveFeed, searchQuery]);

  const filteredAtRiskShops = useMemo(() => {
    if (!searchQuery.trim()) return data.atRiskShops;
    const q = searchQuery.toLowerCase();
    return data.atRiskShops.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.riskReason.toLowerCase().includes(q)
    );
  }, [data.atRiskShops, searchQuery]);

  const filteredStreakChampions = useMemo(() => {
    if (!searchQuery.trim()) return data.streakChampions;
    const q = searchQuery.toLowerCase();
    return data.streakChampions.filter((s) => s.shopName.toLowerCase().includes(q));
  }, [data.streakChampions, searchQuery]);

  const filteredPowerWorkshops = useMemo(() => {
    if (!searchQuery.trim()) return data.powerWorkshops;
    const q = searchQuery.toLowerCase();
    return data.powerWorkshops.filter((s) => s.shopName.toLowerCase().includes(q));
  }, [data.powerWorkshops, searchQuery]);

  function getCraftBadgeClass(category: LiveCraftAction['category']) {
    switch (category) {
      case 'cutting':
        return styles.craftCutting;
      case 'sewing':
        return styles.craftSewing;
      case 'measurement':
        return styles.craftMeasurement;
      case 'fitting':
        return styles.craftFitting;
      case 'pickup':
        return styles.craftPickup;
      case 'payment':
        return styles.craftPayment;
      case 'streak':
        return styles.craftStreak;
      default:
        return styles.craftSystem;
    }
  }

  function getModePillClass(mode: string) {
    if (mode === 'rtw') return styles.modeRtw;
    if (mode === 'hybrid') return styles.modeHybrid;
    return styles.modeBespoke;
  }

  return (
    <div className={styles.container}>
      {/* ── Header Row with Real-Time Pulse ── */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Live Tailor Engagement & Health</h1>
          <div className={styles.subheading}>
            <span className={styles.liveBadge}>
              <span className={styles.pulseDot}></span>
              LIVE PULSE
            </span>
            <span>
              Updated {lastUpdated.toLocaleTimeString()} (
              {refreshInterval > 0 ? `Auto-refreshing every ${refreshInterval}s` : 'Paused'})
            </span>
          </div>
        </div>

        <div className={styles.headerControls}>
          {/* Refresh Intervals */}
          <div className={styles.refreshControls}>
            <button
              type="button"
              onClick={() => setRefreshInterval(15)}
              className={`${styles.refreshBtn} ${refreshInterval === 15 ? styles.refreshBtnActive : ''}`}
            >
              15s
            </button>
            <button
              type="button"
              onClick={() => setRefreshInterval(30)}
              className={`${styles.refreshBtn} ${refreshInterval === 30 ? styles.refreshBtnActive : ''}`}
            >
              30s
            </button>
            <button
              type="button"
              onClick={() => setRefreshInterval(0)}
              className={`${styles.refreshBtn} ${refreshInterval === 0 ? styles.refreshBtnActive : ''}`}
            >
              Pause
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={styles.manualRefreshBtn}
          >
            <Symbol name="sync" size={14} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Telemetry Grid ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Stickiness (DAU/MAU)</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
              <Symbol name="monitoring" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.stickinessRatio}%</span>
          <span className={styles.statSubtext}>Daily tailors returning each month</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Online Now</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <Symbol name="person" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.onlineNow}</span>
          <span className={styles.statSubtext}>Active in the last 15 minutes</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Daily Active (DAU)</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0284c7' }}>
              <Symbol name="calendar_today" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.dailyActive}</span>
          <span className={styles.statSubtext}>Active in the last 24 hours</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Weekly Active (WAU)</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' }}>
              <Symbol name="date_range" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.weeklyActive}</span>
          <span className={styles.statSubtext}>Active in the last 7 days</span>
        </div>

        <div className={`${styles.statCard} ${data.atRiskCount > 0 ? styles.statCardAlert : ''}`}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>At-Risk Workshops</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              <Symbol name="warning" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.atRiskCount}</span>
          <span className={styles.statSubtext}>Pending orders & inactive &gt;48h</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Active Craft Streaks</span>
            <div className={styles.statIconWrap} style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' }}>
              <Symbol name="local_fire_department" size={18} fill />
            </div>
          </div>
          <span className={styles.statValue}>{data.activeStreaksCount}</span>
          <span className={styles.statSubtext}>Workshops with daily active streaks</span>
        </div>
      </div>

      {/* ── Search Bar & Mode Switcher ── */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <Symbol name="search" size={16} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search tailor shop, tailor name, or craft action…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.modeGroup}>
          <button
            type="button"
            onClick={() => handleModeChange('all')}
            className={`${styles.modeBtn} ${modeFilter === 'all' ? styles.modeBtnActive : ''}`}
          >
            All Modes
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('bespoke')}
            className={`${styles.modeBtn} ${modeFilter === 'bespoke' ? styles.modeBtnActive : ''}`}
          >
            Bespoke
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('rtw')}
            className={`${styles.modeBtn} ${modeFilter === 'rtw' ? styles.modeBtnActive : ''}`}
          >
            Ready-to-Wear
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('hybrid')}
            className={`${styles.modeBtn} ${modeFilter === 'hybrid' ? styles.modeBtnActive : ''}`}
          >
            Hybrid
          </button>
        </div>
      </div>

      {/* ── Segmented Control Tabs ── */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`${styles.tabBtn} ${activeTab === 'live' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="bolt" size={16} />
          <span>Live Craft Stream</span>
          <span className={styles.tabCount}>{filteredLiveFeed.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('atRisk')}
          className={`${styles.tabBtn} ${activeTab === 'atRisk' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="warning" size={16} />
          <span>At-Risk & Idle Shops</span>
          <span className={`${styles.tabCount} ${data.atRiskCount > 0 ? styles.tabCountAlert : ''}`}>
            {filteredAtRiskShops.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('streak')}
          className={`${styles.tabBtn} ${activeTab === 'streak' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="local_fire_department" size={16} />
          <span>Streak Champions</span>
          <span className={styles.tabCount}>{filteredStreakChampions.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('power')}
          className={`${styles.tabBtn} ${activeTab === 'power' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="star" size={16} />
          <span>Power Workshops</span>
          <span className={styles.tabCount}>{filteredPowerWorkshops.length}</span>
        </button>
      </div>

      {/* ── Main Tab Content ── */}
      <div className={styles.tabContent}>
        {/* TAB 1: LIVE CRAFT STREAM */}
        {activeTab === 'live' && (
          <div>
            {filteredLiveFeed.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="schedule" size={32} />
                <span className={styles.emptyStateTitle}>No live craft activity recorded recently</span>
                <span>Actions appear here in real-time as tailors cut, sew, and manage orders.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Tailor Shop</th>
                      <th>Tailor / Actor</th>
                      <th>Craft Action</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLiveFeed.map((item) => (
                      <tr key={item.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </td>
                        <td>
                          <div className={styles.shopCell}>
                            <span className={styles.shopName}>{item.shopName}</span>
                            <div className={styles.shopSub}>
                              <span className={`${styles.modePill} ${getModePillClass(item.businessMode)}`}>
                                {item.businessMode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.actorName}</td>
                        <td>
                          <span className={`${styles.craftBadge} ${getCraftBadgeClass(item.category)}`}>
                            <Symbol name={item.categoryIcon} size={13} />
                            <span>{item.actionLabel}</span>
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtnRow}>
                            <button
                              type="button"
                              onClick={() => setNudgeTarget({ shopId: item.shopId, shopName: item.shopName })}
                              className={styles.nudgeBtn}
                            >
                              <Symbol name="send" size={12} />
                              <span>Nudge</span>
                            </button>
                            <Link href={`/admin/organizations/${item.orgId}`} className={styles.manageLink}>
                              <Symbol name="tune" size={12} />
                              <span>Inspect</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AT-RISK SHOPS */}
        {activeTab === 'atRisk' && (
          <div>
            {filteredAtRiskShops.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="check_circle" size={36} style={{ color: '#059669' }} />
                <span className={styles.emptyStateTitle}>All tailor shops are healthy and active!</span>
                <span>No shops with open garment orders have been idle for more than 48 hours.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tailor Shop</th>
                      <th>Days Idle</th>
                      <th>Pending Orders</th>
                      <th>Risk Reason</th>
                      <th>Direct Intervention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAtRiskShops.map((shop) => (
                      <tr key={shop.shopId}>
                        <td>
                          <div className={styles.shopCell}>
                            <span className={styles.shopName}>{shop.shopName}</span>
                            <div className={styles.shopSub}>
                              <span className={`${styles.modePill} ${getModePillClass(shop.businessMode)}`}>
                                {shop.businessMode}
                              </span>
                              <span>Plan: {shop.subscriptionStatus}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: shop.daysInactive >= 5 ? '#dc2626' : '#d97706' }}>
                            {shop.daysInactive} days inactive
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{shop.pendingOrdersCount} orders</span>
                          {shop.overdueOrdersCount > 0 && (
                            <span style={{ display: 'block', fontSize: '0.74rem', color: '#dc2626', fontWeight: 600 }}>
                              ({shop.overdueOrdersCount} overdue!)
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#475569' }}>{shop.riskReason}</span>
                        </td>
                        <td>
                          <div className={styles.actionBtnRow}>
                            <button
                              type="button"
                              onClick={() => {
                                setNudgeTarget({ shopId: shop.shopId, shopName: shop.shopName });
                                setNudgeTitle('Pending Orders Follow-Up');
                                setNudgeMessage(
                                  `Hello from MyStitchBook! You have ${shop.pendingOrdersCount} open garment orders awaiting updates. Drop by your workshop to keep your clients happy!`
                                );
                              }}
                              className={styles.nudgeBtn}
                            >
                              <Symbol name="campaign" size={13} />
                              <span>Send Push Nudge</span>
                            </button>
                            <Link href={`/admin/organizations/${shop.orgId}`} className={styles.manageLink}>
                              <Symbol name="tune" size={12} />
                              <span>Manage Shop</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STREAK CHAMPIONS */}
        {activeTab === 'streak' && (
          <div>
            {filteredStreakChampions.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="local_fire_department" size={36} />
                <span className={styles.emptyStateTitle}>No active streaks recorded</span>
                <span>Workshops build streaks by cutting, sewing, or updating orders daily.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tailor Shop</th>
                      <th>Mode</th>
                      <th>Current Streak</th>
                      <th>Best Streak</th>
                      <th>Freeze Shields</th>
                      <th>Craft XP</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStreakChampions.map((champ) => (
                      <tr key={champ.shopId}>
                        <td>
                          <div className={styles.shopCell}>
                            <span className={styles.shopName}>{champ.shopName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.modePill} ${getModePillClass(champ.businessMode)}`}>
                            {champ.businessMode}
                          </span>
                        </td>
                        <td>
                          <span className={styles.streakCount}>
                            🔥 {champ.currentStreak} {champ.currentStreak === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{champ.longestStreak} days</span>
                        </td>
                        <td>
                          <span className={styles.freezeCount}>
                            ❄️ {champ.freezesRemaining} {champ.freezesRemaining === 1 ? 'shield' : 'shields'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#4f46e5' }}>
                            ⭐ {champ.xpPoints.toLocaleString()} XP
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtnRow}>
                            <button
                              type="button"
                              onClick={() => {
                                setNudgeTarget({ shopId: champ.shopId, shopName: champ.shopName });
                                setNudgeTitle('🔥 Keep Your Streak Blazing!');
                                setNudgeMessage(
                                  `Congratulations on your ${champ.currentStreak}-day tailoring streak! Keep up the craft consistency today.`
                                );
                              }}
                              className={styles.nudgeBtn}
                            >
                              <Symbol name="favorite" size={12} />
                              <span>Cheer</span>
                            </button>
                            <Link href={`/admin/organizations/${champ.orgId}`} className={styles.manageLink}>
                              <Symbol name="tune" size={12} />
                              <span>Inspect</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: POWER WORKSHOPS */}
        {activeTab === 'power' && (
          <div>
            {filteredPowerWorkshops.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="star" size={36} />
                <span className={styles.emptyStateTitle}>No high-volume workshop actions recorded this week</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tailor Shop</th>
                      <th>Mode</th>
                      <th>Activity Grade</th>
                      <th>7-Day Volume</th>
                      <th>Craft Breakdown</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPowerWorkshops.map((pw) => (
                      <tr key={pw.shopId}>
                        <td>
                          <div className={styles.shopCell}>
                            <span className={styles.shopName}>{pw.shopName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.modePill} ${getModePillClass(pw.businessMode)}`}>
                            {pw.businessMode}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background:
                                pw.activityGrade === 'High'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : pw.activityGrade === 'Medium'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(100, 116, 139, 0.15)',
                              color:
                                pw.activityGrade === 'High'
                                  ? '#047857'
                                  : pw.activityGrade === 'Medium'
                                  ? '#b45309'
                                  : '#475569',
                            }}
                          >
                            {pw.activityGrade} Activity
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{pw.totalActions7d} actions</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {pw.actionBreakdown.slice(0, 3).map((b) => (
                              <span
                                key={b.label}
                                style={{
                                  fontSize: '0.72rem',
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: '#334155',
                                }}
                              >
                                {b.label}: {b.count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionBtnRow}>
                            <button
                              type="button"
                              onClick={() => setNudgeTarget({ shopId: pw.shopId, shopName: pw.shopName })}
                              className={styles.nudgeBtn}
                            >
                              <Symbol name="send" size={12} />
                              <span>Nudge</span>
                            </button>
                            <Link href={`/admin/organizations/${pw.orgId}`} className={styles.manageLink}>
                              <Symbol name="tune" size={12} />
                              <span>Inspect</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Nudge Modal ── */}
      {nudgeTarget && (
        <div className={styles.modalBackdrop} onClick={() => setNudgeTarget(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Send Tailor Push Nudge</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Target: <strong>{nudgeTarget.shopName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNudgeTarget(null)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Pre-filled Quick Template Chips */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Quick Inspiration Templates:
                </span>
                <div className={styles.quickTemplatesGroup}>
                  {QUICK_NUDGE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      className={styles.quickTemplateChip}
                      onClick={() => {
                        setNudgeTitle(tmpl.title);
                        setNudgeMessage(tmpl.message);
                      }}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Notification Title
                </label>
                <input
                  type="text"
                  className={styles.modalInput}
                  value={nudgeTitle}
                  onChange={(e) => setNudgeTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Push &amp; In-App Message
                </label>
                <textarea
                  className={styles.modalTextarea}
                  value={nudgeMessage}
                  onChange={(e) => setNudgeMessage(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setNudgeTarget(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNudge}
                disabled={isSendingNudge}
                className={styles.modalSendBtn}
              >
                <Symbol name="send" size={14} />
                <span>{isSendingNudge ? 'Sending…' : 'Dispatch Nudge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
