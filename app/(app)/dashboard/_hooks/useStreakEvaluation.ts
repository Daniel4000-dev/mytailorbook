import { useEffect, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { updateShopAction } from '@/app/actions';
import { useOpenLoops } from './useOpenLoops';

export function useStreakEvaluation() {
  const { currentShop, refreshShop, orders, customers, exceptions } = useData();
  const loops = useOpenLoops(orders, customers, exceptions);
  const evaluatedRef = useRef(false);

  useEffect(() => {
    if (!currentShop || evaluatedRef.current) return;
    evaluatedRef.current = true; // Only evaluate once per mount to prevent infinite loops

    const todayStr = new Date().toISOString().split('T')[0];
    const lastCountedStr = currentShop.streakLastCountedAt 
      ? new Date(currentShop.streakLastCountedAt).toISOString().split('T')[0]
      : null;

    let currentStreak = currentShop.streakCurrent || 0;
    let streakChanged = false;

    // 1. Check if we missed yesterday (break the streak)
    if (lastCountedStr && lastCountedStr !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastCountedStr !== yesterdayStr && currentStreak > 0) {
        currentStreak = 0; // Streak broken!
        streakChanged = true;
      }
    }

    // 2. If 0 open loops and haven't counted today, increment!
    if (loops.length === 0 && lastCountedStr !== todayStr) {
      currentStreak += 1;
      streakChanged = true;
    }

    // 3. Persist if changed
    if (streakChanged) {
      const newBest = Math.max(currentShop.streakBest || 0, currentStreak);
      updateShopAction(currentShop.id, {
        streakCurrent: currentStreak,
        streakBest: newBest,
        ...(loops.length === 0 && lastCountedStr !== todayStr 
          ? { streakLastCountedAt: new Date().toISOString() } 
          : {})
      }).then(() => {
        refreshShop();
      }).catch(err => {
        console.error("Failed to update streak:", err);
      });
    }
  }, [currentShop, loops.length, refreshShop]);
}
