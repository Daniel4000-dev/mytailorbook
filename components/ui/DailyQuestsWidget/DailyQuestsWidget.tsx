'use client';

import styles from './DailyQuestsWidget.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useDailyQuests } from '@/lib/hooks/useDailyQuests';
import { useData } from '@/contexts/DataContext';

export default function DailyQuestsWidget() {
  const { questsState } = useDailyQuests();
  const { currentShop } = useData();

  if (!questsState) return null;

  const totalCompleted = questsState.quests.filter(q => q.completed).length;
  const isAllCompleted = totalCompleted === questsState.quests.length;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Symbol name="task_alt" size={24} style={{ color: "var(--sf-accent-indigo)" }} />
          Daily Quests
        </div>
        <div className={styles.rewardHeader}>
          <Symbol name="diamond" size={16} fill /> {currentShop?.gems || 0} Gems
        </div>
      </div>
      
      <div className={styles.questList}>
        {questsState.quests.map((quest) => (
          <div key={quest.id} className={`${styles.questItem} ${quest.completed ? styles.completed : ''}`}>
            <div className={styles.questInfo}>
              <div className={styles.checkbox}>
                {quest.completed && <Symbol name="check" size={16} />}
              </div>
              <span className={styles.questTitle}>{quest.title}</span>
            </div>
            {!quest.completed && (
              <div className={styles.rewards}>
                <div className={`${styles.rewardBadge} ${styles.xp}`}>
                  +{quest.rewardXP} XP
                </div>
                <div className={`${styles.rewardBadge} ${styles.gem}`}>
                  <Symbol name="diamond" size={12} fill /> {quest.rewardGems}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {isAllCompleted && (
        <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--sf-accent-emerald)', fontWeight: 'bold' }}>
          Amazing work! You've completed all quests today! 🎉
        </div>
      )}
    </div>
  );
}
