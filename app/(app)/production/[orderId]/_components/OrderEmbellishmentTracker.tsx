'use client';

import { useState, useMemo } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import { formatCurrency, formatDate, getWhatsAppLink } from '@/lib/formatters';
import type { Order } from '@/lib/types';
import styles from './OrderEmbellishmentTracker.module.css';

interface EmbellishmentData {
  type: string;
  artisan: string;
  phone?: string;
  due?: string;
  status: 'With Artisan' | 'Returned & Inspected';
  timing: 'Before Sewing' | 'After Sewing' | 'At Fitting';
  cost?: number;
  notes?: string;
}

interface OrderEmbellishmentTrackerProps {
  order: Order;
  onUpdateOrderDetails: (newOrderDetails: string) => Promise<void>;
  currency?: string;
}

const EMBELLISHMENT_REGEX = /\[Embellishment:\s*([^|\]]+)(?:\|[^\]]*)?\]/i;

export function parseEmbellishmentData(orderDetails: string): EmbellishmentData | null {
  const match = orderDetails.match(/\[Embellishment:\s*([^\]]+)\]/i);
  if (!match) return null;

  const raw = match[1];
  const parts = raw.split('|').map((p) => p.trim());
  const type = parts[0] || 'Hand Beading';

  let artisan = '';
  let phone = '';
  let due = '';
  let status: 'With Artisan' | 'Returned & Inspected' = 'With Artisan';
  let timing: 'Before Sewing' | 'After Sewing' | 'At Fitting' = 'Before Sewing';
  let cost: number | undefined;
  let notes = '';

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;

    const key = part.slice(0, colonIdx).trim().toLowerCase();
    const val = part.slice(colonIdx + 1).trim();

    if (key === 'artisan') artisan = val;
    else if (key === 'phone') phone = val;
    else if (key === 'due') due = val;
    else if (key === 'status') {
      if (val.toLowerCase().includes('returned') || val.toLowerCase().includes('inspected')) {
        status = 'Returned & Inspected';
      } else {
        status = 'With Artisan';
      }
    } else if (key === 'timing') {
      if (val.toLowerCase().includes('after')) timing = 'After Sewing';
      else if (val.toLowerCase().includes('fitting')) timing = 'At Fitting';
      else timing = 'Before Sewing';
    } else if (key === 'cost') {
      const parsed = parseInt(val.replace(/,/g, ''), 10);
      if (!isNaN(parsed)) cost = parsed;
    } else if (key === 'notes') {
      notes = val;
    }
  }

  return { type, artisan, phone, due, status, timing, cost, notes };
}

export function serializeEmbellishmentData(data: EmbellishmentData): string {
  const parts = [`Embellishment: ${data.type}`];
  if (data.timing) parts.push(`Timing: ${data.timing}`);
  if (data.artisan) parts.push(`Artisan: ${data.artisan}`);
  if (data.phone) parts.push(`Phone: ${data.phone}`);
  if (data.due) parts.push(`Due: ${data.due}`);
  parts.push(`Status: ${data.status}`);
  if (data.cost !== undefined && data.cost !== null && !isNaN(data.cost)) {
    parts.push(`Cost: ${data.cost}`);
  }
  if (data.notes) parts.push(`Notes: ${data.notes}`);

  return `[${parts.join(' | ')}]`;
}

export function updateOrderDetailsWithEmbellishment(
  currentDetails: string,
  data: EmbellishmentData | null
): string {
  const existingMatch = currentDetails.match(/\[Embellishment:[^\]]+\]/i);

  if (!data) {
    // Remove tag
    return currentDetails.replace(/\[Embellishment:[^\]]+\]/i, '').trim();
  }

  const serialized = serializeEmbellishmentData(data);
  if (existingMatch) {
    return currentDetails.replace(/\[Embellishment:[^\]]+\]/i, serialized);
  }

  return `${currentDetails.trim()} ${serialized}`.trim();
}

const TYPE_PRESETS = [
  'Hand Beading & Stoning',
  'Computer Embroidery',
  'Chain-Stitch Embroidery',
  'Collar & Cuff Beading',
  'Monogram & Crest',
  'Aso-Oke Patterning',
];

const TIMING_OPTIONS: { value: 'Before Sewing' | 'After Sewing' | 'At Fitting'; label: string }[] = [
  { value: 'Before Sewing', label: 'Before Sewing (Flat Panels)' },
  { value: 'After Sewing', label: 'After Sewing (Assembled Garment)' },
  { value: 'At Fitting', label: 'At Fitting Stage' },
];

export default function OrderEmbellishmentTracker({
  order,
  onUpdateOrderDetails,
  currency,
}: OrderEmbellishmentTrackerProps) {
  const data = useMemo(() => parseEmbellishmentData(order.orderDetails), [order.orderDetails]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formType, setFormType] = useState('Hand Beading & Stoning');
  const [formTiming, setFormTiming] = useState<'Before Sewing' | 'After Sewing' | 'At Fitting'>('Before Sewing');
  const [formArtisan, setFormArtisan] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formStatus, setFormStatus] = useState<'With Artisan' | 'Returned & Inspected'>('With Artisan');
  const [formCost, setFormCost] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const startEdit = () => {
    if (data) {
      setFormType(data.type);
      setFormTiming(data.timing);
      setFormArtisan(data.artisan);
      setFormPhone(data.phone || '');
      setFormDue(data.due || '');
      setFormStatus(data.status);
      setFormCost(data.cost !== undefined ? String(data.cost) : '');
      setFormNotes(data.notes || '');
    } else {
      setFormType('Hand Beading & Stoning');
      setFormTiming('Before Sewing');
      setFormArtisan('');
      setFormPhone('');
      setFormDue('');
      setFormStatus('With Artisan');
      setFormCost('');
      setFormNotes('');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedCost = parseInt(formCost.replace(/,/g, ''), 10);
      const updatedData: EmbellishmentData = {
        type: formType.trim() || 'Hand Beading',
        timing: formTiming,
        artisan: formArtisan.trim(),
        phone: formPhone.trim() || undefined,
        due: formDue || undefined,
        status: formStatus,
        cost: !isNaN(parsedCost) && parsedCost > 0 ? parsedCost : undefined,
        notes: formNotes.trim() || undefined,
      };

      const newDetails = updateOrderDetailsWithEmbellishment(order.orderDetails, updatedData);
      await onUpdateOrderDetails(newDetails);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'With Artisan' | 'Returned & Inspected') => {
    if (!data) return;
    setSaving(true);
    try {
      const updatedData: EmbellishmentData = {
        ...data,
        status: newStatus,
      };
      const newDetails = updateOrderDetailsWithEmbellishment(order.orderDetails, updatedData);
      await onUpdateOrderDetails(newDetails);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove embellishment and beading tracker from this order?')) return;
    setSaving(true);
    try {
      const newDetails = updateOrderDetailsWithEmbellishment(order.orderDetails, null);
      await onUpdateOrderDetails(newDetails);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const orderRef = order.id.slice(0, 4).toUpperCase();
  const whatsappCheckInMessage = data?.artisan
    ? `Hello ${data.artisan}, checking in from the atelier regarding the ${data.type} for order #${orderRef}. Please let us know when it will be ready for pickup.`
    : `Hello, checking in on the ${data?.type || 'embellishment'} for order #${orderRef}.`;

  return (
    <section className={styles.card}>
      <div className={styles.cardFresnel} />

      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <Symbol name="diamond" size={16} style={{ color: '#C4B5FD' }} />
            <h3 className={styles.cardTitle}>Artisan Embellishment &amp; Beading</h3>
          </div>
          <span className={styles.cardSubtitle}>
            Specialist embroidery, tambour beading, and stoning tracker
          </span>
        </div>

        {data && !isEditing && (
          <div className={styles.headerActions}>
            <span
              className={
                data.status === 'With Artisan'
                  ? styles.statusPillActive
                  : styles.statusPillCompleted
              }
            >
              <Symbol
                name={data.status === 'With Artisan' ? 'schedule' : 'check'}
                size={12}
              />
              <span>{data.status}</span>
            </span>
          </div>
        )}
      </div>

      {/* State A: Inactive / Empty */}
      {!data && !isEditing && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTextGroup}>
            <span className={styles.emptyTitle}>No specialist embellishment attached</span>
            <span className={styles.emptyDesc}>
              Track computer embroidery, hand-beading, or stoning outsourced to artisans (can be done before sewing on flat panels or after sewing).
            </span>
          </div>
          <button type="button" className={styles.addBtn} onClick={startEdit}>
            <Symbol name="add" size={14} />
            <span>Track Embellishment</span>
          </button>
        </div>
      )}

      {/* State B: Active Tracker Card */}
      {data && !isEditing && (
        <>
          {/* Quick Action Floor Controls */}
          <div className={styles.quickActionBar}>
            {data.status === 'With Artisan' ? (
              <button
                type="button"
                className={styles.actionBtnPrimary}
                onClick={() => handleToggleStatus('Returned & Inspected')}
                disabled={saving}
              >
                <Symbol name="check" size={14} />
                <span>Mark Returned &amp; Inspected</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.actionBtnRevert}
                onClick={() => handleToggleStatus('With Artisan')}
                disabled={saving}
              >
                <Symbol name="undo" size={14} />
                <span>Send to Artisan</span>
              </button>
            )}

            {data.phone && (
              <a
                href={getWhatsAppLink(data.phone, whatsappCheckInMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtnWhatsapp}
              >
                <WhatsappIcon size={14} />
                <span>WhatsApp {data.artisan ? data.artisan.split(' ')[0] : 'Artisan'}</span>
              </a>
            )}

            <button type="button" className={styles.actionBtnSecondary} onClick={startEdit}>
              <Symbol name="edit" size={13} />
              <span>Edit Spec</span>
            </button>

            <button
              type="button"
              className={styles.actionBtnDanger}
              onClick={handleRemove}
              title="Remove embellishment tracker"
              aria-label="Remove embellishment tracker"
            >
              <Symbol name="close" size={14} />
            </button>
          </div>

          {/* Details Grid */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailTile}>
              <span className={styles.detailLabel}>
                <Symbol name="diamond" size={12} /> Craft Type
              </span>
              <span className={`${styles.detailValue} ${styles.detailValueAccent}`}>
                {data.type}
              </span>
            </div>

            <div className={styles.detailTile}>
              <span className={styles.detailLabel}>
                <Symbol name="content_cut" size={12} /> Workshop Timing
              </span>
              <span className={styles.detailValue}>
                {data.timing === 'Before Sewing'
                  ? 'Before Sewing (Panels)'
                  : data.timing === 'After Sewing'
                  ? 'After Sewing (Assembled)'
                  : 'At Fitting Stage'}
              </span>
            </div>

            <div className={styles.detailTile}>
              <span className={styles.detailLabel}>
                <Symbol name="person" size={12} /> Artisan / Specialist
              </span>
              <span className={styles.detailValue}>
                {data.artisan || 'In-House Specialist'}
              </span>
            </div>

            <div className={styles.detailTile}>
              <span className={styles.detailLabel}>
                <Symbol name="event" size={12} /> Return Due Date
              </span>
              <span className={styles.detailValue}>
                {data.due
                  ? new Date(data.due).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not specified'}
              </span>
            </div>

            {data.cost !== undefined && (
              <div className={styles.detailTile}>
                <span className={styles.detailLabel}>
                  <Symbol name="payments" size={12} /> Agreed Fee
                </span>
                <span className={styles.detailValue}>
                  {formatCurrency(data.cost, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Notes / Motif Details */}
          {data.notes && (
            <div className={styles.notesBlock}>
              <span className={styles.notesLabel}>Motif &amp; Pattern Placement</span>
              <p className={styles.notesText}>{data.notes}</p>
            </div>
          )}
        </>
      )}

      {/* State C: Edit Form */}
      {isEditing && (
        <div className={styles.formContainer}>
          <div>
            <span className={styles.formSectionTitle}>Embellishment Craft</span>
            <div className={styles.pillSelectorGroup}>
              {TYPE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`${styles.presetPill} ${
                    formType === preset ? styles.presetPillSelected : ''
                  }`}
                  onClick={() => setFormType(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={styles.formSectionTitle}>Workshop Timing</span>
            <div className={styles.pillSelectorGroup}>
              {TIMING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.presetPill} ${
                    formTiming === opt.value ? styles.presetPillSelected : ''
                  }`}
                  onClick={() => setFormTiming(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGrid}>
            <Input
              label="Custom Craft Type"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder="e.g. Tambour Beading, Monogram"
              required
            />
            <Input
              label="Artisan / Vendor Name"
              value={formArtisan}
              onChange={(e) => setFormArtisan(e.target.value)}
              placeholder="e.g. Mama Aisha Beads, Ibrahim Machine"
            />
            <Input
              label="Artisan WhatsApp / Phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="e.g. 08012345678"
            />
            <Input
              label="Expected Return Date"
              type="date"
              value={formDue}
              onChange={(e) => setFormDue(e.target.value)}
            />
            <MoneyInput
              label="Agreed Artisan Fee (₦)"
              value={formCost}
              onChange={setFormCost}
              placeholder="0"
            />
          </div>

          <Input
            label="Placement & Pattern Notes"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="e.g. Gold bugle beads on cuffs & neck collar only"
          />

          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save Embellishment
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
