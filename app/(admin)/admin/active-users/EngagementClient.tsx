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
  CirclePod,
  XpLedgerEntry,
  AdminShopLookup,
} from '@/lib/admin/engagementTypes';
import {
  fetchEngagementTelemetryAction,
  sendTailorNudgeAction,
  adminPairCircleShopsAction,
  adminUnpairCircleShopsAction,
  adminToggleShopSabbaticalAction,
  adminEmergencyStreakFreezeAction,
  adminQuickAdjustStreakAction,
} from './actions';
import styles from './EngagementClient.module.css';

interface EngagementClientProps {
  initialData: EngagementTelemetry;
}

type TabType = 'live' | 'streak' | 'circle' | 'xp' | 'atRisk' | 'power';
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

  // Emergency Streak Freeze Modal State
  const [showEmergencyFreeze, setShowEmergencyFreeze] = useState(false);
  const [freezeCount, setFreezeCount] = useState(1);
  const [freezeReason, setFreezeReason] = useState('Severe rainstorms and power outages');
  const [freezeTargetMode, setFreezeTargetMode] = useState<'bespoke' | 'all'>('bespoke');
  const [isApplyingFreeze, startFreezeTransition] = useTransition();

  // Quick Streak Adjust Modal State
  const [adjustStreakShop, setAdjustStreakShop] = useState<{
    shopId: string;
    shopName: string;
    currentStreak: number;
    bestStreak: number;
    freezes: number;
    xp: number;
  } | null>(null);
  const [targetStreakVal, setTargetStreakVal] = useState(0);
  const [targetBestVal, setTargetBestVal] = useState(0);
  const [targetFreezesVal, setTargetFreezesVal] = useState(0);
  const [targetBonusXpVal, setTargetBonusXpVal] = useState(0);
  const [streakAuditNote, setStreakAuditNote] = useState('');
  const [isSavingStreak, startStreakSaveTransition] = useTransition();

  // Circle Pairing Modal State
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairShopAId, setPairShopAId] = useState('');
  const [pairShopBId, setPairShopBId] = useState('');
  const [pairNote, setPairNote] = useState('');
  const [isPairing, startPairTransition] = useTransition();

  // Bonus XP Modal State
  const [showGrantXpModal, setShowGrantXpModal] = useState(false);
  const [xpTargetShopId, setXpTargetShopId] = useState('');
  const [xpGrantAmount, setXpGrantAmount] = useState(50);
  const [xpGrantReason, setXpGrantReason] = useState('Outstanding craft consistency bonus');
  const [isGrantingXp, startGrantXpTransition] = useTransition();

  // XP Ledger Filter State
  const [selectedXpAction, setSelectedXpAction] = useState<string>('all');

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

  // Emergency Streak Freeze Handler
  const handleApplyEmergencyFreeze = () => {
    startFreezeTransition(async () => {
      const res = await adminEmergencyStreakFreezeAction({
        freezeCount,
        reason: freezeReason,
        targetMode: freezeTargetMode,
      });
      if (res.success) {
        showToast(`Granted +${freezeCount} emergency streak freeze${freezeCount > 1 ? 's' : ''} to ${res.affectedCount} workshops!`);
        setShowEmergencyFreeze(false);
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to apply emergency streak freeze.');
      }
    });
  };

  // Quick Streak Save Handler
  const handleSaveStreakAdjust = () => {
    if (!adjustStreakShop) return;
    startStreakSaveTransition(async () => {
      const res = await adminQuickAdjustStreakAction({
        shopId: adjustStreakShop.shopId,
        streakCurrent: targetStreakVal,
        streakBest: targetBestVal,
        streakFreezes: targetFreezesVal,
        bonusXp: targetBonusXpVal,
        note: streakAuditNote,
      });
      if (res.success) {
        showToast(res.message || 'Streak updated successfully.');
        setAdjustStreakShop(null);
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to adjust streak.');
      }
    });
  };

  // Circle Pairing Handler
  const handlePairShops = () => {
    startPairTransition(async () => {
      const res = await adminPairCircleShopsAction({
        shopAId: pairShopAId,
        shopBId: pairShopBId,
        note: pairNote,
      });
      if (res.success) {
        showToast('Workshops connected into Tailor Circle pod successfully!');
        setShowPairModal(false);
        setPairShopAId('');
        setPairShopBId('');
        setPairNote('');
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to connect workshops.');
      }
    });
  };

  // Circle Unpair Handler
  const handleUnpairPod = (shopAId: string, shopBId: string) => {
    if (!confirm('Are you sure you want to disconnect this Tailor Circle pod?')) return;
    startRefreshTransition(async () => {
      const res = await adminUnpairCircleShopsAction({ shopAId, shopBId });
      if (res.success) {
        showToast('Workshops disconnected from Tailor Circle.');
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to unpair workshops.');
      }
    });
  };

  // Circle Toggle Sabbatical Handler
  const handleToggleSabbatical = (shopId: string, currentSabbatical: boolean) => {
    startRefreshTransition(async () => {
      const res = await adminToggleShopSabbaticalAction({
        shopId,
        isSabbatical: !currentSabbatical,
        reason: !currentSabbatical ? 'Admin Sabbatical Leave' : undefined,
      });
      if (res.success) {
        showToast(!currentSabbatical ? 'Workshop placed on Sabbatical.' : 'Workshop reactivated in Circle.');
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to update sabbatical.');
      }
    });
  };

  // Bonus XP Handler
  const handleGrantXp = () => {
    if (!xpTargetShopId) return;
    startGrantXpTransition(async () => {
      const shop = data.allShopsList.find((s) => s.id === xpTargetShopId);
      const res = await adminQuickAdjustStreakAction({
        shopId: xpTargetShopId,
        streakCurrent: shop?.streakCurrent || 0,
        streakBest: shop?.streakBest || 0,
        streakFreezes: shop?.streakFreezes || 0,
        bonusXp: xpGrantAmount,
        note: xpGrantReason,
      });
      if (res.success) {
        showToast(`Awarded ${xpGrantAmount > 0 ? `+${xpGrantAmount}` : xpGrantAmount} XP successfully.`);
        setShowGrantXpModal(false);
        setXpTargetShopId('');
        const fresh = await fetchEngagementTelemetryAction(modeFilter);
        setData(fresh);
      } else {
        showToast(res.error || 'Failed to award XP.');
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

  const filteredCirclePods = useMemo(() => {
    const pods = data.circleTelemetry?.pods || [];
    if (!searchQuery.trim()) return pods;
    const q = searchQuery.toLowerCase();
    return pods.filter((pod) =>
      pod.members.some((m) => m.shopName.toLowerCase().includes(q))
    );
  }, [data.circleTelemetry?.pods, searchQuery]);

  const filteredXpLedger = useMemo(() => {
    const ledger = data.xpTelemetry?.recentLedger || [];
    let filtered = ledger;
    if (selectedXpAction !== 'all') {
      filtered = filtered.filter((e) => e.actionType === selectedXpAction);
    }
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (e) =>
        e.shopName.toLowerCase().includes(q) ||
        e.actionType.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [data.xpTelemetry?.recentLedger, selectedXpAction, searchQuery]);

  const xpActionTypes = useMemo(() => {
    const ledger = data.xpTelemetry?.recentLedger || [];
    const set = new Set<string>();
    ledger.forEach((e) => {
      if (e.actionType) set.add(e.actionType);
    });
    return Array.from(set);
  }, [data.xpTelemetry?.recentLedger]);

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
          onClick={() => setActiveTab('streak')}
          className={`${styles.tabBtn} ${activeTab === 'streak' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="local_fire_department" size={16} />
          <span>Streaks &amp; Resilience</span>
          <span className={styles.tabCount}>{filteredStreakChampions.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('circle')}
          className={`${styles.tabBtn} ${activeTab === 'circle' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="groups" size={16} />
          <span>Tailor Circle Pods</span>
          <span className={styles.tabCount}>{filteredCirclePods.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('xp')}
          className={`${styles.tabBtn} ${activeTab === 'xp' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="workspace_premium" size={16} />
          <span>XP &amp; Tier Ledger</span>
          <span className={styles.tabCount}>{filteredXpLedger.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('atRisk')}
          className={`${styles.tabBtn} ${activeTab === 'atRisk' ? styles.tabBtnActive : ''}`}
        >
          <Symbol name="warning" size={16} />
          <span>At-Risk &amp; Idle Shops</span>
          <span className={`${styles.tabCount} ${data.atRiskCount > 0 ? styles.tabCountAlert : ''}`}>
            {filteredAtRiskShops.length}
          </span>
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

        {/* TAB 2: STREAKS & RESILIENCE DOCTOR */}
        {activeTab === 'streak' && (
          <div>
            <div className={styles.tabActionToolbar}>
              <div className={styles.tabActionLeft}>
                <div>
                  <h3 className={styles.tabActionHeading}>Streaks &amp; Resilience Doctor</h3>
                  <span className={styles.tabActionSubtext}>
                    Workshops build daily momentum. If a streak broke due to network issues, adjust it here or grant emergency protections.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.emergencyControlBtn}
                onClick={() => setShowEmergencyFreeze(true)}
              >
                <Symbol name="verified_user" size={14} />
                <span>Emergency Nationwide Freeze</span>
              </button>
            </div>

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
                                setAdjustStreakShop({
                                  shopId: champ.shopId,
                                  shopName: champ.shopName,
                                  currentStreak: champ.currentStreak,
                                  bestStreak: champ.longestStreak,
                                  freezes: champ.freezesRemaining,
                                  xp: champ.xpPoints,
                                });
                                setTargetStreakVal(champ.currentStreak);
                                setTargetBestVal(champ.longestStreak);
                                setTargetFreezesVal(champ.freezesRemaining);
                                setTargetBonusXpVal(0);
                                setStreakAuditNote('');
                              }}
                              className={styles.podSmallBtn}
                              title="Directly adjust streak, best streak, freezes, or XP"
                            >
                              <Symbol name="edit" size={12} />
                              <span>Adjust</span>
                            </button>
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

        {/* TAB 3: TAILOR CIRCLE PODS */}
        {activeTab === 'circle' && (
          <div>
            <div className={styles.tabActionToolbar}>
              <div className={styles.tabActionLeft}>
                <div>
                  <h3 className={styles.tabActionHeading}>Tailor Circle Accountability Network</h3>
                  <span className={styles.tabActionSubtext}>
                    Connected workshop pairs &amp; pods maintaining mutual daily streaks. Oversee co-op compliance, sabbaticals, and pairings.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.primaryControlBtn}
                onClick={() => setShowPairModal(true)}
              >
                <Symbol name="group_add" size={14} />
                <span>+ Pair Workshops</span>
              </button>
            </div>

            {/* Circle KPI Mini-Strip */}
            <div className={styles.xpTierGrid}>
              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Connected Pods</span>
                  <Symbol name="groups" size={18} style={{ color: '#4f46e5' }} />
                </div>
                <span className={styles.tierStatValue}>{data.circleTelemetry?.totalPods || 0}</span>
                <span className={styles.tierStatSub}>Active accountability pods</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Paired Workshops</span>
                  <Symbol name="store" size={18} style={{ color: '#0284c7' }} />
                </div>
                <span className={styles.tierStatValue}>{data.circleTelemetry?.pairedWorkshopsCount || 0}</span>
                <span className={styles.tierStatSub}>Tailor shops linked in circles</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Co-Op Secured Today</span>
                  <Symbol name="verified" size={18} style={{ color: '#059669' }} />
                </div>
                <span className={styles.tierStatValue}>{data.circleTelemetry?.coOpSecuredTodayCount || 0}</span>
                <span className={styles.tierStatSub}>Both partners worked today</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>On Sabbatical</span>
                  <Symbol name="spa" size={18} style={{ color: '#9333ea' }} />
                </div>
                <span className={styles.tierStatValue}>{data.circleTelemetry?.sabbaticalCount || 0}</span>
                <span className={styles.tierStatSub}>Streaks paused for leave</span>
              </div>
            </div>

            {filteredCirclePods.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="groups" size={36} />
                <span className={styles.emptyStateTitle}>No Tailor Circle pods active yet</span>
                <span>Pair bespoke workshops together to keep their daily cutting &amp; sewing accountable.</span>
              </div>
            ) : (
              <div className={styles.circleGrid}>
                {filteredCirclePods.map((pod) => {
                  const m1 = pod.members[0];
                  const m2 = pod.members[1];
                  return (
                    <div key={pod.id} className={styles.podCard}>
                      <div className={styles.podCardHeader}>
                        <span className={styles.podIdBadge}>{pod.id}</span>
                        <span
                          className={`${styles.podStatusBadge} ${
                            pod.status === 'active'
                              ? styles.podStatusActive
                              : pod.status === 'partial'
                              ? styles.podStatusPartial
                              : pod.status === 'sabbatical'
                              ? styles.podStatusSabbatical
                              : styles.podStatusDormant
                          }`}
                        >
                          {pod.status === 'active'
                            ? '✅ Co-Op Secured Today'
                            : pod.status === 'partial'
                            ? '⏳ 1 Partner Worked'
                            : pod.status === 'sabbatical'
                            ? '🏖️ On Sabbatical'
                            : '💤 Inactive Today'}
                        </span>
                      </div>

                      <div className={styles.podMembersList}>
                        {pod.members.map((member) => (
                          <div key={member.shopId} className={styles.podMemberRow}>
                            <div className={styles.podMemberInfo}>
                              <div className={styles.podMemberAvatar}>
                                {member.shopName[0]?.toUpperCase() || 'W'}
                              </div>
                              <div className={styles.podMemberMeta}>
                                <span className={styles.podMemberName}>{member.shopName}</span>
                                <span className={styles.podMemberSub}>
                                  🔥 {member.streakCurrent} day streak
                                  {member.isSabbatical && ' · (Sabbatical)'}
                                </span>
                              </div>
                            </div>
                            <div className={styles.podMemberStatus}>
                              <span
                                className={member.isActiveToday ? styles.activeTodayDot : styles.offlineDot}
                                title={member.isActiveToday ? 'Active Today' : 'Offline'}
                              />
                              <button
                                type="button"
                                className={styles.podSmallBtn}
                                onClick={() => handleToggleSabbatical(member.shopId, member.isSabbatical)}
                                title={member.isSabbatical ? 'End sabbatical' : 'Place on sabbatical'}
                              >
                                {member.isSabbatical ? 'Resume' : 'Leave'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.podCardFooter}>
                        <span className={styles.podStreakPill}>
                          🔥 Shared: {pod.sharedStreak}d
                        </span>
                        <div className={styles.podActionBtns}>
                          {m1 && (
                            <button
                              type="button"
                              className={styles.podSmallBtn}
                              onClick={() => {
                                setNudgeTarget({ shopId: m1.shopId, shopName: m1.shopName });
                                setNudgeTitle('Tailor Circle Co-Op Reminder');
                                setNudgeMessage(
                                  `Hello from MyStitchBook! Your Tailor Circle partner is logging craft work today. Open your workshop table to secure your shared co-op streak!`
                                );
                              }}
                            >
                              <Symbol name="campaign" size={12} />
                              <span>Nudge</span>
                            </button>
                          )}
                          {m1 && m2 && (
                            <button
                              type="button"
                              className={styles.podUnpairBtn}
                              onClick={() => handleUnpairPod(m1.shopId, m2.shopId)}
                            >
                              <Symbol name="person_off" size={12} />
                              <span>Unpair</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: XP & TIER LEDGER */}
        {activeTab === 'xp' && (
          <div>
            <div className={styles.tabActionToolbar}>
              <div className={styles.tabActionLeft}>
                <div>
                  <h3 className={styles.tabActionHeading}>XP Ledger &amp; Tailor Tier Distribution</h3>
                  <span className={styles.tabActionSubtext}>
                    Live stream of craft rewards, milestone bonuses, and tailor tier progression across workshops.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className={styles.modalSelect}
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                  value={selectedXpAction}
                  onChange={(e) => setSelectedXpAction(e.target.value)}
                >
                  <option value="all">All Action Types</option>
                  {xpActionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.primaryControlBtn}
                  onClick={() => setShowGrantXpModal(true)}
                >
                  <Symbol name="stars" size={14} />
                  <span>+ Grant Bonus XP</span>
                </button>
              </div>
            </div>

            {/* Tier Distribution Cards */}
            <div className={styles.xpTierGrid}>
              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Apprentice Tailors</span>
                  <Symbol name="straighten" size={18} style={{ color: '#64748b' }} />
                </div>
                <span className={styles.tierStatValue}>
                  {data.xpTelemetry?.tierDistribution.apprenticeCount || 0}
                </span>
                <span className={styles.tierStatSub}>0 – 499 XP · Level 1</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Artisan Tailors</span>
                  <Symbol name="content_cut" size={18} style={{ color: '#0284c7' }} />
                </div>
                <span className={styles.tierStatValue}>
                  {data.xpTelemetry?.tierDistribution.artisanCount || 0}
                </span>
                <span className={styles.tierStatSub}>500 – 1,499 XP · Level 2</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Senior Tailors</span>
                  <Symbol name="workspace_premium" size={18} style={{ color: '#eab308' }} />
                </div>
                <span className={styles.tierStatValue}>
                  {data.xpTelemetry?.tierDistribution.seniorCount || 0}
                </span>
                <span className={styles.tierStatSub}>1,500 – 3,499 XP · Level 3</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Master Tailors</span>
                  <Symbol name="emoji_events" size={18} style={{ color: '#a855f7' }} />
                </div>
                <span className={styles.tierStatValue}>
                  {data.xpTelemetry?.tierDistribution.masterTailorCount || 0}
                </span>
                <span className={styles.tierStatSub}>3,500+ XP · Elite Level 4</span>
              </div>

              <div className={styles.tierStatCard}>
                <div className={styles.tierStatHeader}>
                  <span className={styles.tierStatTitle}>Circulating XP</span>
                  <Symbol name="bolt" size={18} style={{ color: '#f97316' }} />
                </div>
                <span className={styles.tierStatValue}>
                  {data.xpTelemetry?.tierDistribution.totalXpCirculating?.toLocaleString() || '0'}
                </span>
                <span className={styles.tierStatSub}>Total platform craft points</span>
              </div>
            </div>

            {/* Recent XP Ledger Stream */}
            {filteredXpLedger.length === 0 ? (
              <div className={styles.emptyState}>
                <Symbol name="receipt_long" size={36} />
                <span className={styles.emptyStateTitle}>No recent XP events recorded</span>
                <span>Craft points appear here as tailors log garment cutting, fittings, and daily work.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Tailor Shop</th>
                      <th>Action Type</th>
                      <th>XP Amount</th>
                      <th>Description</th>
                      <th>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredXpLedger.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td>
                          <span className={styles.shopName}>{entry.shopName}</span>
                        </td>
                        <td>
                          <span className={styles.actionPill}>{entry.actionType}</span>
                        </td>
                        <td>
                          <span className={styles.xpBadgePill}>
                            +{entry.amount} XP
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {entry.description || 'Craft activity reward'}
                          </span>
                        </td>
                        <td>
                          <Link href={`/admin/organizations/${entry.orgId}`} className={styles.manageLink}>
                            <Symbol name="tune" size={12} />
                            <span>Shop</span>
                          </Link>
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

      {/* ── Emergency Streak Freeze Modal ── */}
      {showEmergencyFreeze && (
        <div className={styles.modalBackdrop} onClick={() => setShowEmergencyFreeze(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Emergency Streak Freeze Protection</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Protect tailor workshop streaks during extreme weather or national utility outages
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergencyFreeze(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGridRow}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Freezes to Add
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={freezeCount}
                    onChange={(e) => setFreezeCount(Number(e.target.value))}
                  >
                    <option value={1}>+1 Freeze Day</option>
                    <option value={2}>+2 Freeze Days</option>
                    <option value={3}>+3 Freeze Days</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Target Workshops
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={freezeTargetMode}
                    onChange={(e) => setFreezeTargetMode(e.target.value as any)}
                  >
                    <option value="bespoke">Bespoke Tailor Shops Only</option>
                    <option value="all">All Workshops Across Modes</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Emergency Audit Reason (Mandatory)
                </label>
                <textarea
                  className={styles.modalTextarea}
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="e.g. Severe torrential rain in Lagos causing regional power grid outages"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowEmergencyFreeze(false)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyEmergencyFreeze}
                disabled={isApplyingFreeze || !freezeReason.trim()}
                className={styles.emergencyControlBtn}
              >
                <Symbol name="verified_user" size={14} />
                <span>{isApplyingFreeze ? 'Applying Freezes…' : 'Apply Emergency Freezes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Adjust Streak & Resilience Modal ── */}
      {adjustStreakShop && (
        <div className={styles.modalBackdrop} onClick={() => setAdjustStreakShop(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Adjust Workshop Streak &amp; Resilience</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Target: <strong>{adjustStreakShop.shopName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustStreakShop(null)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGridRow}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Current Streak (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={styles.modalInput}
                    value={targetStreakVal}
                    onChange={(e) => setTargetStreakVal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    All-Time Best Streak (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={styles.modalInput}
                    value={targetBestVal}
                    onChange={(e) => setTargetBestVal(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className={styles.formGridRow}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Streak Freezes Remaining
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={styles.modalInput}
                    value={targetFreezesVal}
                    onChange={(e) => setTargetFreezesVal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Bonus XP (+/- adjustment)
                  </label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    value={targetBonusXpVal}
                    onChange={(e) => setTargetBonusXpVal(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Admin Audit Note
                </label>
                <input
                  type="text"
                  className={styles.modalInput}
                  value={streakAuditNote}
                  onChange={(e) => setStreakAuditNote(e.target.value)}
                  placeholder="e.g. Restored 7-day streak lost during network maintenance"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setAdjustStreakShop(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStreakAdjust}
                disabled={isSavingStreak}
                className={styles.primaryControlBtn}
              >
                <Symbol name="save" size={14} />
                <span>{isSavingStreak ? 'Saving…' : 'Save Adjustments'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Connect Workshops into Pod Modal ── */}
      {showPairModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPairModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Connect Workshops into Tailor Circle Pod</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Pairs two workshops so they can keep each other accountable on daily cuts and stitches
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Select First Workshop (Shop A)
                </label>
                <select
                  className={styles.modalSelect}
                  value={pairShopAId}
                  onChange={(e) => setPairShopAId(e.target.value)}
                >
                  <option value="">-- Choose Workshop A --</option>
                  {data.allShopsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.businessMode} · 🔥 {s.streakCurrent}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Select Second Workshop (Shop B)
                </label>
                <select
                  className={styles.modalSelect}
                  value={pairShopBId}
                  onChange={(e) => setPairShopBId(e.target.value)}
                >
                  <option value="">-- Choose Workshop B --</option>
                  {data.allShopsList
                    .filter((s) => s.id !== pairShopAId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.businessMode} · 🔥 {s.streakCurrent}d)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Pairing Note (Optional)
                </label>
                <input
                  type="text"
                  className={styles.modalInput}
                  value={pairNote}
                  onChange={(e) => setPairNote(e.target.value)}
                  placeholder="e.g. Connected mutual Abuja bespoke tailors pod"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePairShops}
                disabled={isPairing || !pairShopAId || !pairShopBId}
                className={styles.primaryControlBtn}
              >
                <Symbol name="group_add" size={14} />
                <span>{isPairing ? 'Connecting…' : 'Establish Circle Pod'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grant Bonus XP Modal ── */}
      {showGrantXpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowGrantXpModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Grant Bonus Craft XP</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Award bonus craft experience points directly to a workshop with an audit note
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGrantXpModal(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Target Workshop
                </label>
                <select
                  className={styles.modalSelect}
                  value={xpTargetShopId}
                  onChange={(e) => setXpTargetShopId(e.target.value)}
                >
                  <option value="">-- Choose Workshop --</option>
                  {data.allShopsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.xpPoints.toLocaleString()} XP)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  XP Amount
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {[10, 25, 50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={styles.podSmallBtn}
                      style={{
                        background: xpGrantAmount === amt ? '#4f46e5' : '#fff',
                        color: xpGrantAmount === amt ? '#fff' : '#475569',
                        fontWeight: 700,
                      }}
                      onClick={() => setXpGrantAmount(amt)}
                    >
                      +{amt} XP
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className={styles.modalInput}
                  value={xpGrantAmount}
                  onChange={(e) => setXpGrantAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Reason for XP Grant
                </label>
                <input
                  type="text"
                  className={styles.modalInput}
                  value={xpGrantReason}
                  onChange={(e) => setXpGrantReason(e.target.value)}
                  placeholder="e.g. Master Tailor workmanship bonus for flawless Aso-Ebi execution"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowGrantXpModal(false)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrantXp}
                disabled={isGrantingXp || !xpTargetShopId || xpGrantAmount === 0}
                className={styles.primaryControlBtn}
              >
                <Symbol name="stars" size={14} />
                <span>{isGrantingXp ? 'Awarding…' : 'Award Craft XP'}</span>
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
