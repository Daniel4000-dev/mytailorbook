'use client';

import useSWR from 'swr';
import { isXpSystemEnabled } from '@/lib/xp';
import {
  getCircleHubDataAction,
  type CircleHubData,
  type CircleBuddy,
  type CircleBenefitsTier,
} from '@/app/actions/circle';

export function useCircleHub() {
  const isEnabled = isXpSystemEnabled();

  const { data: res, error, isLoading, mutate } = useSWR(
    isEnabled ? 'circle-hub-data' : null,
    async () => {
      const result = await getCircleHubDataAction();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const hubData: CircleHubData | undefined = res;
  const buddies: CircleBuddy[] = hubData?.buddies || [];
  const peerBuddies = buddies.filter((b) => !b.isCurrentUser);
  const benefits: CircleBenefitsTier | undefined = hubData?.benefits;

  // Has at least one peer or current user crafted today?
  const todayStr = new Date().toISOString().split('T')[0];
  const activeTodayCount = buddies.filter(
    (b) => b.status === 'active' && b.lastActiveAt && b.lastActiveAt.startsWith(todayStr)
  ).length;

  const isCoOpSecuredToday = Boolean(
    peerBuddies.length > 0 &&
      activeTodayCount >= 2 &&
      hubData?.myShop.status === 'active'
  );

  return {
    data: hubData,
    buddies,
    peerBuddies,
    benefits,
    isCoOpSecuredToday,
    activeTodayCount,
    isLoading,
    error,
    mutate,
  };
}

