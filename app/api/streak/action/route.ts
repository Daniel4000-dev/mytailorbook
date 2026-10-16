import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidAnatomy, getMeasurementFingerprint } from '@/lib/validations/anatomy';

export async function POST(req: Request) {
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
    let earnedXp = isPremium ? baseReward * 2 : baseReward;

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

    // -------------------------------------------------------------
    // 4. Studio Buddy Co-Op Streak & XP Check
    // -------------------------------------------------------------
    let buddySynced = false;
    let buddyStreakCount = shop.buddy_streak_count || 0;
    if (shop.buddy_shop_id) {
      const { data: buddyShop } = await admin
        .from('shops')
        .select('id, streak_last_counted_at, buddy_streak_count')
        .eq('id', shop.buddy_shop_id)
        .single();

      if (buddyShop?.streak_last_counted_at) {
        const buddyActiveToday = buddyShop.streak_last_counted_at.startsWith(todayStr);
        const shopBuddyActiveToday = shop.buddy_last_active_at?.startsWith(todayStr);

        // If buddy is active today and we haven't synced buddy streak yet today
        if (buddyActiveToday && !shopBuddyActiveToday) {
          buddySynced = true;
          buddyStreakCount += 1;
          earnedXp += 15; // Co-Op Buddy Bonus!

          // Update both shops
          await admin.from('shops').update({
            buddy_streak_count: buddyStreakCount,
            buddy_last_active_at: now.toISOString(),
          }).eq('id', shop.id);

          await admin.from('shops').update({
            buddy_streak_count: buddyStreakCount,
            buddy_last_active_at: now.toISOString(),
          }).eq('id', buddyShop.id);

          // Give buddy +15 XP too!
          const { data: buddyFresh } = await admin.from('shops').select('xp').eq('id', buddyShop.id).single();
          if (buddyFresh) {
            await admin.from('shops').update({ xp: (buddyFresh.xp || 0) + 15 }).eq('id', buddyShop.id);
            await admin.from('xp_ledger').insert({
              shop_id: buddyShop.id,
              amount: 15,
              action_type: 'buddy_coop_bonus',
              description: `Buddy Co-Op Bonus with ${shop.name}!`,
            });
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
        
        let currentDate = new Date(lastDate);
        currentDate.setDate(currentDate.getDate() + 1);
        let streakBroken = false;

        while (currentDate < todayDate) {
          const dayOfWeek = currentDate.getDay();
          if (workDays.includes(dayOfWeek) && !shop.vacation_mode) {
            if (streakFreezes > 0 && currentStreak > 0) {
              streakFreezes -= 1;
            } else {
              streakBroken = true;
              break;
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (streakBroken) {
          currentStreak = 0;
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
    // 7. Commit XP & Ledger Audit
    // -------------------------------------------------------------
    const totalXp = (shop.xp || 0) + earnedXp;
    const updateData: Record<string, unknown> = {
      xp: totalXp,
      daily_quests: questsState,
      referral_reward_claimed: referralBonusAwarded ? true : shop.referral_reward_claimed,
    };

    if (streakChanged) {
      updateData.streak_current = currentStreak;
      updateData.streak_best = bestStreak;
      updateData.streak_freezes = streakFreezes;
      updateData.streak_last_counted_at = now.toISOString();
      updateData.vacation_mode = false;
    }

    await admin.from('shops').update(updateData).eq('id', shop.id);

    if (earnedXp > 0) {
      await admin.from('xp_ledger').insert({
        shop_id: shop.id,
        amount: earnedXp,
        action_type: action,
        order_id: order_id || null,
        description: cheatFlagReason ? `Flagged: ${cheatFlagReason}` : `Craft XP: ${action}`,
        fingerprint: measurementFingerprint,
      });
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
