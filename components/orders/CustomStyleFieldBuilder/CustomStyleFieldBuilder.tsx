'use client';

import { useState, type DragEvent } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './CustomStyleFieldBuilder.module.css';

export interface CustomMeasureField {
  id: string;
  label: string;
}

interface CustomStyleFieldBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  styleName: string;
  initialFields?: CustomMeasureField[];
  onSave: (fields: CustomMeasureField[]) => void;
}

/** Named, ordered measurement-field list for one custom garment style —
 *  since custom styles have no built-in body-diagram, this is what
 *  replaces the generic 8-point default with something the shop actually
 *  measures for that exact item. Reorder is plain native HTML5 drag and
 *  drop, matching the Kanban board's convention elsewhere in this app. */
export default function CustomStyleFieldBuilder({
  isOpen,
  onClose,
  styleName,
  initialFields = [],
  onSave,
}: CustomStyleFieldBuilderProps) {
  const [fields, setFields] = useState<CustomMeasureField[]>(initialFields);
  const [draft, setDraft] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Reset whenever the sheet (re)opens for a style, mirroring the reset
  // pattern used by StyleProfileSheet for the same reason — this sheet is
  // reused across different custom styles without unmounting.
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = isOpen ? styleName : null;
  if (isOpen && openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setFields(initialFields);
    setDraft('');
  } else if (!isOpen && prevOpenKey !== null) {
    setPrevOpenKey(null);
  }

  const addField = () => {
    const label = draft.trim();
    if (!label) return;
    setFields((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    setDraft('');
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (overId: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    setFields((prev) => {
      const fromIndex = prev.findIndex((f) => f.id === draggedId);
      const toIndex = prev.findIndex((f) => f.id === overId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSave = () => {
    onSave(fields);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${styleName} — Measurement Fields`}
      footer={
        <Button variant="primary" fullWidth onClick={handleSave} disabled={fields.length === 0}>
          Save Fields
        </Button>
      }
    >
      <p className={styles.hint}>
        Add the measurements you&apos;ll take for this style, in the order you take them. Drag to reorder.
      </p>

      <div className={styles.fieldList}>
        {fields.map((field) => (
          <div
            key={field.id}
            className={`${styles.fieldRow} ${draggedId === field.id ? styles.dragging : ''}`}
            draggable
            onDragStart={handleDragStart(field.id)}
            onDragOver={handleDragOver(field.id)}
            onDragEnd={() => setDraggedId(null)}
          >
            <span className={styles.dragHandle}>
              <Symbol name="drag_indicator" size={20} />
            </span>
            <span className={styles.fieldLabel}>{field.label}</span>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => removeField(field.id)}
              aria-label={`Remove ${field.label}`}
            >
              <Symbol name="close" size={18} />
            </button>
          </div>
        ))}

        {fields.length === 0 && (
          <div className={styles.emptyState}>No fields yet — add your first one below.</div>
        )}
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="e.g. Cuff Width"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addField();
            }
          }}
        />
        <button type="button" className={styles.addBtn} onClick={addField} disabled={!draft.trim()}>
          <Symbol name="add" size={20} />
        </button>
      </div>
    </BottomSheet>
  );
}
