import { useMemo, useState } from 'react';

import { useNotifications } from '@/lib/hooks/useNotifications';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import { getBalanceOwed, isOverdue } from '@/lib/types';
import type { Order } from '@/lib/types';
import type { useData } from '@/contexts/DataContext';

const ATTENTION_LIMIT = 4;

// Shared between the mobile and desktop Owner dashboards — same figures,
// same "Needs Attention" feed, two different layouts around them.
export function useOwnerDashboardData(orders: Order[], staffMembers: ReturnType<typeof useData>['staffMembers']) {
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
  const attentionItems = useMemo(
    () => notifications.filter((n) => n.tone !== 'info'),
    [notifications]
  );
  const visibleAttentionItems = attentionItems.slice(0, ATTENTION_LIMIT);
  const hasMoreAttentionItems = attentionItems.length > ATTENTION_LIMIT;

  return {
    hideCollected,
    hideProjected,
    toggleHideCollected,
    toggleHideProjected,
    collected,
    projected,
    urgentCount,
    dueTodayCount,
    teamSnapshot,
    visibleAttentionItems,
    hasMoreAttentionItems,
  };
}
