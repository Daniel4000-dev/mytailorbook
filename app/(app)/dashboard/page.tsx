'use client';

import { useMemo, useState, type UIEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaEye,
  FaEyeSlash,
  FaTriangleExclamation,
  FaCircleCheck,
  FaScissors,
  FaClipboardList,
  FaShareFromSquare,
  FaLocationDot,
  FaWhatsapp,
  FaRulerCombined,
  FaChevronRight,
} from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Badge from '@/components/ui/Badge/Badge';
import { formatCurrency } from '@/lib/formatters';
import { getBalanceOwed, isOverdue, isDueSoon } from '@/lib/types';
import { getInitials } from '@/lib/formatters';
import type { Order } from '@/lib/types';
import DashboardSkeleton from './DashboardSkeleton';

import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders, staffMembers, isLoaded } = useData();

  const firstName = user?.name?.split(' ')[0] || '';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const topBar = (
    <TopBar
      profileMode={{
        greeting: timeGreeting,
        name: firstName,
        avatarInitials: firstName ? firstName[0] : '',
        avatarUrl: user?.avatarUrl,
      }}
    />
  );

  if (!isLoaded) {
    return (
      <PageLayout className={styles.pageGrid} header={topBar}>
        <DashboardSkeleton />
      </PageLayout>
    );
  }

  if (user?.role === 'Owner') {
    return (
      <PageLayout className={styles.pageGrid} header={topBar}>
        <OwnerDashboard orders={orders} staffMembers={staffMembers} onNavigate={router.push} />
      </PageLayout>
    );
  }

  return (
    <PageLayout className={styles.pageGrid} header={topBar}>
      <StaffDashboard orders={orders} userUid={user?.uid} onNavigate={router.push} />
    </PageLayout>
  );
}

// ============================================================
// Discover Carousel — a swipeable pointer to features that add real
// value but aren't sitting on the bottom nav (public tracking, the
// portfolio link, WhatsApp wording, the style measurement guides).
// Each card's CTA lands on the exact screen that does the thing.
// ============================================================

const DISCOVER_CARDS = [
  {
    icon: <FaShareFromSquare />,
    image: '/images/discover/portfolio.png',
    title: 'Share your portfolio',
    description: 'A public page with your best work — send the link to new customers.',
    cta: 'Set it up',
    href: '/settings/portfolio',
  },
  {
    icon: <FaLocationDot />,
    image: '/images/discover/tracking.png',
    title: 'Customers can track their own order',
    description: 'Every order gets a live photo-story link — no app for them to install.',
    cta: 'See it in action',
    href: '/production',
  },
  {
    icon: <FaWhatsapp />,
    image: '/images/discover/whatsapp.png',
    title: 'Automatic WhatsApp updates',
    description: 'Ready-to-send stage updates, worded the way your shop actually talks.',
    cta: 'Customize wording',
    href: '/settings/messages',
  },
  {
    icon: <FaRulerCombined />,
    image: '/images/discover/measurement-builder.png',
    title: 'Build your own measurement sheet',
    description: "For anything off-catalog — name the fields you measure, once, and reuse them every time.",
    cta: 'Set up a style',
    href: '/settings/styles',
  },
];

function DiscoverCarousel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardWidth = el.firstElementChild?.clientWidth || 1;
    const gap = 16;
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + gap)));
  };

  return (
    <div className={styles.discoverSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Discover</span>
      </div>
      <div className={styles.discoverScroll} onScroll={handleScroll}>
        {DISCOVER_CARDS.map((card) => (
          <button
            key={card.title}
            type="button"
            className={`${styles.discoverCard} ${card.image ? styles.discoverCardWithImage : ''}`}
            onClick={() => onNavigate(card.href)}
          >
            <div className={styles.discoverText}>
              {!card.image && <div className={styles.discoverIcon}>{card.icon}</div>}
              <span className={styles.discoverTitle}>{card.title}</span>
              <span className={styles.discoverDesc}>{card.description}</span>
              <span className={styles.discoverCta}>
                {card.cta} <FaChevronRight />
              </span>
            </div>
            {card.image && (
              <div className={styles.discoverImageWrap}>
                <img src={card.image} alt="" className={styles.discoverImage} />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className={styles.discoverDots}>
        {DISCOVER_CARDS.map((card, i) => (
          <span key={card.title} className={i === activeIndex ? styles.dotActive : styles.dot} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Owner Dashboard
// ============================================================

function OwnerDashboard({
  orders,
  staffMembers,
  onNavigate,
}: {
  orders: Order[];
  staffMembers: ReturnType<typeof useData>['staffMembers'];
  onNavigate: (href: string) => void;
}) {
  // Persisted across refresh/logout/login — a hidden balance shouldn't
  // reveal itself just because the tab reloaded or the session changed.
  const [hideCollected, setHideCollected] = useState(() => getClientCookie('mtb_hide_collected') === '1');
  const [hideProjected, setHideProjected] = useState(() => getClientCookie('mtb_hide_projected') === '1');

  const toggleHideCollected = () => {
    setHideCollected((prev) => {
      const next = !prev;
      setClientCookie('mtb_hide_collected', next ? '1' : '0');
      return next;
    });
  };
  const toggleHideProjected = () => {
    setHideProjected((prev) => {
      const next = !prev;
      setClientCookie('mtb_hide_projected', next ? '1' : '0');
      return next;
    });
  };

  const collected = useMemo(() => orders.reduce((sum, o) => sum + o.depositPaid, 0), [orders]);

  const projected = useMemo(
    () => orders.filter((o) => o.status !== 'Completed').reduce((sum, o) => sum + getBalanceOwed(o), 0),
    [orders]
  );

  const urgentCount = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'Completed') return false;
      return isOverdue(o) || o.priority === 'rush' || o.priority === 'urgent';
    }).length;
  }, [orders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return orders.filter((o) => {
      if (!o.dueDate || o.status === 'Completed') return false;
      const dueStr = new Date(o.dueDate).toISOString().split('T')[0];
      return dueStr === todayStr;
    }).length;
  }, [orders]);

  const teamSnapshot = useMemo(() => {
    return staffMembers
      .filter((s) => s.role === 'Staff')
      .map((staff) => {
        const assigned = orders.filter((o) => o.assignedTo === staff.uid);
        const active = assigned.filter((o) => o.status === 'Cutting' || o.status === 'Sewing' || o.status === 'Ready').length;
        const overdue = assigned.filter((o) => o.status !== 'Completed' && isOverdue(o)).length;
        const completed = assigned.filter((o) => o.status === 'Completed').length;
        return { staff, active, overdue, completed };
      });
  }, [orders, staffMembers]);

  // Same source as the bell/full Notifications page, so this list can
  // never drift out of sync with what's shown there — just the
  // needs-action tones (alert/warning), capped short so this section
  // can't grow into a second scrolling page on its own; "See all" covers
  // the rest via the real Notifications page instead of listing them here.
  const { notifications } = useNotifications();
  const ATTENTION_LIMIT = 4;
  const attentionItems = useMemo(
    () => notifications.filter((n) => n.tone !== 'info'),
    [notifications]
  );
  const visibleAttentionItems = attentionItems.slice(0, ATTENTION_LIMIT);
  const hasMoreAttentionItems = attentionItems.length > ATTENTION_LIMIT;

  return (
    <>
      <DiscoverCarousel onNavigate={onNavigate} />

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={`${styles.financeCard} ${styles.collectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Collected</span>
            <button
              type="button"
              onClick={toggleHideCollected}
              className={styles.cardPrivacyBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideCollected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideCollected ? '******' : formatCurrency(collected)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${styles.projectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Projected</span>
            <button
              type="button"
              onClick={toggleHideProjected}
              className={styles.cardPrivacyBtn}
              title={hideProjected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideProjected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideProjected ? '******' : formatCurrency(projected)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue</span>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Team Snapshot</span>
      </div>

      <div className={styles.teamGrid}>
        {teamSnapshot.map(({ staff, active, overdue, completed }) => (
          <button
            key={staff.uid}
            className={styles.teamCard}
            onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
            type="button"
          >
            <div className={styles.teamCardHeader}>
              {staff.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={staff.avatarUrl} alt="" className={styles.teamAvatarImage} />
              ) : (
                <div className={styles.teamAvatar}>{staff.name[0]}</div>
              )}
              <div className={styles.teamName}>{staff.name}</div>
            </div>
            <div className={styles.teamStatsRow}>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{active}</span>
                <span className={styles.teamStatLabel}>Active</span>
              </div>
              <div className={styles.teamStat}>
                <span className={`${styles.teamStatValue} ${overdue > 0 ? styles.teamStatAlert : ''}`}>{overdue}</span>
                <span className={styles.teamStatLabel}>Overdue</span>
              </div>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{completed}</span>
                <span className={styles.teamStatLabel}>Done</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Needs Attention</span>
      </div>

      {visibleAttentionItems.length === 0 ? (
        <div className={styles.emptyState}>
          <FaCircleCheck className={styles.emptyStateIcon} />
          <span>Nothing overdue or rushed — production is on track.</span>
        </div>
      ) : (
        <div className={styles.attentionList}>
          {visibleAttentionItems.map((n) => (
            <button key={n.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${n.orderId}`)} type="button">
              <div className={styles.attentionInfo}>
                <div className={`${styles.attentionAvatar} ${styles[`attentionAvatar_${n.tone}`]}`}>{n.icon}</div>
                <div className={styles.attentionTextGroup}>
                  <span className={styles.attentionCustomer}>{n.title}</span>
                  <span className={styles.attentionDetails}>{n.subtitle}</span>
                </div>
              </div>
            </button>
          ))}
          {hasMoreAttentionItems && (
            <button className={styles.attentionSeeAll} onClick={() => onNavigate('/notifications')} type="button">
              See all notifications
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================
// Staff Dashboard
// ============================================================

function StaffDashboard({
  orders,
  userUid,
  onNavigate,
}: {
  orders: Order[];
  userUid?: string;
  onNavigate: (href: string) => void;
}) {
  const myOrders = useMemo(() => orders.filter((o) => o.assignedTo === userUid), [orders, userUid]);

  const active = useMemo(
    () => myOrders.filter((o) => o.status === 'Cutting' || o.status === 'Sewing' || o.status === 'Ready').length,
    [myOrders]
  );

  const overdueCount = useMemo(() => myOrders.filter((o) => o.status !== 'Completed' && isOverdue(o)).length, [myOrders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return myOrders.filter((o) => {
      if (!o.dueDate || o.status === 'Completed') return false;
      return new Date(o.dueDate).toISOString().split('T')[0] === todayStr;
    }).length;
  }, [myOrders]);

  const completedCount = useMemo(() => myOrders.filter((o) => o.status === 'Completed').length, [myOrders]);

  const myTasks = useMemo(() => {
    return myOrders
      .filter((o) => o.status !== 'Completed')
      .sort((a, b) => {
        const aOverdue = isOverdue(a) ? 1 : 0;
        const bOverdue = isOverdue(b) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        const aRush = a.priority === 'rush' ? 1 : 0;
        const bRush = b.priority === 'rush' ? 1 : 0;
        if (aRush !== bRush) return bRush - aRush;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });
  }, [myOrders]);

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>My Workload</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={styles.financeCard}>
          <span className={styles.cardLabel}>Active Orders</span>
          <span className={styles.cardValue}>{active}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
        <div className={`${styles.financeCard} ${overdueCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue</span>
          <span className={styles.cardValue}>{overdueCount}</span>
        </div>
        <div className={styles.financeCard}>
          <span className={styles.cardLabel}>Delivered</span>
          <span className={styles.cardValue}>{completedCount}</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <FaClipboardList style={{ marginRight: 6 }} />
          My Tasks
        </span>
      </div>

      {myTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <FaClipboardList className={styles.emptyStateIcon} />
          <span>No orders assigned to you right now.</span>
        </div>
      ) : (
        <div className={styles.attentionList}>
          {myTasks.map((order) => (
            <button key={order.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${order.id}`)} type="button">
              <div className={styles.attentionInfo}>
                <div className={styles.attentionAvatar}>{getInitials(order.customerName)}</div>
                <div className={styles.attentionTextGroup}>
                  <span className={styles.attentionCustomer}>{order.customerName}</span>
                  <span className={styles.attentionDetails}>{order.orderDetails}</span>
                </div>
              </div>
              <div className={styles.attentionMeta}>
                <Badge variant={order.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'completed'}>
                  {order.status === 'Cutting' ? <FaScissors /> : order.status === 'Ready' ? <FaCircleCheck /> : null}
                  {' '}{order.status}
                </Badge>
                {isOverdue(order) && <Badge variant="default"><FaTriangleExclamation /> Overdue</Badge>}
                {!isOverdue(order) && isDueSoon(order) && <Badge variant="gold">Due Soon</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
