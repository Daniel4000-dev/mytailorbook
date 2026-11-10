'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMockDataAllowed } from '@/lib/constants';
import { getTierForXp } from '@/lib/gamification';
import { createAtelierNotification } from '@/lib/notifications';

export interface CircleBuddy {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  phone?: string;
  city?: string;
  address?: string;
  specialties?: string[];
  streakCount: number;
  tierName: string;
  tierColor: string;
  lastActiveText: string;
  lastActiveAt?: string;
  status: 'active' | 'sabbatical' | 'dormant';
  sabbaticalReason?: string;
  sabbaticalStartedAt?: string;
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

export interface CircleBenefitsTier {
  tierNumber: 1 | 2 | 3;
  tierName: string;
  activeMemberCount: number;
  totalMemberCount: number;
  maxRecommended: number;
  dailyXpRate: number;
  multiplierLabel: string;
  isDormantWarning?: boolean;
  dormantCount: number;
  sabbaticalCount: number;
}

export interface CircleHubData {
  myShop: {
    id: string;
    name: string;
    slug?: string;
    referralCode: string;
    xp: number;
    streakCount: number;
    tierName: string;
    tierColor: string;
    status: 'active' | 'sabbatical';
  };
  benefits: CircleBenefitsTier;
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
      .select('id, name, slug, phone, address, logo_url, referral_code, xp, streak_current, buddy_shop_id, buddy_streak_count, buddy_last_active_at, last_rest_day_date, custom_styles, vacation_mode')
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

    const specialties = Array.isArray(currentShop.custom_styles)
      ? currentShop.custom_styles.map((s: any) => s.name).slice(0, 3)
      : ['Bespoke Tailoring', 'Senator', 'Kaftan'];

    const buddies: CircleBuddy[] = [
      {
        id: currentShop.id,
        name: currentShop.name || 'Your Workshop',
        slug: currentShop.slug || undefined,
        logoUrl: currentShop.logo_url || undefined,
        phone: currentShop.phone || undefined,
        address: currentShop.address || undefined,
        specialties,
        streakCount: currentShop.streak_current || 0,
        tierName: currentTier.name,
        tierColor: currentTier.color,
        lastActiveText: 'Active now',
        status: currentShop.vacation_mode ? 'sabbatical' : 'active',
        isCurrentUser: true,
      },
    ];

    // 1. Fetch connected circle members (checking circle_members table first)
    const linkedShopIds: { buddyId: string; status: 'active' | 'sabbatical' | 'dormant'; reason?: string; startedAt?: string }[] = [];

    try {
      const { data: circleRows, error: circleErr } = await admin
        .from('circle_members')
        .select('buddy_shop_id, status, sabbatical_reason, sabbatical_started_at')
        .eq('shop_id', currentShop.id);

      if (!circleErr && circleRows && circleRows.length > 0) {
        circleRows.forEach((r) => {
          linkedShopIds.push({
            buddyId: r.buddy_shop_id,
            status: (r.status as any) || 'active',
            reason: r.sabbatical_reason || undefined,
            startedAt: r.sabbatical_started_at || undefined,
          });
        });
      }
    } catch {
      // circle_members table may not exist yet in local/isolated DBs, gracefully ignore
    }

    // Fallback: If circle_members was empty, check legacy buddy_shop_id on shops table
    if (linkedShopIds.length === 0 && currentShop.buddy_shop_id) {
      linkedShopIds.push({
        buddyId: currentShop.buddy_shop_id,
        status: 'active',
      });
    }

    // 2. Fetch full shop records for all linked buddies
    if (linkedShopIds.length > 0) {
      const buddyUids = linkedShopIds.map((l) => l.buddyId);
      const { data: buddyShops } = await admin
        .from('shops')
        .select('id, name, slug, phone, address, logo_url, streak_current, xp, streak_last_counted_at, last_rest_day_date, custom_styles, vacation_mode')
        .in('id', buddyUids);

      if (buddyShops) {
        const now = new Date();
        buddyShops.forEach((bShop) => {
          const linkMeta = linkedShopIds.find((l) => l.buddyId === bShop.id);
          const buddyXp = bShop.xp || 0;
          const bTier = getTierForXp(buddyXp);

          // Compute dormancy (if not active in > 5 days and not on sabbatical)
          let status: 'active' | 'sabbatical' | 'dormant' = linkMeta?.status || 'active';
          if (bShop.vacation_mode || linkMeta?.status === 'sabbatical') {
            status = 'sabbatical';
          } else if (bShop.streak_last_counted_at) {
            const lastActive = new Date(bShop.streak_last_counted_at);
            const daysSince = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince >= 5) {
              status = 'dormant';
            }
          }

          const bSpecialties = Array.isArray(bShop.custom_styles)
            ? bShop.custom_styles.map((s: any) => s.name).slice(0, 3)
            : ['Bespoke Cut', 'Kaftan', 'Agbada'];

          buddies.push({
            id: bShop.id,
            name: bShop.name,
            slug: bShop.slug || undefined,
            logoUrl: bShop.logo_url || undefined,
            phone: bShop.phone || undefined,
            address: bShop.address || undefined,
            specialties: bSpecialties,
            streakCount: bShop.streak_current || currentShop.buddy_streak_count || 0,
            tierName: bTier.name,
            tierColor: bTier.color,
            lastActiveText: status === 'sabbatical' ? 'On sabbatical' : bShop.streak_last_counted_at ? 'Active today' : 'Offline',
            lastActiveAt: bShop.streak_last_counted_at || undefined,
            status,
            sabbaticalReason: linkMeta?.reason,
            sabbaticalStartedAt: linkMeta?.startedAt,
            isCurrentUser: false,
          });
        });
      }
    }

    const isMockAllowed = isMockDataAllowed(user.email);

    // If master demo account and only 1 shop in circle, add rich demo peer studios
    if (isMockAllowed && buddies.length === 1) {
      buddies.push(
        {
          id: 'demo-kolawole',
          name: 'Kolawole Stitches',
          slug: 'kolawole-stitches',
          phone: '08023456789',
          city: 'Yaba, Lagos',
          address: 'Commercial Avenue, Yaba',
          specialties: ['Agbada Embroidery', 'Grand Senator', 'Two-Piece Kaftan'],
          streakCount: 18,
          tierName: 'Gold Spool',
          tierColor: '#FFD700',
          lastActiveText: 'Active 25m ago',
          status: 'active',
          isCurrentUser: false,
        },
        {
          id: 'demo-fatima',
          name: 'Fatima Bespoke',
          slug: 'fatima-bespoke',
          phone: '08098765432',
          city: 'Maitama, Abuja',
          address: 'Gana Street, Maitama',
          specialties: ['Bridal Corsetry', 'Luxury Silk Robes', 'Dinner Gowns'],
          streakCount: 34,
          tierName: 'Diamond Machine',
          tierColor: '#b9f2ff',
          lastActiveText: 'Active 1h ago',
          status: 'active',
          isCurrentUser: false,
        },
        {
          id: 'demo-ibadan',
          name: 'Ibadan Craft House',
          slug: 'ibadan-craft-house',
          phone: '08112233445',
          city: 'Bodija, Ibadan',
          address: 'Favos Junction, Bodija',
          specialties: ['Traditional Aso-Oke', 'Senator Cut'],
          streakCount: 9,
          tierName: 'Silver Scissors',
          tierColor: '#C0C0C0',
          lastActiveText: 'Sabbatical (Village travel)',
          status: 'sabbatical',
          sabbaticalReason: 'Attending family wedding in Osun',
          sabbaticalStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          isCurrentUser: false,
        }
      );
    }

    // 3. Compute Circle Benefits Tier
    const activeCount = buddies.filter((b) => b.status === 'active').length;
    const dormantCount = buddies.filter((b) => b.status === 'dormant').length;
    const sabbaticalCount = buddies.filter((b) => b.status === 'sabbatical').length;

    let tierNumber: 1 | 2 | 3 = 1;
    let tierName = 'Master Pod';
    let dailyXpRate = 15;
    let multiplierLabel = '100% Full Power';
    let maxRecommended = 4;

    if (activeCount <= 4) {
      tierNumber = 1;
      tierName = 'Master Pod';
      dailyXpRate = 15;
      multiplierLabel = '100% Full Power';
      maxRecommended = 4;
    } else if (activeCount <= 8) {
      tierNumber = 2;
      tierName = 'Craft Cluster';
      dailyXpRate = 5;
      multiplierLabel = '50% Diminishing Power';
      maxRecommended = 8;
    } else {
      tierNumber = 3;
      tierName = 'Public Directory';
      dailyXpRate = 0;
      multiplierLabel = '0% (Noticeboard Only)';
      maxRecommended = 8;
    }

    const benefits: CircleBenefitsTier = {
      tierNumber,
      tierName,
      activeMemberCount: activeCount,
      totalMemberCount: buddies.length,
      maxRecommended,
      dailyXpRate,
      multiplierLabel,
      isDormantWarning: dormantCount > 0,
      dormantCount,
      sabbaticalCount,
    };

    // 4. Build Pulses stream
    const pulses: PulseActivity[] = [];
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
          const tierNameStr = buddy?.tierName || 'Bronze Needle';
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
            headline = ev.description || 'Extended daily work streak';
          }

          pulses.push({
            id: ev.id,
            shopId: ev.shop_id,
            shopName,
            tierName: tierNameStr,
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

    if (isMockAllowed && pulses.length < 2) {
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
          headline: 'Logged sabbatical leave — group streak protected',
          subtext: 'Scheduled workshop leave prevents burnout and preserves pod benefits',
          badgeLabel: 'SABBATICAL',
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

      pulses.push(...mockTelemetry.slice(0, Math.max(0, 6 - pulses.length)));
    }

    return {
      data: {
        myShop: {
          id: currentShop.id,
          name: currentShop.name,
          slug: currentShop.slug || undefined,
          referralCode,
          xp: currentShopXp,
          streakCount: currentShop.streak_current || 0,
          tierName: currentTier.name,
          tierColor: currentTier.color,
          status: currentShop.vacation_mode ? 'sabbatical' : 'active',
        },
        benefits,
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
      return { error: 'Tailor invite code not found. Please verify the code and try again.' };
    }

    if (buddyShop.id === profile.shop_id) {
      return { error: 'You cannot connect with your own workshop code.' };
    }

    // Insert into circle_members table (bidirectional link)
    try {
      await admin.from('circle_members').upsert([
        { shop_id: profile.shop_id, buddy_shop_id: buddyShop.id, status: 'active' },
        { shop_id: buddyShop.id, buddy_shop_id: profile.shop_id, status: 'active' },
      ], { onConflict: 'shop_id, buddy_shop_id' });
    } catch {
      // If table not migrated yet, continue to legacy shops update
    }

    // Mirror to shops.buddy_shop_id for backward compatibility
    await admin.from('shops').update({ buddy_shop_id: buddyShop.id }).eq('id', profile.shop_id);
    await admin.from('shops').update({ buddy_shop_id: profile.shop_id }).eq('id', buddyShop.id);

    return { success: true, buddyName: buddyShop.name };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to link buddy';
    return { error: message };
  }
}

export async function unlinkStudioBuddyAction(buddyShopId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    try {
      await admin
        .from('circle_members')
        .delete()
        .or(`and(shop_id.eq.${profile.shop_id},buddy_shop_id.eq.${buddyShopId}),and(shop_id.eq.${buddyShopId},buddy_shop_id.eq.${profile.shop_id})`);
    } catch {
      // Fallback
    }

    // If legacy shops.buddy_shop_id matches, clear it
    const { data: myShop } = await admin.from('shops').select('buddy_shop_id').eq('id', profile.shop_id).single();
    if (myShop?.buddy_shop_id === buddyShopId) {
      await admin.from('shops').update({ buddy_shop_id: null }).eq('id', profile.shop_id);
      await admin.from('shops').update({ buddy_shop_id: null }).eq('id', buddyShopId);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to unlink buddy';
    return { error: message };
  }
}

export async function toggleSabbaticalAction(
  buddyShopId: string,
  isSabbatical: boolean,
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    const nextStatus = isSabbatical ? 'sabbatical' : 'active';
    const startedAt = isSabbatical ? new Date().toISOString() : null;

    // If updating my own shop sabbatical
    if (buddyShopId === profile.shop_id) {
      await admin.from('shops').update({ vacation_mode: isSabbatical }).eq('id', profile.shop_id);
    }

    try {
      await admin.from('circle_members').update({
        status: nextStatus,
        sabbatical_reason: isSabbatical ? reason || 'Workshop Leave' : null,
        sabbatical_started_at: startedAt,
      }).match({ shop_id: profile.shop_id, buddy_shop_id: buddyShopId });

      await admin.from('circle_members').update({
        status: nextStatus,
        sabbatical_reason: isSabbatical ? reason || 'Workshop Leave' : null,
        sabbatical_started_at: startedAt,
      }).match({ shop_id: buddyShopId, buddy_shop_id: profile.shop_id });
    } catch {
      // Table fallback
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update sabbatical status';
    return { error: message };
  }
}

export async function sendSewingNudgeAction(buddyShopId: string): Promise<{ success?: boolean; whatsappMessage?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    const { data: myShop } = await admin.from('shops').select('name').eq('id', profile.shop_id).single();
    const { data: buddyShop } = await admin.from('shops').select('name, phone').eq('id', buddyShopId).single();

    const senderName = myShop?.name || 'Your Colleague Tailor';
    const recipientName = buddyShop?.name || 'Colleague';

    // Dispatch in-app push & notification
    await createAtelierNotification({
      shopId: buddyShopId,
      recipientId: null,
      category: 'system',
      tone: 'info',
      badgeIcon: 'local_fire_department',
      title: 'Morning Sewing Nudge!',
      subtitle: `${senderName} is already on the cutting table! Let's get today's orders moving.`,
      actionLabel: 'Open Workshop',
      actionHref: '/production',
    });

    const whatsappMessage = `Good day ${recipientName}! ${senderName} here. I am already at the workshop cutting table working on orders. Let's keep our Tailor Circle streak going today!`;

    return { success: true, whatsappMessage };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send sewing nudge';
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
