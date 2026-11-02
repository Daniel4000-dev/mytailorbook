'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  description: string;
}[] = [
  {
    key: 'shopping',
    label: 'Market & Haberdashery',
    shortLabel: 'Market List',
    icon: 'storefront',
    description: 'Threads, zips, interfacing, lining & buttons',
  },
  {
    key: 'craft',
    label: 'Machinist & Craft',
    shortLabel: 'Machinist',
    icon: 'content_cut',
    description: 'Stitching notes, iron pressing & needle guidelines',
  },
  {
    key: 'client',
    label: 'Client Callbacks',
    shortLabel: 'Callbacks',
    icon: 'call',
    description: 'Styling confirmations, fitting dates & pick-ups',
  },
  {
    key: 'general',
    label: 'Workshop Tasks',
    shortLabel: 'General',
    icon: 'notes',
    description: 'Machine maintenance, supplies & shop tasks',
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

  const [notes, setNotes] = useState<WorkshopNote[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | NoteCategory>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('shopping');
  const [loaded, setLoaded] = useState(false);

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

  // Add note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) {
      showToast('Please type a note description', 'error');
      return;
    }

    const newNote: WorkshopNote = {
      id: `note-${Date.now()}`,
      text: trimmed,
      category: newCategory,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...notes]);
    setNewText('');
    setIsModalOpen(false);
    showToast('Note added to workshop list', 'success');
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (activeTab === 'all') return notes;
    return notes.filter((n) => n.category === activeTab);
  }, [notes, activeTab]);

  // Counts
  const pendingCount = useMemo(() => notes.filter((n) => !n.completed).length, [notes]);
  const completedCount = useMemo(() => notes.filter((n) => n.completed).length, [notes]);

  const shoppingCount = useMemo(
    () => notes.filter((n) => n.category === 'shopping' && !n.completed).length,
    [notes]
  );
  const craftCount = useMemo(
    () => notes.filter((n) => n.category === 'craft' && !n.completed).length,
    [notes]
  );
  const clientCount = useMemo(
    () => notes.filter((n) => n.category === 'client' && !n.completed).length,
    [notes]
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
        {/* ── 1. COCKPIT SUMMARY ── */}
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
                {pendingCount} Pending
              </span>
            </div>

            <div className={styles.cockpitStatsRow}>
              <div className={styles.mainCountBlock}>
                <span className={styles.mainCountNumeral}>{pendingCount}</span>
                <span className={styles.mainCountLabel}>to do</span>
              </div>
              {completedCount > 0 && (
                <button
                  type="button"
                  className={styles.clearCompletedBtn}
                  onClick={handleClearCompleted}
                >
                  <Symbol name="delete" size={14} />
                  <span>Clear {completedCount} Done</span>
                </button>
              )}
            </div>
          </div>

          <div className={styles.cockpitDivider} />

          <div className={styles.cockpitShelf}>
            <button
              type="button"
              className={`${styles.shelfColBtn} ${activeTab === 'shopping' ? styles.shelfActive : ''}`}
              onClick={() => setActiveTab('shopping')}
            >
              <div className={styles.shelfIconRow}>
                <Symbol name="storefront" size={14} />
                <span className={styles.shelfLabel}>Market List</span>
              </div>
              <span className={styles.shelfValue}>{shoppingCount} items</span>
              <span className={styles.shelfSubtext}>Thread, zips, lining</span>
            </button>

            <button
              type="button"
              className={`${styles.shelfColBtn} ${activeTab === 'craft' ? styles.shelfActive : ''}`}
              onClick={() => setActiveTab('craft')}
            >
              <div className={styles.shelfIconRow}>
                <Symbol name="content_cut" size={14} />
                <span className={styles.shelfLabel}>Machinist</span>
              </div>
              <span className={styles.shelfValue}>{craftCount} items</span>
              <span className={styles.shelfSubtext}>Stitching &amp; ironing</span>
            </button>

            <button
              type="button"
              className={`${styles.shelfColBtn} ${activeTab === 'client' ? styles.shelfActive : ''}`}
              onClick={() => setActiveTab('client')}
            >
              <div className={styles.shelfIconRow}>
                <Symbol name="call" size={14} />
                <span className={styles.shelfLabel}>Callbacks</span>
              </div>
              <span className={styles.shelfValue}>{clientCount} items</span>
              <span className={styles.shelfSubtext}>Styling &amp; fittings</span>
            </button>
          </div>
        </section>

        {/* ── 2. ADD NOTE ACTION BUTTON ── */}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => setIsModalOpen(true)}
          >
            <Symbol name="add" size={17} />
            <span>Add Workshop Note</span>
          </button>
        </div>

        {/* ── 3. SEGMENTED FILTER ── */}
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
              <span className={styles.segmentCount}>{notes.length}</span>
            </button>
            {NOTE_CATEGORIES.map((c) => {
              const count = notes.filter((n) => n.category === c.key).length;
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

        {/* ── 4. NOTES LIST ── */}
        <section className={styles.listSection}>
          <div className={styles.listHeaderRow}>
            <h3 className={styles.listSectionTitle}>
              {activeTab === 'all'
                ? 'All Notes'
                : NOTE_CATEGORIES.find((c) => c.key === activeTab)?.label || 'Notes'}
            </h3>
            <span className={styles.listMutedSummary}>
              {filteredNotes.length} {filteredNotes.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {!loaded ? (
            <div className={styles.loadingState}>
              <Symbol name="progress_activity" size={24} className="global-spinner" />
              <p>Loading workshop notes…</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className={styles.emptyContainer}>
              <EmptyState
                icon={<Symbol name="checklist" size={32} />}
                title="No Notes in this Category"
                description="Keep your cutting table and machinists organized by adding market items or craft instructions."
                action={{
                  label: 'Add Note',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            </div>
          ) : (
            <div className={styles.notesCard}>
              {filteredNotes.map((note) => {
                const catObj = NOTE_CATEGORIES.find((c) => c.key === note.category);
                return (
                  <div
                    key={note.id}
                    className={`${styles.noteRow} ${note.completed ? styles.noteRowDone : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.checkBtn}
                      onClick={() => handleToggle(note.id)}
                      aria-label={note.completed ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      <Symbol
                        name={note.completed ? 'check_circle' : 'radio_button_unchecked'}
                        size={20}
                        className={note.completed ? styles.checkedIcon : styles.uncheckedIcon}
                      />
                    </button>

                    <div className={styles.noteContentWrap} onClick={() => handleToggle(note.id)}>
                      <span className={styles.noteText}>{note.text}</span>
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
                    >
                      <Symbol name="delete" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── 5. ADD NOTE BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Workshop Note"
      >
        <form onSubmit={handleAddNote} className={styles.modalForm}>
          {/* Category Selector */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Workshop Category</label>
            <div className={styles.categoryChips}>
              {NOTE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.categoryChip} ${newCategory === c.key ? styles.categoryChipActive : ''}`}
                  onClick={() => setNewCategory(c.key)}
                >
                  <Symbol name={c.icon} size={15} />
                  <span>{c.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tailor Presets (1-Tap Fill)</label>
            <div className={styles.presetChips}>
              {QUICK_PRESETS.filter((p) => p.category === newCategory).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => setNewText(p.text)}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="noteTextInput">
              Note / Task Description
            </label>
            <textarea
              id="noteTextInput"
              rows={3}
              className={styles.textArea}
              placeholder="e.g. 5 spools royal blue thread, YKK hidden zips, double-stitch crotch"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Modal Actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={!newText.trim()}
            >
              Add Note
            </button>
          </div>
        </form>
      </BottomSheet>
    </PageLayout>
  );
}
