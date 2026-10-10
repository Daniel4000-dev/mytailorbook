import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';

export type QuestType = 'update_order' | 'log_measurement' | 'send_invoice' | 'market_day';

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  target: number;
  current: number;
  rewardXP: number;
  rewardGems: number;
  completed: boolean;
}

export interface DailyQuestsState {
  date: string;
  quests: Quest[];
}

const generateRandomQuests = (): Quest[] => {
  return [
    { id: 'q1', type: 'update_order', title: 'Update 1 Order Status', target: 1, current: 0, rewardXP: 20, rewardGems: 5, completed: false },
    { id: 'q2', type: 'log_measurement', title: 'Log a new measurement', target: 1, current: 0, rewardXP: 20, rewardGems: 5, completed: false },
    { id: 'q3', type: 'market_day', title: 'Check your calendar', target: 1, current: 0, rewardXP: 10, rewardGems: 2, completed: false },
  ];
};

export function useDailyQuests() {
  const { currentShop, updateShop } = useData();
  const [questsState, setQuestsState] = useState<DailyQuestsState | null>(null);

  useEffect(() => {
    if (!currentShop) return;
    
    const today = new Date().toISOString().split('T')[0];
    const shopQuests = currentShop.dailyQuests as DailyQuestsState | undefined;

    if (!shopQuests || shopQuests.date !== today) {
      // Need to generate new quests!
      const newQuests: DailyQuestsState = {
        date: today,
        quests: generateRandomQuests(),
      };
      setQuestsState(newQuests);
      // Save silently
      updateShop({ dailyQuests: newQuests }).catch(console.error);
    } else {
      setQuestsState(shopQuests);
    }
  }, [currentShop]);

  const progressQuest = async (questId: string) => {
    if (!questsState || !currentShop) return;
    
    const newQuests = questsState.quests.map(q => {
      if (q.id === questId && !q.completed) {
        const newCurrent = q.current + 1;
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target
        };
      }
      return q;
    });

    const completedQuest = newQuests.find(q => q.id === questId);
    let newXp = currentShop.xp || 0;
    let newGems = currentShop.gems || 0;
    
    if (completedQuest && completedQuest.completed && !questsState.quests.find(q => q.id === questId)?.completed) {
      newXp += completedQuest.rewardXP;
      newGems += completedQuest.rewardGems;
    }

    const newState = { ...questsState, quests: newQuests };
    setQuestsState(newState);
    await updateShop({ dailyQuests: newState, xp: newXp, gems: newGems });
  };

  return { questsState, progressQuest };
}
