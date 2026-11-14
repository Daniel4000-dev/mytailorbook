'use client';

import { useState } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { sendBroadcastAction, type BroadcastPayload } from './actions';
import styles from './page.module.css';

interface BroadcastComposerProps {
  onSuccess: () => void;
}

export default function BroadcastComposer({ onSuccess }: BroadcastComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetMode, setTargetMode] = useState<BroadcastPayload['targetMode']>('all');
  const [targetPlan, setTargetPlan] = useState<BroadcastPayload['targetPlan']>('all');
  const [targetAudience, setTargetAudience] = useState<BroadcastPayload['targetAudience']>('all');
  const [tone, setTone] = useState<BroadcastPayload['tone']>('info');
  const [actionLabel, setActionLabel] = useState('');
  const [actionHref, setActionHref] = useState('');

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const insertVariable = (varCode: string) => {
    setMessage((prev) => `${prev} ${varCode} `);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setStatus(null);

    const res = await sendBroadcastAction({
      title,
      message,
      targetMode,
      targetPlan,
      targetAudience,
      tone,
      actionLabel: actionLabel.trim() || undefined,
      actionHref: actionHref.trim() || undefined,
    });

    if (res.success) {
      setStatus({
        success: true,
        message: `Delivered to ${res.recipientsNotified} recipients across ${res.shopsNotified} tailor shops (${res.pushSentCount} device pushes dispatched)!`,
      });
      setTitle('');
      setMessage('');
      setActionLabel('');
      setActionHref('');
      onSuccess();
    } else {
      setStatus({ success: false, message: res.error || 'Failed to dispatch broadcast.' });
    }

    setSending(false);
  };

  return (
    <form className={styles.composerForm} onSubmit={handleSubmit}>
      {status && (
        <div className={status.success ? styles.alertSuccess : styles.alertError}>
          <Symbol name={status.success ? 'check_circle' : 'warning'} size={18} />
          <span>{status.message}</span>
        </div>
      )}

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Broadcast Title *</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Scheduled System Upgrade Tonight"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Urgency / Tone</label>
          <select
            className={styles.select}
            value={tone}
            onChange={(e) => setTone(e.target.value as BroadcastPayload['tone'])}
          >
            <option value="info">Normal Information</option>
            <option value="warning">Important Notice</option>
            <option value="alert">Critical Urgent Alert</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className={styles.label}>Announcement Message *</label>
        </div>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder="e.g. Good day {first_name}! Notice for {shop_name}: our weekend cutting table dispatch window is open..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <div className={styles.placeholderHelpRow}>
          <span className={styles.placeholderHelpLabel}>1-Tap Personalization Slangs & Variables:</span>
          <div className={styles.placeholderPillGroup}>
            <button
              type="button"
              className={styles.placeholderPill}
              onClick={() => insertVariable('{shop_name}')}
              title="Replaces with the shop's registered business name"
            >
              + {'{shop_name}'}
            </button>
            <button
              type="button"
              className={styles.placeholderPill}
              onClick={() => insertVariable('{first_name}')}
              title="Replaces with recipient's first name (e.g. Daniel)"
            >
              + {'{first_name}'}
            </button>
            <button
              type="button"
              className={styles.placeholderPill}
              onClick={() => insertVariable('{name}')}
              title="Replaces with recipient's full name"
            >
              + {'{name}'}
            </button>
            <button
              type="button"
              className={styles.placeholderPill}
              onClick={() => insertVariable('{mode}')}
              title="Replaces with 'Bespoke', 'Ready-to-Wear', or 'Hybrid Fashion'"
            >
              + {'{mode}'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.formRow} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Target Shop Mode</label>
          <select
            className={styles.select}
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value as BroadcastPayload['targetMode'])}
          >
            <option value="all">All Modes (Bespoke, RTW & Hybrid)</option>
            <option value="bespoke">Bespoke Tailors Only</option>
            <option value="rtw">Ready-to-Wear Brands Only</option>
            <option value="hybrid">Hybrid Tailors Only</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Target Audience / Role</label>
          <select
            className={styles.select}
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value as BroadcastPayload['targetAudience'])}
          >
            <option value="all">Everyone (Shop Owners & Staff)</option>
            <option value="owners_only">Shop Owners / Managers Only</option>
            <option value="staff_only">Workshop Staff / Apprentices Only</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Subscription Plan</label>
          <select
            className={styles.select}
            value={targetPlan}
            onChange={(e) => setTargetPlan(e.target.value as BroadcastPayload['targetPlan'])}
          >
            <option value="all">All Plans (Free & Premium)</option>
            <option value="premium">Premium Subscribed Shops Only</option>
            <option value="free">Free Starter Plan Shops Only</option>
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Button Text (Optional)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Read Guidelines"
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Button Link URL (Optional)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. /settings/billing or https://..."
            value={actionHref}
            onChange={(e) => setActionHref(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.composerActions}>
        <button type="submit" className={styles.submitBtn} disabled={sending}>
          <Symbol name="send" size={16} />
          <span>{sending ? 'Dispatching Broadcast…' : 'Send to Tailor Shops'}</span>
        </button>
      </div>
    </form>
  );
}

