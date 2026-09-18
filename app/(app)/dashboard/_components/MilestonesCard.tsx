import { useMilestones } from '../_hooks/useMilestones';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './MilestonesCard.module.css';

export default function MilestonesCard() {
  const { milestones } = useMilestones();

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Studio Milestones</h2>
      <p className={styles.subtitle}>Track your business growth</p>
      
      <div className={styles.list}>
        {milestones.map((m) => (
          <div key={m.id} className={styles.milestone}>
            <div className={styles.milestoneHeader}>
              <span className={styles.milestoneTitle}>{m.title}</span>
              <span className={styles.milestoneProgressText}>
                {m.current} / {m.target}
              </span>
            </div>
            <div className={styles.track}>
              <div 
                className={`${styles.fill} ${m.achieved ? styles.fillAchieved : ''}`} 
                style={{ width: `${m.progress * 100}%` }} 
              />
            </div>
            {m.achieved && (
              <div className={styles.achievedBadge}>
                <Symbol name="stars" size={14} />
                Milestone Reached!
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
