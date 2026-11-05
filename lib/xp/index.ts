import confetti from 'canvas-confetti';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import {
  TAILOR_TIERS,
  CHALLENGE_GOAL_XP,
  TOTAL_EQUIPMENT_GRANTS,
  CHALLENGE_TASKS,
  getTierForXp,
  getNextTierProgress,
  type TailorTier,
  type ChallengeTask,
} from '@/lib/gamification';

export {
  TAILOR_TIERS,
  CHALLENGE_GOAL_XP,
  TOTAL_EQUIPMENT_GRANTS,
  CHALLENGE_TASKS,
  getTierForXp,
  getNextTierProgress,
  type TailorTier,
  type ChallengeTask,
};

export interface XpEventOptions {
  orderData?: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  orderId?: string;
  triggerCelebration?: boolean;
}

/**
 * Master check for whether the standalone XP / Streak / Tailor Circle engine
 * is currently plugged into the application.
 */
export function isXpSystemEnabled(): boolean {
  return Boolean(FEATURE_FLAGS.xpSystem);
}

/**
 * Client-side pluggable XP & Streak dispatcher.
 * When `FEATURE_FLAGS.xpSystem` is false, this is a zero-cost no-op that
 * makes no network calls and triggers no UI side effects.
 */
export async function emitXpEvent(
  actionName: string,
  xpReward = 10,
  options?: boolean | XpEventOptions
) {
  if (!isXpSystemEnabled()) {
    return {
      success: true,
      disabled: true,
      streak_bumped: false,
      streak_current: undefined,
    };
  }

  try {
    let triggerCelebration = false;
    let orderData: Record<string, unknown> | undefined;
    let measurements: Record<string, unknown> | undefined;
    let orderId: string | undefined;

    if (typeof options === 'boolean') {
      triggerCelebration = options;
    } else if (options && typeof options === 'object') {
      triggerCelebration = Boolean(options.triggerCelebration);
      orderData = options.orderData;
      measurements = options.measurements;
      orderId = options.orderId;
    }

    const res = await fetch('/api/streak/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionName,
        xp_reward: xpReward,
        order_data: orderData,
        measurements,
        order_id: orderId,
      }),
    });
    const data = await res.json();

    if (data.success && (triggerCelebration || data.buddy_synced)) {
      const duration = 2000;
      const end = Date.now() + duration;

      try {
        const audio = new Audio('/sounds/success.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {
        // Ignore audio errors on restricted browsers
      }

      (function frame() {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#4338CA', '#F59E0B', '#10B981'],
          zIndex: 9999,
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#4338CA', '#F59E0B', '#10B981'],
          zIndex: 9999,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }
    }
    return data;
  } catch (error) {
    console.error('Failed to emit XP event', error);
    return { success: false, streak_bumped: false };
  }
}

/**
 * Server-side pluggable XP ledger recorder.
 * Safely no-ops when `FEATURE_FLAGS.xpSystem` is false so server actions
 * remain completely decoupled from the XP table.
 */
export async function recordServerXpLedger(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  entry: {
    shop_id: string;
    amount: number;
    action_type: string;
    description: string;
  }
): Promise<void> {
  if (!isXpSystemEnabled()) return;
  try {
    await adminClient.from('xp_ledger').insert(entry);
  } catch (err) {
    console.error('XP ledger insert failed:', err);
  }
}

