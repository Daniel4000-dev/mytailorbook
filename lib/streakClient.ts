import { emitXpEvent, type XpEventOptions } from '@/lib/xp';

export type StreakActionOptions = XpEventOptions;

export async function logStreakAction(
  actionName: string,
  xpReward = 10,
  options?: boolean | StreakActionOptions
) {
  return emitXpEvent(actionName, xpReward, options);
}
