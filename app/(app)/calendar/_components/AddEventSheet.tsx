'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createCalendarEvent } from '@/app/actions/calendar';
import type { CalendarEventType } from '@/lib/types';
import styles from './AddEventSheet.module.css';

interface AddEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onEventCreated: () => void;
}

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: 'fitting', label: 'Fitting' },
  { value: 'market_run', label: 'Market Run' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'dispatch', label: 'Delivery / Dispatch' },
  { value: 'fabric_delivery', label: 'Fabric Delivery' },
  { value: 'payment_followup', label: 'Payment Follow-up' },
  { value: 'shop_maintenance', label: 'Shop Maintenance' },
  { value: 'general_task', label: 'General Task' },
  { value: 'off_day', label: 'Off Day / Holiday' },
];

export default function AddEventSheet({ isOpen, onClose, defaultDate, onEventCreated }: AddEventSheetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEventType>('fitting');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.shopId) return;

    if (!title.trim()) {
      showToast('Please enter an event title', 'error');
      return;
    }

    setIsSubmitting(true);
    const { success, error } = await createCalendarEvent({
      shopId: user.shopId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      showToast('Event created successfully', 'success');
      onEventCreated();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setType('fitting');
      setStartTime('');
      setEndTime('');
    } else {
      showToast(error || 'Failed to create event', 'error');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Event">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fitting for Sarah"
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Event Type</label>
            <select 
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value as CalendarEventType)}
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <Input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Start Time (Optional)</label>
            <Input 
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>End Time (Optional)</label>
            <Input 
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Notes (Optional)</label>
          <TextArea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra details..."
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>Save Event</Button>
        </div>
      </form>
    </BottomSheet>
  );
}
