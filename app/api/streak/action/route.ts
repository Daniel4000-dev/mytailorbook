import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidAnatomy, getMeasurementFingerprint } from '@/lib/validations/anatomy';
import { createAtelierNotification } from '@/lib/notifications';
import { getTierForXp, isXpSystemEnabled } from '@/lib/xp';

export async function POST(req: Request) {
  const xpEnabled = isXpSystemEnabled();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      action, 
      xp_reward = 10, 
      order_data, 
      measurements,
      order_id 
    } = body;

    const admin = createAdminClient();
    
    // Fetch user profile and shop
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 400 });
    }

    const { data: shop } = await admin
      .from('shops')
      .select('id, name, subscription_status, streak_current, streak_best, streak_last_counted_at, streak_freezes, work_days, vacation_mode, xp, daily_quests, buddy_shop_id, buddy_streak_count, buddy_last_active_at, referred_by_shop_id, referral_reward_claimed')
      .eq('id', profile.shop_id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // -------------------------------------------------------------
    // 1. Proof-of-Craft & Anti-Cheat Validation
    // -------------------------------------------------------------
    let baseReward = xp_reward;
    let cheatFlagReason: string | null = null;
    let measurementFingerprint: string | null = null;

    // Daily Login deduplication (one XP reward per calendar day)
    const lastCountedStrInitial = shop.streak_last_counted_at 
      ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
      : null;
    if (action === 'daily_login' && lastCountedStrInitial === todayStr) {
      baseReward = 0;
    }

    // Daily Status Share (once per calendar day)
    if (action === 'shared_status' || action === 'daily_share') {
      const todayStart = new Date(todayStr + 'T00:00:00Z').toISOString();
      const { data: existingShare } = await admin
        .from('xp_ledger')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('action_type', 'shared_status')
        .gte('created_at', todayStart)
        .limit(1);

      if (existingShare && existingShare.length > 0) {
        baseReward = 0;
        cheatFlagReason = 'daily_share_already_claimed';
      } else {
        baseReward = 15;
      }
    }

    // A. Order Intake Check
    if (action === 'created_order') {
      // Pacing check: ensure at least 45s between rapid order creations
      const fortyFiveSecondsAgo = new Date(now.getTime() - 45 * 1000).toISOString();
      const { data: recentLedger } = await admin
        .from('xp_ledger')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('action_type', 'created_order')
        .gt('created_at', fortyFiveSecondsAgo)
        .limit(1);

      if (recentLedger && recentLedger.length > 0) {
        baseReward = 0;
        cheatFlagReason = 'human_pacing_rate_limit';
      }

      // Check real order data completeness
      if (order_data) {
        const hasName = Boolean(order_data.customerName?.trim());
        const hasPhone = Boolean(order_data.customerPhone?.trim() || order_data.phone?.trim());
        const hasBill = Number(order_data.totalBill) > 0;
        if (!hasName || !hasPhone || !hasBill) {
          baseReward = 0;
          cheatFlagReason = 'incomplete_client_intake';
        }
      }
    }

    // B. Anatomical Sanity Check for Measurements
    if (action === 'measurements_added' || (action === 'created_order' && measurements)) {
      if (measurements) {
        const anatomyResult = isValidAnatomy(measurements);
        if (!anatomyResult.valid) {
          baseReward = 0;
          cheatFlagReason = `anatomy_${anatomyResult.reason}`;
        } else {
          // Check anti-recycling fingerprint in last 48 hours
          measurementFingerprint = getMeasurementFingerprint(measurements);
          if (measurementFingerprint) {
            const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
            const { data: duplicateFingerprints } = await admin
              .from('xp_ledger')
              .select('id')
              .eq('shop_id', shop.id)
              .eq('fingerprint', measurementFingerprint)
              .gt('created_at', twoDaysAgo)
              .limit(1);

            if (duplicateFingerprints && duplicateFingerprints.length > 0) {
              baseReward = 0;
              cheatFlagReason = 'duplicate_measurement_fingerprint';
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Premium 2x Multiplier
    // -------------------------------------------------------------
    const isPremium = shop.subscription_status === 'active' || shop.subscription_status === 'trialing';
    let earnedXp = xpEnabled ? (isPremium ? baseReward * 2 : baseReward) : 0;

    // -------------------------------------------------------------
    // 3. Referral Proof-of-Work Bonus (+100 XP each)
    // -------------------------------------------------------------
    let referralBonusAwarded = false;
    if (shop.referred_by_shop_id && !shop.referral_reward_claimed && baseReward > 0) {
      // Award 100 XP to this shop and 100 XP to referrer
      earnedXp += 100;
      referralBonusAwarded = true;

      // Update referrer shop
      const { data: referrer } = await admin
        .from('shops')
        .select('id, xp')
        .eq('id', shop.referred_by_shop_id)
        .single();

      if (referrer) {
        const referrerNewXp = (referrer.xp || 0) + 100;
        await admin.from('shops').update({ xp: referrerNewXp }).eq('id', referrer.id);
        await admin.from('xp_ledger').insert({
          shop_id: referrer.id,
          amount: 100,
          action_type: 'referral_bonus',
          description: `Referral bonus: ${shop.name} logged their first real order!`,
        });
      }
    }

    // Auto-wake from sabbatical if tailor performs real craft work
    if (shop.vacation_mode && action !== 'daily_login') {
      await admin.from('shops').update({ vacation_mode: false }).eq('id', shop.id);
      try {
        await admin.from('circle_members').update({
          status: 'active',
          sabbatical_reason: null,
          sabbatical_started_at: null,
        }).eq('shop_id', shop.id);
      } catch {
        // ignore fallback
      }
    }

    // -------------------------------------------------------------
    // 4. Atelier Circle Multi-Peer Streak & XP Check (with Diminishing Tiers & Sabbatical Rules)
    // -------------------------------------------------------------
    let buddySynced = false;
    let buddyStreakCount = shop.buddy_streak_count || 0;
    const activeBuddyIds: string[] = [];

    // Check circle_members table
    try {
      const { data: circleRows } = await admin
        .from('circle_members')
        .select('buddy_shop_id, status')
        .eq('shop_id', shop.id);

      if (circleRows && circleRows.length > 0) {
        circleRows.forEach((r) => {
          if (r.status === 'active') {
            activeBuddyIds.push(r.buddy_shop_id);
          }
        });
      }
    } catch {
      // Fallback
    }

    if (activeBuddyIds.length === 0 && shop.buddy_shop_id && !shop.vacation_mode) {
      activeBuddyIds.push(shop.buddy_shop_id);
    }

    // Total pod size = me (1) + active buddies
    const totalPodSize = activeBuddyIds.length + 1;

    // Apply Diminishing Benefits Schedule:
    // 1-4 members: 15 XP
    // 5-8 members: 5 XP
    // 9+ members: 0 XP (disabled)
    let peerXpReward = 0;
    if (xpEnabled) {
      if (totalPodSize <= 4) {
        peerXpReward = 15;
      } else if (totalPodSize <= 8) {
        peerXpReward = 5;
      }
    }

    if (activeBuddyIds.length > 0) {
      const { data: buddyShops } = await admin
        .from('shops')
        .select('id, name, streak_last_counted_at, buddy_streak_count, vacation_mode')
        .in('id', activeBuddyIds);

      if (buddyShops && buddyShops.length > 0) {
        // Any active non-vacation peer who has worked today
        const workingBuddiesToday = buddyShops.filter(
          (b) => !b.vacation_mode && b.streak_last_counted_at?.startsWith(todayStr)
        );

        const shopBuddyActiveToday = shop.buddy_last_active_at?.startsWith(todayStr);

        if (workingBuddiesToday.length > 0 && !shopBuddyActiveToday) {
          buddySynced = true;
          buddyStreakCount += 1;
          if (peerXpReward > 0) earnedXp += peerXpReward;

          // Update my shop
          await admin.from('shops').update({
            buddy_streak_count: buddyStreakCount,
            buddy_last_active_at: now.toISOString(),
          }).eq('id', shop.id);

          // Update all active peers who worked today
          for (const wb of workingBuddiesToday) {
            await admin.from('shops').update({
              buddy_streak_count: buddyStreakCount,
              buddy_last_active_at: now.toISOString(),
            }).eq('id', wb.id);

            if (peerXpReward > 0) {
              const { data: bFresh } = await admin.from('shops').select('xp').eq('id', wb.id).single();
              if (bFresh) {
                await admin.from('shops').update({ xp: (bFresh.xp || 0) + peerXpReward }).eq('id', wb.id);
                await admin.from('xp_ledger').insert({
                  shop_id: wb.id,
                  amount: peerXpReward,
                  action_type: 'buddy_coop_bonus',
                  description: `Circle Co-Op Bonus with ${shop.name}! (${totalPodSize}-tailor pod)`,
                });
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 5. Individual Streak Calculation
    // -------------------------------------------------------------
    let currentStreak = shop.streak_current || 0;
    let bestStreak = shop.streak_best || 0;
    let streakFreezes = shop.streak_freezes || 0;
    let workDays = shop.work_days || [1, 2, 3, 4, 5, 6];
    let streakChanged = false;

    const lastCountedStr = shop.streak_last_counted_at 
      ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
      : null;

    if (lastCountedStr !== todayStr) {
      if (lastCountedStr) {
        const lastDate = new Date(lastCountedStr);
        lastDate.setHours(12,0,0,0);
        const todayDate = new Date(todayStr);
        todayDate.setHours(12,0,0,0);
        
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        // Streak is paused for up to 3 days without resetting.
        // On day 4 or later of inactivity, it resets to zero unless a freeze protects it.
        if (diffDays > 3 && !shop.vacation_mode) {
          if (streakFreezes > 0 && currentStreak > 0) {
            streakFreezes -= 1;
          } else {
            currentStreak = 0;
          }
        }
      }

      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
      streakChanged = true;

      // Milestone streak bonuses
      if (currentStreak === 7) {
        earnedXp += 50;
      } else if (currentStreak === 21) {
        earnedXp += 150;
      } else if (currentStreak === 50) {
        earnedXp += 300;
      }
    }

    // -------------------------------------------------------------
    // 6. Daily Quests Progress
    // -------------------------------------------------------------
    let questsState = (shop as any).daily_quests || {};
    if (questsState && questsState.date === todayStr && questsState.quests) {
      let questType = action;
      if (action === 'updated_order' || action === 'completed_order') questType = 'update_order';
      
      let questUpdated = false;
      const newQuests = questsState.quests.map((q: any) => {
        if (q.type === questType && !q.completed) {
          const newCurrent = q.current + 1;
          const completed = newCurrent >= q.target;
          if (completed) {
            earnedXp += q.rewardXP || 20;
          }
          questUpdated = true;
          return { ...q, current: newCurrent, completed };
        }
        return q;
      });
      
      if (questUpdated) {
        questsState.quests = newQuests;
      }
    }

    // -------------------------------------------------------------
    // 7. Calculate Rank & Milestones Before DB Commit
    // -------------------------------------------------------------
    const oldXp = shop.xp || 0;
    const totalXp = oldXp + earnedXp;

    let rankMovedUp = false;
    let oldRank = 0;
    let newRank = 0;

    if (earnedXp > 0) {
      const { count: countBefore } = await admin
        .from('shops')
        .select('*', { count: 'exact', head: true })
        .gt('xp', oldXp);
      oldRank = (countBefore || 0) + 1;

      const { count: countAfter } = await admin
        .from('shops')
        .select('*', { count: 'exact', head: true })
        .gt('xp', totalXp);
      newRank = (countAfter || 0) + 1;

      if (newRank < oldRank) {
        rankMovedUp = true;
      }
    }

    const oldTier = getTierForXp(oldXp);
    const newTier = getTierForXp(totalXp);
    const tierUnlocked = newTier.minXp > oldTier.minXp;
    const isStreakMilestone = streakChanged && [3, 7, 14, 21, 30, 50, 100].includes(currentStreak);

    // -------------------------------------------------------------
    // 8. Commit XP & Ledger Audit
    // -------------------------------------------------------------
    const updateData: Record<string, unknown> = {};
    if (xpEnabled) {
      updateData.xp = totalXp;
      updateData.daily_quests = questsState;
      if (referralBonusAwarded) updateData.referral_reward_claimed = true;
    }

    if (streakChanged) {
      updateData.streak_current = currentStreak;
      updateData.streak_best = bestStreak;
      updateData.streak_freezes = streakFreezes;
      updateData.streak_last_counted_at = now.toISOString();
      updateData.vacation_mode = false;
    }

    if (Object.keys(updateData).length > 0) {
      await admin.from('shops').update(updateData).eq('id', shop.id);
    }

    if (xpEnabled && earnedXp > 0) {
      await admin.from('xp_ledger').insert({
        shop_id: shop.id,
        amount: earnedXp,
        action_type: action,
        order_id: order_id || null,
        description: cheatFlagReason ? `Flagged: ${cheatFlagReason}` : `Craft XP: ${action}`,
        fingerprint: measurementFingerprint,
      });
    }

    // -------------------------------------------------------------
    // 9. Dispatch Rank & Milestone Push Notifications
    // -------------------------------------------------------------
    if (xpEnabled && rankMovedUp) {
      createAtelierNotification({
        shopId: shop.id,
        recipientId: user.id,
        category: 'system',
        tone: 'info',
        badgeIcon: 'leaderboard',
        badgeBg: '#FEF3C7',
        badgeColor: '#D97706',
        title: 'You moved up the board!',
        subtitle: `You climbed to #${newRank} on the Master Tailor leaderboard with ${totalXp} XP (+${earnedXp} XP).`,
        actionLabel: 'View Leaderboard',
        actionHref: '/dashboard',
      }).catch(() => {});
    }

    if (xpEnabled && tierUnlocked) {
      createAtelierNotification({
        shopId: shop.id,
        recipientId: user.id,
        category: 'system',
        tone: 'info',
        badgeIcon: 'workspace_premium',
        badgeBg: '#EDE9FE',
        badgeColor: '#7C3AED',
        title: `Rank Unlocked: ${newTier.name}!`,
        subtitle: `Your workshop reached ${newTier.name} rank with ${totalXp} XP. High standard craft!`,
        actionLabel: 'View Rank',
        actionHref: '/dashboard',
      }).catch(() => {});
    }

    if (isStreakMilestone) {
      createAtelierNotification({
        shopId: shop.id,
        recipientId: user.id,
        category: 'system',
        tone: 'info',
        badgeIcon: 'local_fire_department',
        badgeBg: '#FFEDD5',
        badgeColor: '#EA580C',
        title: `${currentStreak}-Day Streak Milestone!`,
        subtitle: `Consistent craft! You've logged workshop activity for ${currentStreak} days in a row.`,
        actionLabel: 'View Streak',
        actionHref: '/dashboard',
      }).catch(() => {});
    }

    if (buddySynced && shop.buddy_shop_id) {
      createAtelierNotification({
        shopId: shop.buddy_shop_id,
        category: 'system',
        tone: 'info',
        badgeIcon: 'group',
        badgeBg: '#DCFCE7',
        badgeColor: '#16A34A',
        title: 'Studio Buddy Streak Synced!',
        subtitle: `${shop.name} logged craft activity! Your shared streak is now ${buddyStreakCount} days.`,
        actionLabel: 'View Circle',
        actionHref: '/circle',
      }).catch(() => {});
    }

    return NextResponse.json({ 
      success: true, 
      streak_current: streakChanged ? currentStreak : shop.streak_current,
      streak_bumped: streakChanged,
      xp_awarded: earnedXp,
      total_xp: totalXp,
      is_premium_multiplier: isPremium,
      buddy_synced: buddySynced,
      buddy_streak_count: buddyStreakCount,
      cheat_flag_reason: cheatFlagReason,
    });

  } catch (error) {
    console.error('Streak action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
