'use client';

import { useEffect, useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import FlameIcon from '@/components/ui/FlameIcon/FlameIcon';
import { logStreakAction } from '@/lib/streakClient';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import styles from './DailyActivityDropdown.module.css';

interface ActivityOption {
  id: string;
  label: string;
}

const CRAFT_ACTIVITIES: ActivityOption[] = [
  { id: 'fabric_market', label: 'Fabric & Accessories Sourcing at Market' },
  { id: 'fabric_cutting', label: 'Pattern Drafting & Fabric Cutting' },
  { id: 'garment_sewing', label: 'Custom Sewing & Garment Assembly' },
  { id: 'client_fitting', label: 'Client Fitting & Alterations Session' },
  { id: 'final_finishing', label: 'Pressing, Hemming & Quality Inspection' },
  { id: 'order_delivery', label: 'Garment Delivery & Handover' },
  { id: 'measurements_intake', label: 'Style Consultation & Measurements' },
  { id: 'custom', label: 'Other Shop Work...' },
];

export default function DailyActivityDropdown() {
  const { currentShop, refreshShop } = useData();
  const { showToast } = useToast();

  const [selectedActivity, setSelectedActivity] = useState<string>('fabric_cutting');
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedActivity, setLoggedActivity] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const shopId = currentShop?.id || 'shop';
  const currentStreak = currentShop?.streakCurrent || 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `mtb_daily_activity_${todayStr}_${shopId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setLoggedActivity(saved);
    }
  }, [shopId]);

  const handleLogActivity = async () => {
    const isCustom = selectedActivity === 'custom';
    const activityName = isCustom
      ? customText.trim() || 'Custom Shop Work'
      : CRAFT_ACTIVITIES.find((a) => a.id === selectedActivity)?.label || 'Shop Activity';

    setLoading(true);
    try {
      const res = await logStreakAction(selectedActivity, 15, {
        triggerCelebration: true,
        orderData: { activityName },
      });

      if (res?.success) {
        const todayStr = new Date().toISOString().split('T')[0];
        const key = `mtb_daily_activity_${todayStr}_${shopId}`;
        localStorage.setItem(key, activityName);

        // If market sourcing, also secure the legacy market-day shield key
        if (selectedActivity === 'fabric_market') {
          const marketKey = `mtb_market_day_${todayStr}_${shopId}`;
          localStorage.setItem(marketKey, 'true');
        }

        setLoggedActivity(activityName);
        setIsEditing(false);
        refreshShop();
        showToast('Craft activity logged. Your daily streak is secured!', 'success');
      } else {
        showToast('Could not record activity. Please try again.', 'error');
      }
    } catch {
      showToast('Error recording activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loggedActivity && !isEditing) {
    return (
      <div className={styles.completedCard}>
        <div className={styles.completedInfo}>
          <div className={styles.completedIcon}>
            <Symbol name="check_circle" size={20} />
          </div>
          <div className={styles.completedText}>
            <span className={styles.completedTitle}>
              Craft Logged: {loggedActivity}
            </span>
            <span className={styles.completedSub}>
              {currentStreak > 0
                ? `${currentStreak}-day streak active and protected.`
                : 'Your daily streak is secured for today.'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => setIsEditing(true)}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Daily Craft Activity</span>
        </div>
        <div className={styles.streakPill}>
          <FlameIcon size={14} />
          <span>
            {currentStreak > 0 ? `${currentStreak}-day streak` : 'Streak ready'}
          </span>
        </div>
      </div>

      <div className={styles.form}>
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            disabled={loading}
          >
            {CRAFT_ACTIVITIES.map((act) => (
              <option key={act.id} value={act.id}>
                {act.label}
              </option>
            ))}
          </select>
          <div className={styles.selectArrow}>
            <Symbol name="expand_more" size={18} />
          </div>
        </div>

        {selectedActivity === 'custom' && (
          <input
            type="text"
            className={styles.customInput}
            placeholder="Specify your craft task (e.g. Embroidery on velvet)"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={loading}
            maxLength={80}
          />
        )}

        <div className={styles.actionRow}>
          {isEditing && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={styles.logBtn}
            onClick={handleLogActivity}
            disabled={loading || (selectedActivity === 'custom' && !customText.trim())}
          >
            {loading ? (
              <>
                <Symbol name="progress_activity" size={14} className="global-spinner" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Symbol name="task_alt" size={14} />
                <span>Log Craft &amp; Advance Streak</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

