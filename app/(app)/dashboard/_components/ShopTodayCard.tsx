import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { OpenLoop } from '../_hooks/useOpenLoops';
import { useMilestones } from '../_hooks/useMilestones';
import { useStreakEvaluation } from '../_hooks/useStreakEvaluation';
import styles from './ShopTodayCard.module.css';

export default function ShopTodayCard({
  loops,
  onNavigate,
  shop,
}: {
  loops: OpenLoop[];
  onNavigate: (href: string) => void;
  shop: any;
}) {
  useStreakEvaluation();
  const { milestones } = useMilestones();
  const isAllCaughtUp = loops.length === 0;
  const currentStreak = shop?.streakCurrent || 0;

  // Contextual copy for the assistant
  let title = "Your shop is on track";
  let subtitle = "You're all caught up ✓";
  let emotion = "neutral";

  // Check if any milestone was just recently hit (current is very close to target or exactly target)
  const newlyHitMilestone = milestones.find(m => m.achieved && m.current >= m.target && m.current <= m.target + 2);

  if (newlyHitMilestone && isAllCaughtUp) {
    title = "Milestone reached!";
    subtitle = `${newlyHitMilestone.title}. Look at you running an actual system!`;
    emotion = "celebratory";
  } else if (!isAllCaughtUp) {
    title = "Needs Attention";
    subtitle = `${loops.length} item${loops.length === 1 ? '' : 's'} need attention before today is done.`;
    emotion = "concerned";
  } else if (currentStreak > 0) {
    title = "Your shop is on track";
    if (shop?.onboardingGoal) {
      subtitle = `You are on a ${currentStreak}-day streak! You are successfully building your reputation for ${shop.onboardingGoal.toLowerCase()}.`;
    } else {
      subtitle = `${currentStreak}-day streak of clearing the board!`;
    }
    emotion = "celebratory";
  }

  // Dynamically select male or female based on shop ID to keep it consistent per shop
  const isFemale = shop?.id ? shop.id.charCodeAt(0) % 2 === 0 : true;
  const genderPrefix = isFemale ? 'female' : 'male';
  
  // Map emotions to the downloaded file names
  const emotionMap: Record<string, string> = {
    neutral: '1',
    celebratory: '2',
    concerned: '3'
  };
  const imgNum = emotionMap[emotion];
  const mascotSrc = `/mascots/${genderPrefix}_${imgNum}.png`;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.assistantAvatar} ${styles[`assistant_${emotion}`]}`}>
          <Image
            src={mascotSrc}
            alt="Studio Assistant"
            width={64}
            height={64}
            className={styles.mascotImage}
            unoptimized
          />
        </div>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      {!isAllCaughtUp && (
        <p className={styles.criteriaHint}>
          <Symbol name="info" size={14} className={styles.hintIcon} /> 
          <span>Clear all items before midnight to maintain your streak!</span>
        </p>
      )}

      {!isAllCaughtUp && (
        <motion.div 
          className={styles.loopList}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {loops.map((loop) => (
            <motion.button
              key={loop.id}
              variants={itemVariants}
              className={styles.loopRow}
              onClick={() => onNavigate(loop.href)}
              type="button"
            >
              <div className={styles.loopInfo}>
                <span className={styles.loopTitle}>{loop.title}</span>
              </div>
              <div className={styles.loopAction}>
                {loop.actionText}
                <Symbol name="chevron_right" size={16} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
