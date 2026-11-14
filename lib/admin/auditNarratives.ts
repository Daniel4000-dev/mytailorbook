import { AdminAuditLogEntry } from './queries';

export interface FormattedAuditAction {
  category: 'Craft Modes' | 'Subscriptions' | 'Affiliates' | 'Security' | 'General';
  label: string;
  summary: string;
  iconName: string;
  badgeStyle: 'emerald' | 'amber' | 'blue' | 'purple' | 'gray';
  targetUrl: string | null;
  shopName?: string;
  adminInitial: string;
}

function modeLabel(mode?: string): string {
  if (mode === 'bespoke') return 'Bespoke (Custom Fit)';
  if (mode === 'rtw') return 'Ready-to-Wear (RTW)';
  if (mode === 'hybrid') return 'Hybrid (Bespoke & RTW)';
  return mode || 'Standard';
}

export function formatAuditAction(entry: AdminAuditLogEntry): FormattedAuditAction {
  const diff = (entry.diff as Record<string, unknown>) || {};
  const adminInitial = entry.adminName ? entry.adminName.charAt(0).toUpperCase() : 'A';

  switch (entry.action) {
    case 'update_shop_mode': {
      const shopName = (diff.shopName as string) || 'Tailor Shop';
      const from = modeLabel(diff.fromMode as string);
      const to = modeLabel(diff.toMode as string);
      return {
        category: 'Craft Modes',
        label: 'Switched Craft Mode',
        summary: `Changed craft operating mode for "${shopName}" from ${from} to ${to}.${diff.note ? ` Note: "${diff.note}"` : ''}`,
        iconName: 'checkroom',
        badgeStyle: 'blue',
        targetUrl: entry.targetId ? `/admin/organizations/${entry.targetId}` : null,
        shopName,
        adminInitial,
      };
    }

    case 'grant_comped_subscription': {
      const shopName = (diff.shopName as string) || 'Tailor Shop';
      const plan = (diff.plan as string) || 'VIP Premium';
      const days = diff.durationDays || 30;
      return {
        category: 'Subscriptions',
        label: 'Granted VIP Subscription',
        summary: `Extended comped ${plan} access to "${shopName}" for ${days} days.${diff.reason ? ` Reason: "${diff.reason}"` : ''}`,
        iconName: 'workspace_premium',
        badgeStyle: 'emerald',
        targetUrl: entry.targetId ? `/admin/organizations/${entry.targetId}` : null,
        shopName,
        adminInitial,
      };
    }

    case 'reset_shop_password': {
      const shopName = (diff.shopName as string) || 'Tailor Shop';
      const email = (diff.ownerEmail as string) || 'shop owner';
      return {
        category: 'Security',
        label: 'Reset Password Sent',
        summary: `Generated and dispatched password recovery link to ${email} for "${shopName}".`,
        iconName: 'lock_reset',
        badgeStyle: 'purple',
        targetUrl: entry.targetId ? `/admin/organizations/${entry.targetId}` : null,
        shopName,
        adminInitial,
      };
    }

    case 'impersonate_shop': {
      return {
        category: 'Security',
        label: 'Support Impersonation',
        summary: `Admin initiated support session for tailor shop (${entry.targetId ? entry.targetId.slice(0, 8) : 'unknown'}).`,
        iconName: 'verified_user',
        badgeStyle: 'amber',
        targetUrl: entry.targetId ? `/admin/organizations/${entry.targetId}` : null,
        adminInitial,
      };
    }

    case 'affiliate.created': {
      const name = (diff.name as string) || 'New Partner';
      const code = (diff.code as string) || '';
      return {
        category: 'Affiliates',
        label: 'Partner Referral Created',
        summary: `Registered marketing partner "${name}" with referral code ref=${code}.`,
        iconName: 'handshake',
        badgeStyle: 'emerald',
        targetUrl: '/admin/affiliates',
        adminInitial,
      };
    }

    case 'affiliate.activated': {
      return {
        category: 'Affiliates',
        label: 'Partner Activated',
        summary: `Turned ON marketing attribution for partner (ID: ${entry.targetId?.slice(0, 8)}).`,
        iconName: 'toggle_on',
        badgeStyle: 'emerald',
        targetUrl: '/admin/affiliates',
        adminInitial,
      };
    }

    case 'affiliate.deactivated': {
      return {
        category: 'Affiliates',
        label: 'Partner Deactivated',
        summary: `Paused marketing attribution for partner (ID: ${entry.targetId?.slice(0, 8)}).`,
        iconName: 'toggle_on',
        badgeStyle: 'gray',
        targetUrl: '/admin/affiliates',
        adminInitial,
      };
    }

    case 'affiliate.renamed': {
      const name = (diff.name as string) || '';
      return {
        category: 'Affiliates',
        label: 'Partner Renamed',
        summary: `Updated affiliate display name to "${name}".`,
        iconName: 'edit',
        badgeStyle: 'blue',
        targetUrl: '/admin/affiliates',
        adminInitial,
      };
    }

    default: {
      const readableAction = entry.action.replace(/_/g, ' ').replace(/\./g, ' › ');
      const entries = Object.entries(diff);
      const summary =
        entries.length > 0
          ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')
          : `Mutating action on ${entry.targetType || 'system'}${entry.targetId ? ` (${entry.targetId.slice(0, 8)})` : ''}`;

      return {
        category: 'General',
        label: readableAction,
        summary,
        iconName: 'history',
        badgeStyle: 'gray',
        targetUrl: entry.targetType === 'organization' && entry.targetId ? `/admin/organizations/${entry.targetId}` : null,
        adminInitial,
      };
    }
  }
}

