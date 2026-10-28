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
import { DEFAULT_STAGE_MESSAGES, DEFAULT_EVENT_PHOTO_MESSAGE } from '@/lib/formatters';
import type { OrderStatus } from '@/lib/types';
import { ROUTES } from '@/lib/routes';
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

  const [editingEventPhoto, setEditingEventPhoto] = useState(false);
  const [eventPhotoDraft, setEventPhotoDraft] = useState('');
  const [savingEventPhoto, setSavingEventPhoto] = useState(false);

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

  const openEventPhotoEditor = () => {
    setEventPhotoDraft(currentShop?.eventPhotoTemplate || DEFAULT_EVENT_PHOTO_MESSAGE);
    setEditingEventPhoto(true);
  };

  const handleSaveEventPhoto = async () => {
    setSavingEventPhoto(true);
    try {
      await updateShop({ eventPhotoTemplate: eventPhotoDraft });
      showToast('Event photo template saved', 'success');
      setEditingEventPhoto(false);
    } finally {
      setSavingEventPhoto(false);
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

  const insertVariable = (token: string, mode: 'stage' | 'note' | 'event' = 'stage') => {
    if (mode === 'note') {
      setNoteDraft((prev) => `${prev} ${token}`);
    } else if (mode === 'event') {
      setEventPhotoDraft((prev) => `${prev} ${token}`);
    } else {
      setDraft((prev) => `${prev} ${token}`);
    }
  };

  const getRenderedPreview = (text: string) => {
    const studioName = currentShop?.name || 'House of Savile';
    const ig = currentShop?.socialLinks?.instagram || '@houseofsavile';
    const cleanIg = ig.startsWith('@') ? ig : `@${ig}`;
    const tiktok = currentShop?.socialLinks?.tiktok || '@houseofsavile';
    const cleanTiktok = tiktok.startsWith('@') ? tiktok : `@${tiktok}`;
    const web = currentShop?.socialLinks?.website || 'savile.atelier.ng';
    const bank = currentShop?.bankDetails?.bankName
      ? `${currentShop.bankDetails.bankName} - ${currentShop.bankDetails.accountNumber || '0123456789'}`
      : 'Access Bank - 0123456789';

    return text
      .replace(/\{name\}/g, 'Chief Emeka')
      .replace(/\{shop\}/g, studioName)
      .replace(/\{link\}/g, `mytailorbook.com/t/ord_204`)
      .replace(/\{orderId\}/g, 'ORD-204')
      .replace(/\{instagram\}/g, cleanIg)
      .replace(/\{handle\}/g, cleanIg)
      .replace(/\{tiktok\}/g, cleanTiktok)
      .replace(/\{website\}/g, web)
      .replace(/\{bank_details\}/g, bank);
  };

  return (
    <PageLayout
      width="narrow"
      header={
        <TopBar
          title="Order Update Messages"
          showBack={!isDesktop}
          onBack={() => router.push(ROUTES.settings)}
        />
      }
    >
      <p className={styles.intro}>
        Customize the automated WhatsApp messages sent to clients across each bespoke stage. Untouched stages keep the atelier default wording.
      </p>

      <div className={styles.card}>
        <button type="button" className={styles.row} onClick={openNoteEditor}>
          <span className={styles.subtitle} style={{ flex: 'none', color: 'var(--sf-text-primary)', fontWeight: 'var(--sf-weight-medium)' }}>
            Reach-Out Note Template
          </span>
          <span className={styles.subtitle}>
            {(currentShop?.outreachTemplate || 'Using default').slice(0, 36)}
          </span>
          <Symbol name="chevron_right" size={18} className={styles.chevron} />
        </button>

        <button type="button" className={styles.row} onClick={openEventPhotoEditor}>
          <span className={styles.subtitle} style={{ flex: 'none', color: 'var(--sf-text-primary)', fontWeight: 'var(--sf-weight-medium)' }}>
            Event Photo Request Template
          </span>
          <span className={styles.subtitle}>
            {(currentShop?.eventPhotoTemplate || 'Using default').slice(0, 36)}
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
              {(templates[stage] || DEFAULT_STAGE_MESSAGES[stage]).slice(0, 40)}...
            </span>
            <Symbol name="chevron_right" size={18} className={styles.chevron} />
          </button>
        ))}
      </div>

      {/* Stage Message Editor Sheet */}
      <BottomSheet
        isOpen={!!activeStage}
        onClose={() => setActiveStage(null)}
        title={activeStage ? `${STATUS_CONFIG[activeStage].label} Message` : undefined}
        variant="modal"
      >
        <div className={styles.sheetBody}>
          {/* Quick variable chips */}
          <div className={styles.variableChipsSection}>
            <span className={styles.variableChipsLabel}>Quick Insert Variable</span>
            <div className={styles.variableChipsRow}>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{name}', 'stage')}
              >
                + Client Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{shop}', 'stage')}
              >
                + Studio Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{instagram}', 'stage')}
              >
                + Instagram
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{bank_details}', 'stage')}
              >
                + Bank Details
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{link}', 'stage')}
              >
                + Tracking Link
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{orderId}', 'stage')}
              >
                + Order Number
              </button>
            </div>
          </div>

          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
          />

          {/* Live WhatsApp chat bubble simulation */}
          <div className={styles.chatPreviewSection}>
            <span className={styles.chatPreviewLabel}>Live Client WhatsApp Preview</span>
            <div className={styles.chatPreviewWrap}>
              <div className={styles.chatBubble}>
                <div>{getRenderedPreview(draft) || 'Message preview will appear here...'}</div>
                <div className={styles.chatMeta}>
                  <span>14:32</span>
                  <span className={styles.chatTicks}>vv</span>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className={styles.resetLink} onClick={handleResetDefault}>
            Reset to Atelier Default
          </button>

          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setActiveStage(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Message
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Reach-Out Note Editor Sheet */}
      <BottomSheet
        isOpen={editingNote}
        onClose={() => setEditingNote(false)}
        title="Reach-Out Message"
        variant="modal"
      >
        <div className={styles.sheetBody}>
          <div className={styles.variableChipsSection}>
            <span className={styles.variableChipsLabel}>Quick Insert Variable</span>
            <div className={styles.variableChipsRow}>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{name}', 'note')}
              >
                + Client Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{shop}', 'note')}
              >
                + Studio Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{instagram}', 'note')}
              >
                + Instagram
              </button>
            </div>
          </div>

          <textarea
            className={styles.textarea}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
          />

          <div className={styles.chatPreviewSection}>
            <span className={styles.chatPreviewLabel}>Live Client WhatsApp Preview</span>
            <div className={styles.chatPreviewWrap}>
              <div className={styles.chatBubble}>
                <div>{getRenderedPreview(noteDraft) || 'Message preview will appear here...'}</div>
                <div className={styles.chatMeta}>
                  <span>14:32</span>
                  <span className={styles.chatTicks}>vv</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setEditingNote(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={savingNote} onClick={handleSaveNote}>
              Save Template
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Event Photo Request Editor Sheet */}
      <BottomSheet
        isOpen={editingEventPhoto}
        onClose={() => setEditingEventPhoto(false)}
        title="Event Photo Request Template"
        variant="modal"
      >
        <div className={styles.sheetBody}>
          <div className={styles.variableChipsSection}>
            <span className={styles.variableChipsLabel}>Quick Insert Variable</span>
            <div className={styles.variableChipsRow}>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{name}', 'event')}
              >
                + Client Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{shop}', 'event')}
              >
                + Studio Name
              </button>
              <button
                type="button"
                className={styles.variableChip}
                onClick={() => insertVariable('{instagram}', 'event')}
              >
                + Instagram
              </button>
            </div>
          </div>

          <textarea
            className={styles.textarea}
            value={eventPhotoDraft}
            onChange={(e) => setEventPhotoDraft(e.target.value)}
            rows={4}
          />

          <div className={styles.chatPreviewSection}>
            <span className={styles.chatPreviewLabel}>Live Client WhatsApp Preview</span>
            <div className={styles.chatPreviewWrap}>
              <div className={styles.chatBubble}>
                <div>{getRenderedPreview(eventPhotoDraft) || 'Message preview will appear here...'}</div>
                <div className={styles.chatMeta}>
                  <span>14:32</span>
                  <span className={styles.chatTicks}>vv</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.resetLink}
            onClick={() => setEventPhotoDraft(DEFAULT_EVENT_PHOTO_MESSAGE)}
          >
            Reset to Atelier Default
          </button>

          <div className={styles.sheetActions}>
            <Button variant="ghost" onClick={() => setEditingEventPhoto(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={savingEventPhoto} onClick={handleSaveEventPhoto}>
              Save Template
            </Button>
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
