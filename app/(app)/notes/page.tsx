'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';

export type NoteCategory = 'shopping' | 'craft' | 'client' | 'general';

export interface WorkshopNote {
  id: string;
  text: string;
  category: NoteCategory;
  completed: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'mytailorbook_workshop_notes';

const NOTE_CATEGORIES: {
  key: NoteCategory;
  label: string;
  shortLabel: string;
  icon: string;
  placeholder: string;
}[] = [
  {
    key: 'shopping',
    label: 'Market & Haberdashery',
    shortLabel: 'Market List',
    icon: 'storefront',
    placeholder: 'Add thread, hidden zips, collar canvas…',
  },
  {
    key: 'craft',
    label: 'Machinist & Craft',
    shortLabel: 'Machinist',
    icon: 'content_cut',
    placeholder: 'Add stitching or pressing instruction…',
  },
  {
    key: 'client',
    label: 'Client Callbacks',
    shortLabel: 'Callbacks',
    icon: 'call',
    placeholder: 'Add customer styling confirmation…',
  },
  {
    key: 'general',
    label: 'Workshop Tasks',
    shortLabel: 'General',
    icon: 'notes',
    placeholder: 'Add general workshop errand or reminder…',
  },
];

const QUICK_PRESETS: { category: NoteCategory; text: string }[] = [
  { category: 'shopping', text: '5 cones matching thread (Black & Navy)' },
  { category: 'shopping', text: 'Pack of 7-inch hidden trouser zips' },
  { category: 'shopping', text: '2 yards medium collar canvas / stay' },
  { category: 'shopping', text: '1 packet matching suit buttons' },
  { category: 'craft', text: 'Double-stitch trouser crotch & inseam' },
  { category: 'craft', text: 'Steam-press inner collar before stitching' },
  { category: 'craft', text: 'Switch needle to size 11 for delicate silk' },
  { category: 'client', text: 'Call client to confirm sleeve cuff styling' },
  { category: 'client', text: 'Notify customer their garment is ready for fitting' },
  { category: 'general', text: 'Oil and service industrial sewing machines' },
];

const INITIAL_NOTES: WorkshopNote[] = [
  {
    id: 'note-1',
    text: '5 cones matching thread (Black, Royal Blue, Cream)',
    category: 'shopping',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    text: '2 rolls heavy collar canvas & pack of 7-inch YKK hidden zips',
    category: 'shopping',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-3',
    text: 'Double-stitch trouser crotch seams before attaching waistband',
    category: 'craft',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-4',
    text: 'Call client to confirm cuff style (french vs button) before cutting',
    category: 'client',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-5',
    text: 'Steam-press inner lining canvas on navy blazer',
    category: 'craft',
    completed: true,
    createdAt: new Date().toISOString(),
  },
];

export default function WorkshopNotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<WorkshopNote[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | NoteCategory>('all');
  const [showCompleted, setShowCompleted] = useState(true);

  // Inline Quick Add State
  const [inlineText, setInlineText] = useState('');
  const [inlineCategory, setInlineCategory] = useState<NoteCategory>('shopping');

  // BottomSheet State (For Presets & rich add)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalCategory, setModalCategory] = useState<NoteCategory>('shopping');

  const [loaded, setLoaded] = useState(false);

  // Sync category with activeTab when user switches tabs
  useEffect(() => {
    if (activeTab !== 'all') {
      setInlineCategory(activeTab);
      setModalCategory(activeTab);
    }
  }, [activeTab]);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setLoaded(true);
          return;
        }
      }
      setNotes(INITIAL_NOTES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTES));
    } catch (e) {
      console.error('Failed to load notes', e);
      setNotes(INITIAL_NOTES);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save notes to localStorage
  const saveNotes = (updated: WorkshopNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save notes', e);
    }
  };

  // Toggle completed
  const handleToggle = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, completed: !n.completed } : n
    );
    saveNotes(updated);
  };

  // Delete note
  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    showToast('Note removed', 'info');
  };

  // Clear completed
  const handleClearCompleted = () => {
    const remaining = notes.filter((n) => !n.completed);
    saveNotes(remaining);
    showToast('Completed items cleared', 'success');
  };

  // Inline Quick Add Submission
  const handleInlineAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineText.trim();
    if (!trimmed) return;

    const newNote: WorkshopNote = {
      id: `note-${Date.now()}`,
      text: trimmed,
      category: inlineCategory,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...notes]);
    setInlineText('');
    showToast('Added to list', 'success');
    inlineInputRef.current?.focus();
  };

  // Cycle inline category
  const cycleInlineCategory = () => {
    const categories: NoteCategory[] = ['shopping', 'craft', 'client', 'general'];
    const currentIndex = categories.indexOf(inlineCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    setInlineCategory(categories[nextIndex]);
  };

  // Modal Presets Add Submission
  const handleModalAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = modalText.trim();
    if (!trimmed) {
      showToast('Please type a note description', 'error');
      return;
    }

    const newNote: WorkshopNote = {
      id: `note-${Date.now()}`,
      text: trimmed,
      category: modalCategory,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...notes]);
    setModalText('');
    setIsPresetModalOpen(false);
    showToast('Note added to workshop list', 'success');
  };

  // 1-Tap WhatsApp Share for Market List / Tasks
  const handleShareWhatsApp = () => {
    const targetItems = notes.filter(
      (n) => !n.completed && (activeTab === 'all' || n.category === activeTab)
    );

    if (targetItems.length === 0) {
      showToast('No pending items to share', 'info');
      return;
    }

    const listTitle =
      activeTab === 'shopping'
        ? '*Workshop Market List*'
        : activeTab === 'craft'
        ? '*Machinist Instructions*'
        : activeTab === 'client'
        ? '*Client Callbacks*'
        : '*Workshop Action Items*';

    const text =
      `${listTitle} (${targetItems.length} items):\n\n` +
      targetItems.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n') +
      '\n\n— Sent from MyTailorBook Workshop';

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copy List to Clipboard
  const handleCopyList = () => {
    const targetItems = notes.filter(
      (n) => !n.completed && (activeTab === 'all' || n.category === activeTab)
    );

    if (targetItems.length === 0) {
      showToast('No pending items to copy', 'info');
      return;
    }

    const listTitle =
      activeTab === 'shopping'
        ? 'Workshop Market List'
        : activeTab === 'craft'
        ? 'Machinist Instructions'
        : activeTab === 'client'
        ? 'Client Callbacks'
        : 'Workshop Action Items';

    const text =
      `${listTitle} (${targetItems.length} items):\n\n` +
      targetItems.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n') +
      '\n\n— Sent from MyTailorBook Workshop';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('List copied to clipboard!', 'success');
    } else {
      showToast('Copying not supported on this device', 'error');
    }
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (activeTab === 'all') return notes;
    return notes.filter((n) => n.category === activeTab);
  }, [notes, activeTab]);

  // Pending vs Completed Split
  const pendingNotes = useMemo(() => filteredNotes.filter((n) => !n.completed), [filteredNotes]);
  const completedNotes = useMemo(() => filteredNotes.filter((n) => n.completed), [filteredNotes]);

  // Counts
  const totalPending = useMemo(() => notes.filter((n) => !n.completed).length, [notes]);
  const activeCategoryObj = useMemo(
    () => NOTE_CATEGORIES.find((c) => c.key === inlineCategory) || NOTE_CATEGORIES[0],
    [inlineCategory]
  );

  return (
    <PageLayout
      width="narrow"
      padding="none"
      header={
        <TopBar
          title="Workshop Notes"
          subtitle="Haberdashery shopping, craft reminders & client callbacks"
          showBack
          onBack={() => router.push(ROUTES.dashboard)}
        />
      }
    >
      <div className={styles.container}>
        {/* ── 1. COCKPIT HEADER ── */}
        <section className={styles.cockpitCard}>
          <div className={styles.cockpitTop}>
            <div className={styles.cockpitHeaderRow}>
              <div className={styles.cockpitTitleWrap}>
                <div className={styles.noteIconWrap}>
                  <Symbol name="notes" size={18} />
                </div>
                <span className={styles.cockpitEyebrow}>Workshop Action Items</span>
              </div>
              <span className={styles.statusBadge}>
                {totalPending} Pending
              </span>
            </div>

            <div className={styles.cockpitStatsRow}>
              <div className={styles.mainCountBlock}>
                <span className={styles.mainCountNumeral}>{totalPending}</span>
                <span className={styles.mainCountLabel}>items to do</span>
              </div>

              {/* Fast Action Buttons: WhatsApp & Copy */}
              <div className={styles.cockpitActions}>
                <button
                  type="button"
                  className={styles.actionPillBtn}
                  onClick={handleShareWhatsApp}
                  title="Send pending list via WhatsApp"
                  aria-label="Send pending list via WhatsApp"
                >
                  <Symbol name="chat" size={14} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className={styles.actionPillBtn}
                  onClick={handleCopyList}
                  title="Copy pending items to clipboard"
                  aria-label="Copy pending items to clipboard"
                >
                  <Symbol name="content_copy" size={14} />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. SINGLE STREAMLINED CATEGORY FILTER ── */}
        <div className={styles.segmentedWrap} role="tablist" aria-label="Filter Notes">
          <div className={styles.segmentedControl}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`${styles.segmentBtn} ${activeTab === 'all' ? styles.segmentActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All</span>
              <span className={styles.segmentCount}>{notes.filter((n) => !n.completed).length}</span>
            </button>
            {NOTE_CATEGORIES.map((c) => {
              const count = notes.filter((n) => n.category === c.key && !n.completed).length;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === c.key}
                  className={`${styles.segmentBtn} ${activeTab === c.key ? styles.segmentActive : ''}`}
                  onClick={() => setActiveTab(c.key)}
                >
                  <span>{c.shortLabel}</span>
                  <span className={styles.segmentCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. INSTANT INLINE QUICK-ADD DOCK ── */}
        <form onSubmit={handleInlineAdd} className={styles.quickAddDock}>
          <button
            type="button"
            className={styles.dockCategoryChip}
            onClick={cycleInlineCategory}
            title="Tap to change category"
          >
            <Symbol name={activeCategoryObj.icon} size={15} />
            <span>{activeCategoryObj.shortLabel}</span>
          </button>

          <input
            ref={inlineInputRef}
            type="text"
            className={styles.dockInput}
            placeholder={activeCategoryObj.placeholder}
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
          />

          <button
            type="submit"
            className={styles.dockAddBtn}
            disabled={!inlineText.trim()}
            aria-label="Add note"
            title="Add note"
          >
            <Symbol name="add" size={18} />
          </button>

          <button
            type="button"
            className={styles.dockPresetBtn}
            onClick={() => setIsPresetModalOpen(true)}
            title="Tailor Presets & Ideas"
            aria-label="Tailor Presets & Ideas"
          >
            <Symbol name="auto_awesome" size={17} />
          </button>
        </form>

        {/* ── 4. PENDING ACTION ITEMS ── */}
        <section className={styles.listSection}>
          <div className={styles.listHeaderRow}>
            <h3 className={styles.listSectionTitle}>
              {activeTab === 'all'
                ? 'Pending Tasks'
                : NOTE_CATEGORIES.find((c) => c.key === activeTab)?.label || 'Tasks'}
            </h3>
            <span className={styles.listMutedSummary}>
              {pendingNotes.length} {pendingNotes.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {!loaded ? (
            <div className={styles.loadingState}>
              <Symbol name="progress_activity" size={24} className="global-spinner" />
              <p>Loading workshop notes…</p>
            </div>
          ) : pendingNotes.length === 0 ? (
            <div className={styles.emptyContainer}>
              <EmptyState
                icon={<Symbol name="checklist" size={32} />}
                title="All Clear in this Section"
                description="Type above to quickly jot down spools of thread, machinist reminders, or customer checks."
                action={{
                  label: 'Browse Tailor Presets',
                  onClick: () => setIsPresetModalOpen(true),
                }}
              />
            </div>
          ) : (
            <div className={styles.notesCard}>
              {pendingNotes.map((note) => {
                const catObj = NOTE_CATEGORIES.find((c) => c.key === note.category);
                return (
                  <div key={note.id} className={styles.noteRow}>
                    {/* 44px Touch Target Checkbox */}
                    <button
                      type="button"
                      className={styles.checkBtn}
                      onClick={() => handleToggle(note.id)}
                      aria-label="Mark completed"
                    >
                      <Symbol
                        name="radio_button_unchecked"
                        size={22}
                        className={styles.uncheckedIcon}
                      />
                    </button>

                    {/* Note Content */}
                    <div
                      className={styles.noteContentWrap}
                      onClick={() => handleToggle(note.id)}
                    >
                      <span className={styles.noteText}>{note.text}</span>
                      <div className={styles.noteMeta}>
                        <span className={styles.categoryBadge}>
                          <Symbol name={catObj?.icon || 'notes'} size={12} />
                          <span>{catObj?.shortLabel || 'General'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(note.id)}
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Symbol name="delete" size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 5. COMPLETED ITEMS TRAY ── */}
        {completedNotes.length > 0 && (
          <section className={styles.completedSection}>
            <div className={styles.completedHeaderRow}>
              <button
                type="button"
                className={styles.completedToggleBtn}
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <Symbol name={showCompleted ? 'expand_less' : 'expand_more'} size={18} />
                <span>Done ({completedNotes.length})</span>
              </button>

              <button
                type="button"
                className={styles.clearDoneBtn}
                onClick={handleClearCompleted}
              >
                Clear All Done
              </button>
            </div>

            {showCompleted && (
              <div className={styles.completedCard}>
                {completedNotes.map((note) => {
                  const catObj = NOTE_CATEGORIES.find((c) => c.key === note.category);
                  return (
                    <div key={note.id} className={styles.completedRow}>
                      <button
                        type="button"
                        className={styles.checkBtn}
                        onClick={() => handleToggle(note.id)}
                        aria-label="Mark uncompleted"
                      >
                        <Symbol
                          name="check_circle"
                          size={22}
                          className={styles.checkedIcon}
                        />
                      </button>

                      <div
                        className={styles.noteContentWrap}
                        onClick={() => handleToggle(note.id)}
                      >
                        <span className={styles.completedNoteText}>{note.text}</span>
                        <div className={styles.noteMeta}>
                          <span className={styles.categoryBadge}>
                            <Symbol name={catObj?.icon || 'notes'} size={12} />
                            <span>{catObj?.shortLabel || 'General'}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(note.id)}
                        aria-label="Delete note"
                        title="Delete note"
                      >
                        <Symbol name="delete" size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── 6. TAILOR PRESETS BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title="Tailor Presets & Ideas"
      >
        <form onSubmit={handleModalAdd} className={styles.modalForm}>
          {/* Category Selector */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Category</label>
            <div className={styles.categoryChips}>
              {NOTE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.categoryChip} ${modalCategory === c.key ? styles.categoryChipActive : ''}`}
                  onClick={() => setModalCategory(c.key)}
                >
                  <Symbol name={c.icon} size={15} />
                  <span>{c.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tap to Fill</label>
            <div className={styles.presetChips}>
              {QUICK_PRESETS.filter((p) => p.category === modalCategory).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => setModalText(p.text)}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="modalNoteTextInput">
              Custom Description
            </label>
            <textarea
              id="modalNoteTextInput"
              rows={3}
              className={styles.textArea}
              placeholder="e.g. 5 spools royal blue thread, YKK hidden zips"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Modal Actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setIsPresetModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={!modalText.trim()}
            >
              Add Note
            </button>
          </div>
        </form>
      </BottomSheet>
    </PageLayout>
  );
}
