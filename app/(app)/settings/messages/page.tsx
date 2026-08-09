'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import { ORDER_STATUSES, STATUS_CONFIG } from '@/lib/constants';
import { DEFAULT_STAGE_MESSAGES } from '@/lib/formatters';
import type { OrderStatus } from '@/lib/types';
import styles from './page.module.css';

export default function MessageTemplatesSettingsPage() {
  const router = useRouter();
  const { currentShop, updateShop } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [activeStage, setActiveStage] = useState<OrderStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const templates = currentShop?.stageMessageTemplates || {};

  const openNoteEditor = () => {
    setNoteDraft(currentShop?.outreachTemplate || `Hi {name}, thought you'd love this style!`);
    setEditingNote(true);
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await updateShop({ outreachTemplate: noteDraft });
      showToast('Message template saved', 'success');
      setEditingNote(false);
    } finally {
      setSavingNote(false);
    }
  };

  const openStageSheet = (stage: OrderStatus) => {
    setActiveStage(stage);
    setDraft(templates[stage] || DEFAULT_STAGE_MESSAGES[stage]);
  };

  const handleSave = async () => {
    if (!activeStage) return;
    setSaving(true);
    try {
      await updateShop({ stageMessageTemplates: { ...templates, [activeStage]: draft } });
      showToast('Message saved', 'success');
      setActiveStage(null);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (!activeStage) return;
    setDraft(DEFAULT_STAGE_MESSAGES[activeStage]);
  };

  const handleToggleTrackingDefault = async (checked: boolean) => {
    try {
      await updateShop({ defaultTrackingLinkEnabled: checked });
    } catch {
      showToast('Could not update this setting', 'error');
    }
  };

  return (
    <PageLayout width="narrow" header={<TopBar title="Order Update Messages" showBack={!isDesktop} onBack={() => router.push("/settings")} />}>
      <p className={styles.intro}>
        Customize the WhatsApp update sent at each stage. Untouched stages keep the app&apos;s default wording.
      </p>

      <div className={styles.card}>
        <button type="button" className={styles.row} onClick={openNoteEditor}>
          <span className={styles.subtitle} style={{ flex: 'none', color: 'var(--sf-text-primary)', fontWeight: 'var(--sf-weight-medium)' }}>
            Reach-Out Note Template
          </span>
          <span className={styles.subtitle}>
            {(currentShop?.outreachTemplate || 'Using default').slice(0, 40)}
          </span>
          <Symbol name="chevron_right" size={18} className={styles.chevron} />
        </button>
      </div>

      <div className={styles.card}>
        <label className={styles.toggleRow}>
          <span>
            <span className={styles.toggleLabel}>Include tracking link by default</span>
            <span className={styles.toggleHint}>
              New orders start with this setting — each order can still override it individually.
            </span>
          </span>
          <input
            type="checkbox"
            checked={currentShop?.defaultTrackingLinkEnabled ?? true}
            onChange={(e) => handleToggleTrackingDefault(e.target.checked)}
          />
        </label>
      </div>

      <div className={styles.card}>
        {ORDER_STATUSES.map((stage) => (
          <button key={stage} type="button" className={styles.row} onClick={() => openStageSheet(stage)}>
            <Badge variant={stage.toLowerCase() as Lowercase<OrderStatus>}>{STATUS_CONFIG[stage].label}</Badge>
            <span className={styles.subtitle}>
              {(templates[stage] || DEFAULT_STAGE_MESSAGES[stage]).slice(0, 40)}…
            </span>
            <Symbol name="chevron_right" size={18} className={styles.chevron} />
          </button>
        ))}
      </div>

      <BottomSheet
        isOpen={!!activeStage}
        onClose={() => setActiveStage(null)}
        title={activeStage ? `${STATUS_CONFIG[activeStage].label} Message` : undefined}
        variant="modal"
      >
        <div className={styles.sheetBody}>
          <textarea className={styles.textarea} value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} />
          <p className={styles.hintText}>
            {'{name}'}, {'{shop}'}, and {'{link}'} will be filled in automatically.
          </p>
          <button type="button" className={styles.resetLink} onClick={handleResetDefault}>
            Reset to Default
          </button>
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setActiveStage(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Save Message</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={editingNote} onClose={() => setEditingNote(false)} title="Reach-Out Message" variant="modal">
        <div className={styles.sheetBody}>
          <textarea className={styles.textarea} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} />
          <p className={styles.hintText}>Use {'{name}'} and it&apos;ll be replaced with the customer&apos;s name.</p>
          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setEditingNote(false)}>Cancel</Button>
            <Button variant="primary" loading={savingNote} onClick={handleSaveNote}>Save Template</Button>
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
