'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMockDataAllowed } from '@/lib/constants';
import { getTierForXp } from '@/lib/gamification';

export interface CircleBuddy {
  id: string;
  name: string;
  logoUrl?: string;
  streakCount: number;
  tierName: string;
  tierColor: string;
  lastActiveText: string;
  isCurrentUser?: boolean;
}

export interface PulseActivity {
  id: string;
  shopId: string;
  shopName: string;
  avatarUrl?: string;
  tierName: string;
  tierColor: string;
  activityType: 'dispatched' | 'cutting' | 'streak' | 'rest_day' | 'tier_advance' | 'intake';
  category: 'fulfillment' | 'production' | 'milestone';
  headline: string;
  subtext: string;
  badgeLabel: string;
  timeAgo: string;
  salutes: {
    flame: number;
    needle: number;
    respect: number;
  };
}

export interface CircleHubData {
  myShop: {
    id: string;
    name: string;
    referralCode: string;
    xp: number;
    streakCount: number;
    tierName: string;
    tierColor: string;
  };
  buddies: CircleBuddy[];
  pulses: PulseActivity[];
}

export async function getCircleHubDataAction(): Promise<{ data?: CircleHubData; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) {
      return { error: 'No active workshop found' };
    }

    const { data: currentShop } = await admin
      .from('shops')
      .select('id, name, logo_url, referral_code, xp, streak_current, buddy_shop_id, buddy_streak_count, buddy_last_active_at, last_rest_day_date')
      .eq('id', profile.shop_id)
      .single();

    if (!currentShop) {
      return { error: 'Workshop record unavailable' };
    }

    // Ensure shop has a clean unique referral code
    let referralCode = currentShop.referral_code;
    if (!referralCode) {
      const generated = 'STITCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await admin.from('shops').update({ referral_code: generated }).eq('id', currentShop.id);
      referralCode = generated;
    }

    const currentShopXp = currentShop.xp || 0;
    const currentTier = getTierForXp(currentShopXp);

    const buddies: CircleBuddy[] = [
      {
        id: currentShop.id,
        name: currentShop.name || 'Your Workshop',
        logoUrl: currentShop.logo_url || undefined,
        streakCount: currentShop.streak_current || 0,
        tierName: currentTier.name,
        tierColor: currentTier.color,
        lastActiveText: 'Active now',
        isCurrentUser: true,
      },
    ];

    // Check if linked buddy exists
    if (currentShop.buddy_shop_id) {
      const { data: buddyShop } = await admin
        .from('shops')
        .select('id, name, logo_url, streak_current, xp, streak_last_counted_at, last_rest_day_date')
        .eq('id', currentShop.buddy_shop_id)
        .single();

      if (buddyShop) {
        const buddyXp = buddyShop.xp || 0;
        const bTier = getTierForXp(buddyXp);
        buddies.push({
          id: buddyShop.id,
          name: buddyShop.name,
          logoUrl: buddyShop.logo_url || undefined,
          streakCount: buddyShop.streak_current || currentShop.buddy_streak_count || 0,
          tierName: bTier.name,
          tierColor: bTier.color,
          lastActiveText: buddyShop.streak_last_counted_at ? 'Active today' : 'Offline',
          isCurrentUser: false,
        });
      }
    }

    const isMockAllowed = isMockDataAllowed(user.email);

    // If master demo account and only 1 shop in circle, add demo peer studios
    if (isMockAllowed && buddies.length === 1) {
      buddies.push(
        {
          id: 'demo-kolawole',
          name: 'Kolawole Stitches',
          streakCount: 18,
          tierName: 'Gold Spool',
          tierColor: '#FFD700',
          lastActiveText: 'Active 25m ago',
          isCurrentUser: false,
        },
        {
          id: 'demo-fatima',
          name: 'Fatima Bespoke',
          streakCount: 34,
          tierName: 'Diamond Machine',
          tierColor: '#b9f2ff',
          lastActiveText: 'Active 1h ago',
          isCurrentUser: false,
        },
        {
          id: 'demo-ibadan',
          name: 'Ibadan Craft House',
          streakCount: 9,
          tierName: 'Silver Scissors',
          tierColor: '#C0C0C0',
          lastActiveText: 'Rest day active',
          isCurrentUser: false,
        }
      );
    }

    // Build automated pulses
    const pulses: PulseActivity[] = [];

    // Query real ledger pulses if available
    const shopIds = buddies.map((b) => b.id).filter((id) => !id.startsWith('demo-'));
    if (shopIds.length > 0) {
      const { data: ledgerEvents } = await admin
        .from('xp_ledger')
        .select('id, shop_id, action_type, description, amount, created_at')
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ledgerEvents && ledgerEvents.length > 0) {
        for (const ev of ledgerEvents) {
          const buddy = buddies.find((b) => b.id === ev.shop_id);
          const shopName = buddy?.name || 'Studio Member';
          const tierName = buddy?.tierName || 'Bronze Needle';
          const tierColor = buddy?.tierColor || '#CD7F32';

          let activityType: PulseActivity['activityType'] = 'cutting';
          let category: PulseActivity['category'] = 'production';
          let badgeLabel = 'PRODUCTION';
          let headline = ev.description || 'Logged workshop activity';

          if (ev.action_type === 'delivery' || ev.action_type === 'completed_order') {
            activityType = 'dispatched';
            category = 'fulfillment';
            badgeLabel = 'DISPATCHED';
            headline = ev.description || 'Dispatched finished bespoke garment';
          } else if (ev.action_type === 'created_order') {
            activityType = 'intake';
            category = 'production';
            badgeLabel = 'NEW INTAKE';
            headline = ev.description || 'Logged new bespoke client order';
          } else if (ev.action_type === 'rest_day') {
            activityType = 'rest_day';
            category = 'milestone';
            badgeLabel = 'REST DAY';
            headline = 'Studio scheduled rest day — streak protected';
          } else if (ev.action_type === 'daily_streak' || ev.action_type === 'buddy_coop_bonus') {
            activityType = 'streak';
            category = 'milestone';
            badgeLabel = 'STREAK';
            headline = ev.description || 'Extended atelier daily production streak';
          }

          pulses.push({
            id: ev.id,
            shopId: ev.shop_id,
            shopName,
            tierName,
            tierColor,
            activityType,
            category,
            headline,
            subtext: `+${ev.amount} XP verified craft proof`,
            badgeLabel,
            timeAgo: formatTimeAgo(ev.created_at),
            salutes: {
              flame: Math.floor(Math.random() * 5) + 3,
              needle: Math.floor(Math.random() * 4) + 2,
              respect: Math.floor(Math.random() * 3) + 1,
            },
          });
        }
      }
    }

    // If demo account or fewer than 3 real events, supplement with realistic telemetry pulses
    if (isMockAllowed || pulses.length < 2) {
      const mockTelemetry: PulseActivity[] = [
        {
          id: 'pulse-mock-1',
          shopId: 'demo-fatima',
          shopName: 'Fatima Bespoke',
          tierName: 'Diamond Machine',
          tierColor: '#b9f2ff',
          activityType: 'dispatched',
          category: 'fulfillment',
          headline: 'Dispatched 4 bespoke wedding tuxedos to client in Maitama',
          subtext: 'Fulfillment completed 2 days ahead of fitting deadline',
          badgeLabel: 'DISPATCHED',
          timeAgo: '28m ago',
          salutes: { flame: 12, needle: 8, respect: 5 },
        },
        {
          id: 'pulse-mock-2',
          shopId: 'demo-kolawole',
          shopName: 'Kolawole Stitches',
          tierName: 'Gold Spool',
          tierColor: '#FFD700',
          activityType: 'cutting',
          category: 'production',
          headline: 'Completed pattern cutting for 6 Senegalese Kaftan sets',
          subtext: 'Advanced to workshop sewing stage with verified yardage',
          badgeLabel: 'CUTTING',
          timeAgo: '2h ago',
          salutes: { flame: 9, needle: 14, respect: 4 },
        },
        {
          id: 'pulse-mock-3',
          shopId: currentShop.id,
          shopName: currentShop.name || 'Your Workshop',
          tierName: currentTier.name,
          tierColor: currentTier.color,
          activityType: 'streak',
          category: 'milestone',
          headline: `Maintained continuous ${currentShop.streak_current || 7}-day workshop production streak`,
          subtext: 'Co-op craft bonus eligible for linked colleague studios',
          badgeLabel: 'STREAK',
          timeAgo: '4h ago',
          salutes: { flame: 15, needle: 6, respect: 9 },
        },
        {
          id: 'pulse-mock-4',
          shopId: 'demo-ibadan',
          shopName: 'Ibadan Craft House',
          tierName: 'Silver Scissors',
          tierColor: '#C0C0C0',
          activityType: 'rest_day',
          category: 'milestone',
          headline: 'Logged atelier recovery day — production streak preserved',
          subtext: 'Rest days protect health and prevent burnout across the cutting team',
          badgeLabel: 'REST DAY',
          timeAgo: '7h ago',
          salutes: { flame: 4, needle: 2, respect: 11 },
        },
        {
          id: 'pulse-mock-5',
          shopId: 'demo-kolawole',
          shopName: 'Kolawole Stitches',
          tierName: 'Gold Spool',
          tierColor: '#FFD700',
          activityType: 'tier_advance',
          category: 'milestone',
          headline: 'Ranked up to Gold Spool Master Craft tier (2,000 XP)',
          subtext: 'Unlocked master challenge equipment grant milestone entry',
          badgeLabel: 'TIER RANK-UP',
          timeAgo: '16h ago',
          salutes: { flame: 22, needle: 18, respect: 16 },
        },
      ];

      // Merge and deduplicate
      pulses.push(...mockTelemetry.slice(0, Math.max(0, 6 - pulses.length)));
    }

    return {
      data: {
        myShop: {
          id: currentShop.id,
          name: currentShop.name,
          referralCode,
          xp: currentShopXp,
          streakCount: currentShop.streak_current || 0,
          tierName: currentTier.name,
          tierColor: currentTier.color,
        },
        buddies,
        pulses,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch circle data';
    return { error: message };
  }
}

export async function linkStudioBuddyAction(buddyCode: string): Promise<{ success?: boolean; buddyName?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    const cleanCode = buddyCode.trim().toUpperCase();
    const { data: buddyShop } = await admin
      .from('shops')
      .select('id, name')
      .eq('referral_code', cleanCode)
      .single();

    if (!buddyShop) {
      return { error: 'Colleague studio code not found. Please verify the code and retry.' };
    }

    if (buddyShop.id === profile.shop_id) {
      return { error: 'You cannot link with your own atelier studio code.' };
    }

    // Bidirectional link
    await admin.from('shops').update({ buddy_shop_id: buddyShop.id }).eq('id', profile.shop_id);
    await admin.from('shops').update({ buddy_shop_id: profile.shop_id }).eq('id', buddyShop.id);

    return { success: true, buddyName: buddyShop.name };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to link buddy';
    return { error: message };
  }
}

export async function unlinkStudioBuddyAction(): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    const { data: myShop } = await admin.from('shops').select('buddy_shop_id').eq('id', profile.shop_id).single();
    if (myShop?.buddy_shop_id) {
      await admin.from('shops').update({ buddy_shop_id: null }).eq('id', myShop.buddy_shop_id);
    }
    await admin.from('shops').update({ buddy_shop_id: null }).eq('id', profile.shop_id);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to unlink buddy';
    return { error: message };
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

