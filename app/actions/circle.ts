'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTierForXp } from '@/lib/gamification';
import { isXpSystemEnabled } from '@/lib/xp';
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

export interface CircleRequest {
  id: string;
  senderShopId: string;
  senderShopName: string;
  senderShopSlug?: string;
  senderLogoUrl?: string;
  senderAddress?: string;
  senderTierName: string;
  senderTierColor: string;
  senderStreakCount: number;
  receiverShopId: string;
  receiverShopName: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
}

export interface SearchedColleague {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  phone?: string;
  city?: string;
  address?: string;
  tierName: string;
  tierColor: string;
  streakCount: number;
  connectionStatus: 'connected' | 'request_sent' | 'incoming_request' | 'can_connect';
  requestId?: string;
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
  incomingRequests: CircleRequest[];
  outgoingRequests: CircleRequest[];
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
            subtext: isXpSystemEnabled() ? `+${ev.amount} XP verified craft proof` : 'Verified craft proof',
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

    // 5. Fetch pending requests
    const incomingRequests: CircleRequest[] = [];
    const outgoingRequests: CircleRequest[] = [];

    try {
      const { data: incRows } = await admin
        .from('circle_requests')
        .select('id, sender_shop_id, receiver_shop_id, status, created_at')
        .eq('receiver_shop_id', currentShop.id)
        .eq('status', 'pending');

      if (incRows && incRows.length > 0) {
        const senderIds = incRows.map((r) => r.sender_shop_id);
        const { data: senders } = await admin
          .from('shops')
          .select('id, name, slug, logo_url, address, xp, streak_current')
          .in('id', senderIds);

        const senderMap = new Map((senders || []).map((s) => [s.id, s]));

        for (const r of incRows) {
          const sender = senderMap.get(r.sender_shop_id);
          const senderXp = sender?.xp || 0;
          const tier = getTierForXp(senderXp);
          incomingRequests.push({
            id: r.id,
            senderShopId: r.sender_shop_id,
            senderShopName: sender?.name || 'Tailor Workshop',
            senderShopSlug: sender?.slug || undefined,
            senderLogoUrl: sender?.logo_url || undefined,
            senderAddress: sender?.address || undefined,
            senderTierName: tier.name,
            senderTierColor: tier.color,
            senderStreakCount: sender?.streak_current || 0,
            receiverShopId: r.receiver_shop_id,
            receiverShopName: currentShop.name,
            status: r.status as any,
            createdAt: r.created_at,
          });
        }
      }

      const { data: outRows } = await admin
        .from('circle_requests')
        .select('id, sender_shop_id, receiver_shop_id, status, created_at')
        .eq('sender_shop_id', currentShop.id)
        .eq('status', 'pending');

      if (outRows && outRows.length > 0) {
        const receiverIds = outRows.map((r) => r.receiver_shop_id);
        const { data: receivers } = await admin
          .from('shops')
          .select('id, name, slug, logo_url, address, xp, streak_current')
          .in('id', receiverIds);

        const receiverMap = new Map((receivers || []).map((s) => [s.id, s]));

        for (const r of outRows) {
          const receiver = receiverMap.get(r.receiver_shop_id);
          outgoingRequests.push({
            id: r.id,
            senderShopId: r.sender_shop_id,
            senderShopName: currentShop.name,
            senderShopSlug: currentShop.slug || undefined,
            senderLogoUrl: currentShop.logo_url || undefined,
            senderAddress: currentShop.address || undefined,
            senderTierName: currentTier.name,
            senderTierColor: currentTier.color,
            senderStreakCount: currentShop.streak_current || 0,
            receiverShopId: r.receiver_shop_id,
            receiverShopName: receiver?.name || 'Tailor Workshop',
            status: r.status as any,
            createdAt: r.created_at,
          });
        }
      }
    } catch {
      // Table fallback if migration 0072 not yet executed on backend
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
        incomingRequests,
        outgoingRequests,
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

export async function searchColleaguesAction(query: string): Promise<{ data: SearchedColleague[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [] };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { data: [] };

    const clean = query.trim().replace(/^@/, '');
    if (clean.length < 2) return { data: [] };

    const { data: shops, error: shopsErr } = await admin
      .from('shops')
      .select('id, name, slug, phone, address, logo_url, xp, streak_current, directory_discoverable')
      .neq('id', profile.shop_id)
      .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%,phone.ilike.%${clean}%`)
      .limit(10);

    if (shopsErr || !shops) return { data: [] };

    // Get current connected buddies
    const { data: buddies } = await admin
      .from('circle_members')
      .select('buddy_shop_id')
      .eq('shop_id', profile.shop_id);
    const buddyIds = new Set((buddies || []).map((b) => b.buddy_shop_id));

    // Get active requests
    const { data: requests } = await admin
      .from('circle_requests')
      .select('id, sender_shop_id, receiver_shop_id, status')
      .or(`sender_shop_id.eq.${profile.shop_id},receiver_shop_id.eq.${profile.shop_id}`)
      .eq('status', 'pending');

    const results: SearchedColleague[] = [];
    for (const s of shops) {
      if (s.directory_discoverable === false) continue;
      const tier = getTierForXp(s.xp || 0);

      let connectionStatus: SearchedColleague['connectionStatus'] = 'can_connect';
      let requestId: string | undefined = undefined;

      if (buddyIds.has(s.id)) {
        connectionStatus = 'connected';
      } else {
        const outReq = requests?.find((r) => r.sender_shop_id === profile.shop_id && r.receiver_shop_id === s.id);
        const inReq = requests?.find((r) => r.receiver_shop_id === profile.shop_id && r.sender_shop_id === s.id);
        if (outReq) {
          connectionStatus = 'request_sent';
          requestId = outReq.id;
        } else if (inReq) {
          connectionStatus = 'incoming_request';
          requestId = inReq.id;
        }
      }

      results.push({
        id: s.id,
        name: s.name,
        slug: s.slug || undefined,
        logoUrl: s.logo_url || undefined,
        phone: s.phone || undefined,
        address: s.address || undefined,
        tierName: tier.name,
        tierColor: tier.color,
        streakCount: s.streak_current || 0,
        connectionStatus,
        requestId,
      });
    }

    return { data: results };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Search failed' };
  }
}

export async function sendCircleRequestAction(
  receiverShopId: string
): Promise<{ success?: boolean; requestId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    if (profile.shop_id === receiverShopId) {
      return { error: 'You cannot connect with your own workshop' };
    }

    const { data: myShop } = await admin.from('shops').select('name').eq('id', profile.shop_id).single();
    const senderName = myShop?.name || 'A Colleague Tailor';

    // Upsert circle_requests
    const { data: req, error } = await admin
      .from('circle_requests')
      .upsert(
        {
          sender_shop_id: profile.shop_id,
          receiver_shop_id: receiverShopId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'sender_shop_id, receiver_shop_id' }
      )
      .select('id')
      .single();

    if (error) {
      return { error: error.message };
    }

    // Fire in-app & push notification to receiver
    await createAtelierNotification({
      shopId: receiverShopId,
      recipientId: null,
      category: 'system',
      tone: 'info',
      badgeIcon: 'handshake',
      title: 'New Tailor Circle Invitation',
      subtitle: `${senderName} wants to link workshops in your Tailor Circle.`,
      actionLabel: 'Review Request',
      actionHref: '/circle',
    });

    return { success: true, requestId: req?.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to send request' };
  }
}

export async function acceptCircleRequestAction(
  requestId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    const { data: req } = await admin
      .from('circle_requests')
      .select('id, sender_shop_id, receiver_shop_id')
      .eq('id', requestId)
      .single();

    if (!req) return { error: 'Invitation not found' };
    if (req.receiver_shop_id !== profile.shop_id) {
      return { error: 'You cannot accept an invitation meant for another workshop' };
    }

    // 1. Mark request accepted
    await admin
      .from('circle_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // 2. Bidirectional upsert into circle_members
    await admin.from('circle_members').upsert([
      { shop_id: req.sender_shop_id, buddy_shop_id: req.receiver_shop_id, status: 'active' },
      { shop_id: req.receiver_shop_id, buddy_shop_id: req.sender_shop_id, status: 'active' },
    ], { onConflict: 'shop_id, buddy_shop_id' });

    // Mirror to legacy shops.buddy_shop_id if null
    const { data: myShop } = await admin.from('shops').select('name, buddy_shop_id').eq('id', profile.shop_id).single();
    if (!myShop?.buddy_shop_id) {
      await admin.from('shops').update({ buddy_shop_id: req.sender_shop_id }).eq('id', profile.shop_id);
    }
    const { data: senderShop } = await admin.from('shops').select('buddy_shop_id').eq('id', req.sender_shop_id).single();
    if (!senderShop?.buddy_shop_id) {
      await admin.from('shops').update({ buddy_shop_id: profile.shop_id }).eq('id', req.sender_shop_id);
    }

    // 3. Notify sender
    await createAtelierNotification({
      shopId: req.sender_shop_id,
      recipientId: null,
      category: 'system',
      tone: 'info',
      badgeIcon: 'check_circle',
      title: 'Circle Invitation Accepted!',
      subtitle: `${myShop?.name || 'Your colleague'} accepted your Circle invitation. Your streaks and production pulses are now connected!`,
      actionLabel: 'Open Circle',
      actionHref: '/circle',
    });

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to accept invitation' };
  }
}

export async function declineCircleRequestAction(
  requestId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    await admin
      .from('circle_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .match({ id: requestId, receiver_shop_id: profile.shop_id });

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to decline invitation' };
  }
}

export async function cancelCircleRequestAction(
  requestId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) return { error: 'No workshop found' };

    await admin
      .from('circle_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .match({ id: requestId, sender_shop_id: profile.shop_id });

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to cancel request' };
  }
}
