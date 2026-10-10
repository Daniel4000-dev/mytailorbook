import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    
    // 1. Update user's last_active_at
    await admin
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);

    // 2. Fetch the shop to evaluate the action-based streak
    const { data: profile } = await admin.from('profiles').select('shop_id').eq('id', user.id).single();
    
    if (profile?.shop_id) {
      const { data: shop } = await admin
        .from('shops')
        .select('id, streak_current, streak_best, streak_last_counted_at, streak_freezes')
        .eq('id', profile.shop_id)
        .single();
        
      if (shop) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastCountedStr = shop.streak_last_counted_at 
          ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
          : null;

        let currentStreak = shop.streak_current || 0;
        let bestStreak = shop.streak_best || 0;
        let streakFreezes = shop.streak_freezes || 0;
        let streakChanged = false;

        // Hasn't counted today yet?
        if (lastCountedStr !== todayStr) {
          // Check if we missed yesterday or earlier
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastCountedStr && lastCountedStr !== yesterdayStr) {
            // We missed yesterday! Did we have a streak freeze?
            // Simple logic: if difference is exactly 2 days, it costs 1 freeze. 
            // If they missed multiple days, we can either drain freezes or just break.
            // Let's just do a simple check: if they have a freeze, deduct it. If not, break.
            if (streakFreezes > 0 && currentStreak > 0) {
              streakFreezes -= 1;
              // we don't break the streak!
            } else {
              currentStreak = 0; // Streak broken
            }
          }
          
          // Increment for today's action!
          currentStreak += 1;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
          streakChanged = true;
        }

        if (streakChanged) {
          await admin.from('shops').update({
            streak_current: currentStreak,
            streak_best: bestStreak,
            streak_freezes: streakFreezes,
            streak_last_counted_at: new Date().toISOString()
          }).eq('id', shop.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
