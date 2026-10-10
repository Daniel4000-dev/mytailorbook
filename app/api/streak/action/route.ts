import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, xp_reward = 10 } = body;

    const admin = createAdminClient();
    
    // Fetch the shop
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 400 });
    }

    const { data: shop } = await admin
      .from('shops')
      .select('id, streak_current, streak_best, streak_last_counted_at, streak_freezes, work_days, vacation_mode, xp')
      .eq('id', profile.shop_id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Parse dates to local timezone equivalent (ignoring time)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let currentStreak = shop.streak_current || 0;
    let bestStreak = shop.streak_best || 0;
    let streakFreezes = shop.streak_freezes || 0;
    let workDays = shop.work_days || [1, 2, 3, 4, 5, 6];
    let xp = (shop.xp || 0) + xp_reward;
    let streakChanged = false;

    // We only bump the streak once per day, but we can always award XP
    const lastCountedStr = shop.streak_last_counted_at 
      ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
      : null;

    if (lastCountedStr !== todayStr) {
      if (lastCountedStr) {
        // Calculate gap days
        const lastDate = new Date(lastCountedStr);
        lastDate.setHours(12,0,0,0); // Avoid timezone issues
        const todayDate = new Date(todayStr);
        todayDate.setHours(12,0,0,0);
        
        // Loop through all missed days
        let currentDate = new Date(lastDate);
        currentDate.setDate(currentDate.getDate() + 1);
        
        let streakBroken = false;

        while (currentDate < todayDate) {
          const dayOfWeek = currentDate.getDay();
          
          // If it's a workday and we're not on vacation, we missed it!
          if (workDays.includes(dayOfWeek) && !shop.vacation_mode) {
            if (streakFreezes > 0 && currentStreak > 0) {
              streakFreezes -= 1; // Used a freeze
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
    }

    // Always update XP, update streak if changed
    const updateData: any = { xp };
    if (streakChanged) {
      updateData.streak_current = currentStreak;
      updateData.streak_best = bestStreak;
      updateData.streak_freezes = streakFreezes;
      updateData.streak_last_counted_at = now.toISOString();
      // If they logged an action, automatically turn off vacation mode so they don't forget
      updateData.vacation_mode = false; 
    }

    await admin.from('shops').update(updateData).eq('id', shop.id);

    return NextResponse.json({ 
      success: true, 
      streak_current: streakChanged ? currentStreak : shop.streak_current,
      streak_bumped: streakChanged,
      xp_awarded: xp_reward,
      total_xp: xp
    });

  } catch (error) {
    console.error('Streak action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
