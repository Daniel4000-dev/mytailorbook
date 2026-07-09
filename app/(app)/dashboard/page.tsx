'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaBars,
  FaEye,
  FaEyeSlash,
  FaUserGroup,
  FaTriangleExclamation,
  FaFireFlameCurved,
  FaCircleCheck,
  FaScissors,
  FaClipboardList,
  FaGift,
  FaClock,
  FaMoneyBillWave,
} from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Badge from '@/components/ui/Badge/Badge';
import { formatCurrency, getDaysUntilAnnualDate, getDaysSince } from '@/lib/formatters';
import { getBalanceOwed, isOverdue, isDueSoon } from '@/lib/types';
import type { Order, Customer } from '@/lib/types';
import DashboardSkeleton from './DashboardSkeleton';

import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders, customers, staffMembers, isLoaded } = useData();
  const { toggleMenu } = useSidebar();

  const firstName = user?.name?.split(' ')[0] || 'there';

  const topBar = (
    <TopBar
      profileMode={{
        greeting: 'Overview',
        name: firstName,
        avatarInitials: firstName[0],
      }}
      leftAction={
        <div className={styles.mobileOnly}>
          <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
        </div>
      }
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
        <OwnerDashboard orders={orders} customers={customers} staffMembers={staffMembers} onNavigate={router.push} />
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
// Owner Dashboard
// ============================================================

function OwnerDashboard({
  orders,
  customers,
  staffMembers,
  onNavigate,
}: {
  orders: Order[];
  customers: Customer[];
  staffMembers: ReturnType<typeof useData>['staffMembers'];
  onNavigate: (href: string) => void;
}) {
  const [hideCollected, setHideCollected] = useState(false);
  const [hideProjected, setHideProjected] = useState(false);

  const collected = useMemo(() => orders.reduce((sum, o) => sum + o.depositPaid, 0), [orders]);

  const profitData = useMemo(() => {
    const ordersWithCost = orders.filter((o) => o.materialCost !== undefined);
    const profit = ordersWithCost.reduce((sum, o) => sum + (o.totalBill - (o.materialCost || 0)), 0);
    return { profit, coveredCount: ordersWithCost.length, totalCount: orders.length };
  }, [orders]);

  const projected = useMemo(
    () => orders.filter((o) => o.status !== 'Completed').reduce((sum, o) => sum + getBalanceOwed(o), 0),
    [orders]
  );

  const urgentCount = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'Completed' || o.status === 'Documented') return false;
      return isOverdue(o) || o.priority === 'rush' || o.priority === 'urgent';
    }).length;
  }, [orders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return orders.filter((o) => {
      if (!o.dueDate || o.status === 'Completed' || o.status === 'Documented') return false;
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

  const needsAttentionOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'Completed' && o.status !== 'Documented' && (isOverdue(o) || o.priority === 'rush'))
      .sort((a, b) => {
        const aOverdue = isOverdue(a) ? 1 : 0;
        const bOverdue = isOverdue(b) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      })
      .slice(0, 5);
  }, [orders]);

  // Relationship nudges — surfaced here so an owner sees "who needs a
  // WhatsApp message" without opening every customer profile individually.
  const lastOrderByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      const existing = map.get(o.customerId);
      if (!existing || new Date(o.createdAt).getTime() > new Date(existing).getTime()) {
        map.set(o.customerId, o.createdAt);
      }
    }
    return map;
  }, [orders]);

  const birthdayNudges = useMemo(() => {
    return customers
      .map((c) => ({ customer: c, daysUntil: c.dateOfBirth ? getDaysUntilAnnualDate(c.dateOfBirth) : null }))
      .filter((x): x is { customer: Customer; daysUntil: number } => x.daysUntil !== null && x.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [customers]);

  const staleNudges = useMemo(() => {
    return customers
      .map((c) => {
        const lastOrderAt = lastOrderByCustomer.get(c.id);
        const daysSince = lastOrderAt ? getDaysSince(lastOrderAt) : getDaysSince(c.createdAt);
        const threshold = lastOrderAt ? 90 : 30;
        return { customer: c, daysSince, isStale: daysSince >= threshold };
      })
      .filter((x) => x.isStale)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 3);
  }, [customers, lastOrderByCustomer]);

  // Completed orders that still owe money — the job's done, so this is
  // exactly the kind of thing that quietly falls through the cracks
  // without a daily reminder.
  const unpaidCompletedOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'Completed' && getBalanceOwed(o) > 0)
      .sort((a, b) => getBalanceOwed(b) - getBalanceOwed(a))
      .slice(0, 5);
  }, [orders]);

  const hasAnyAttention =
    needsAttentionOrders.length > 0 || birthdayNudges.length > 0 || staleNudges.length > 0 || unpaidCompletedOrders.length > 0;

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={styles.financeCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Total Collected</span>
            <button
              type="button"
              onClick={() => setHideCollected(!hideCollected)}
              className={styles.cardPrivacyBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideCollected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={`${styles.cardValue} ${hideCollected ? styles.blurredValue : ''}`}>
            {formatCurrency(collected)}
          </span>
        </div>

        <div className={styles.financeCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Projected Earnings</span>
            <button
              type="button"
              onClick={() => setHideProjected(!hideProjected)}
              className={styles.cardPrivacyBtn}
              title={hideProjected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideProjected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={`${styles.cardValue} ${hideProjected ? styles.blurredValue : ''}`}>
            {formatCurrency(projected)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue & Urgent</span>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      {profitData.coveredCount > 0 && (
        <div className={styles.profitBanner}>
          <span className={styles.profitLabel}>Est. Profit (revenue minus material cost)</span>
          <span className={styles.profitValue}>{formatCurrency(profitData.profit)}</span>
          {profitData.coveredCount < profitData.totalCount && (
            <span className={styles.profitCoverage}>
              Based on {profitData.coveredCount} of {profitData.totalCount} orders with cost recorded
            </span>
          )}
        </div>
      )}

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <FaUserGroup style={{ marginRight: 6 }} />
          Team Snapshot
        </span>
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
              <div className={styles.teamAvatar}>{staff.name[0]}</div>
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
        <span className={styles.sectionTitle}>
          <FaTriangleExclamation style={{ marginRight: 6 }} />
          Needs Attention
        </span>
      </div>

      {!hasAnyAttention ? (
        <div className={styles.emptyState}>Nothing overdue, rushed, or waiting on a customer nudge — you&apos;re all caught up.</div>
      ) : (
        <div className={styles.attentionList}>
          {needsAttentionOrders.map((order) => (
            <button key={order.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${order.id}`)} type="button">
              <div className={styles.attentionInfo}>
                <span className={styles.attentionCustomer}>{order.customerName}</span>
                <span className={styles.attentionDetails}>{order.orderDetails}</span>
              </div>
              <div className={styles.attentionMeta}>
                {isOverdue(order) && <Badge variant="default"><FaTriangleExclamation /> Overdue</Badge>}
                {order.priority === 'rush' && <Badge variant="gold"><FaFireFlameCurved /> Rush</Badge>}
                {order.assignedToName && <span className={styles.attentionAssignee}>{order.assignedToName}</span>}
              </div>
            </button>
          ))}

          {birthdayNudges.map(({ customer, daysUntil }) => (
            <button
              key={`birthday-${customer.id}`}
              className={styles.attentionRow}
              onClick={() => onNavigate(`/customers/${customer.id}`)}
              type="button"
            >
              <div className={styles.attentionInfo}>
                <span className={styles.attentionCustomer}>{customer.fullName}</span>
                <span className={styles.attentionDetails}>
                  {daysUntil === 0 ? "Birthday today!" : `Birthday in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className={styles.attentionMeta}>
                <Badge variant="gold"><FaGift /> Birthday</Badge>
              </div>
            </button>
          ))}

          {staleNudges.map(({ customer, daysSince }) => (
            <button
              key={`stale-${customer.id}`}
              className={styles.attentionRow}
              onClick={() => onNavigate(`/customers/${customer.id}`)}
              type="button"
            >
              <div className={styles.attentionInfo}>
                <span className={styles.attentionCustomer}>{customer.fullName}</span>
                <span className={styles.attentionDetails}>Hasn&apos;t ordered in {daysSince} days</span>
              </div>
              <div className={styles.attentionMeta}>
                <Badge variant="default"><FaClock /> Re-engage</Badge>
              </div>
            </button>
          ))}

          {unpaidCompletedOrders.map((order) => (
            <button
              key={`unpaid-${order.id}`}
              className={styles.attentionRow}
              onClick={() => onNavigate(`/production?order=${order.id}`)}
              type="button"
            >
              <div className={styles.attentionInfo}>
                <span className={styles.attentionCustomer}>{order.customerName}</span>
                <span className={styles.attentionDetails}>Completed, still owes {formatCurrency(getBalanceOwed(order))}</span>
              </div>
              <div className={styles.attentionMeta}>
                <Badge variant="gold"><FaMoneyBillWave /> Collect Payment</Badge>
              </div>
            </button>
          ))}
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
          <span className={styles.cardLabel}>Completed</span>
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
        <div className={styles.emptyState}>No orders assigned to you right now.</div>
      ) : (
        <div className={styles.attentionList}>
          {myTasks.map((order) => (
            <button key={order.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${order.id}`)} type="button">
              <div className={styles.attentionInfo}>
                <span className={styles.attentionCustomer}>{order.customerName}</span>
                <span className={styles.attentionDetails}>{order.orderDetails}</span>
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
