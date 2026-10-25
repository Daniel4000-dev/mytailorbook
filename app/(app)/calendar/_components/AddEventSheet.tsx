'use client';

import { useState, useId } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import TextArea from '@/components/ui/TextArea/TextArea';
import Symbol from '@/components/ui/Symbol/Symbol';
import Avatar from '@/components/ui/Avatar/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createCalendarEvent } from '@/app/actions/calendar';
import { getWhatsAppLink } from '@/lib/formatters';
import type { CalendarEvent, CalendarEventType } from '@/lib/types';
import styles from './AddEventSheet.module.css';

interface AddEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onEventCreated: (newEvent?: CalendarEvent) => void;
}

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: 'fitting', label: 'Bespoke Fitting (Try-on)' },
  { value: 'dispatch', label: 'Garment Delivery / Dispatch' },
  { value: 'meeting', label: 'Client Consultation / Design' },
  { value: 'fabric_delivery', label: 'Fabric / Material Drop-off' },
  { value: 'market_run', label: 'Fabric Market Run (Balogun / Tejuosho)' },
  { value: 'payment_followup', label: 'Balance Payment Follow-up' },
  { value: 'shop_maintenance', label: 'Machine Needles & Generator Service' },
  { value: 'general_task', label: 'General Workshop Task' },
  { value: 'off_day', label: 'Atelier Off Day / Holiday' },
];

const TIME_PRESETS = [
  { label: '10:00 AM', start: '10:00', end: '11:00' },
  { label: '12:00 PM', start: '12:00', end: '13:00' },
  { label: '02:00 PM', start: '14:00', end: '15:00' },
  { label: '04:00 PM', start: '16:00', end: '17:00' },
];

export default function AddEventSheet({
  isOpen,
  onClose,
  defaultDate,
  onEventCreated,
}: AddEventSheetProps) {
  const { user } = useAuth();
  const { customers, orders, currentShop, isDemoMode } = useData();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEventType>('fitting');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sendWhatsAppNotice, setSendWhatsAppNotice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active orders for currently selected customer
  const customerOrders = selectedCustomerId
    ? orders.filter((o) => o.customerId === selectedCustomerId && o.status !== 'Delivered')
    : [];

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  // Handle client selection and auto-fill fitting details
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const client = customers.find((c) => c.id === customerId);
    if (!client) {
      setSelectedOrderId('');
      return;
    }

    const clientOrders = orders.filter((o) => o.customerId === customerId && o.status !== 'Delivered');
    if (clientOrders.length > 0) {
      setSelectedOrderId(clientOrders[0].id);
      if (type === 'fitting') {
        setTitle(`Fitting: ${client.fullName} (${clientOrders[0].orderDetails})`);
      } else {
        setTitle(`${client.fullName} - ${clientOrders[0].orderDetails}`);
      }
    } else {
      setSelectedOrderId('');
      if (type === 'fitting') {
        setTitle(`Fitting: ${client.fullName}`);
      } else {
        setTitle(`Appointment: ${client.fullName}`);
      }
    }
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = orders.find((o) => o.id === orderId);
    if (ord && selectedCustomer) {
      if (type === 'fitting') {
        setTitle(`Fitting: ${selectedCustomer.fullName} (${ord.orderDetails})`);
      } else {
        setTitle(`${selectedCustomer.fullName} - ${ord.orderDetails}`);
      }
    }
  };

  const handleApplyTimePreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter an event title', 'error');
      return;
    }

    const shopId = user?.shopId || currentShop?.id || 'demo-shop';

    setIsSubmitting(true);

    if (isDemoMode) {
      const demoEvent: CalendarEvent = {
        id: `demo-evt-${Date.now()}`,
        shopId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        relatedCustomerId: selectedCustomerId || undefined,
        relatedOrderId: selectedOrderId || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setIsSubmitting(false);
      showToast('Fitting event scheduled successfully', 'success');
      onEventCreated(demoEvent);

      // Trigger WhatsApp notice if enabled
      if (sendWhatsAppNotice && selectedCustomer?.whatsappNumber) {
        const timeStr = startTime ? ` at ${startTime}` : '';
        const shopName = currentShop?.name || 'our atelier';
        const msg = `Hello ${selectedCustomer.fullName},\n\nWarm reminder from ${shopName} regarding your bespoke appointment scheduled for ${date}${timeStr}.\n\nAtelier Address: ${currentShop?.address || 'our studio'}.\n\nPlease let us know if you need to adjust this timing. See you soon!`;
        window.open(getWhatsAppLink(selectedCustomer.whatsappNumber, msg), '_blank');
      }

      onClose();
      resetForm();
      return;
    }

    // Real Supabase persistence
    const { success, error } = await createCalendarEvent({
      shopId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      relatedOrderId: selectedOrderId || undefined,
      relatedCustomerId: selectedCustomerId || undefined,
    });

    setIsSubmitting(false);

    if (success) {
      showToast('Appointment scheduled successfully', 'success');
      onEventCreated();

      // Trigger WhatsApp notice if enabled
      if (sendWhatsAppNotice && selectedCustomer?.whatsappNumber) {
        const timeStr = startTime ? ` at ${startTime}` : '';
        const shopName = currentShop?.name || 'our atelier';
        const msg = `Hello ${selectedCustomer.fullName},\n\nWarm reminder from ${shopName} regarding your bespoke appointment scheduled for ${date}${timeStr}.\n\nAtelier Address: ${currentShop?.address || 'our studio'}.\n\nPlease let us know if you need to adjust this timing. See you soon!`;
        window.open(getWhatsAppLink(selectedCustomer.whatsappNumber, msg), '_blank');
      }

      onClose();
      resetForm();
    } else {
      showToast(error || 'Failed to schedule event', 'error');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('fitting');
    setSelectedCustomerId('');
    setSelectedOrderId('');
    setStartTime('');
    setEndTime('');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Schedule Atelier Event" variant="panel">
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Event Type Selector */}
        <div className={styles.field}>
          <Select
            label="Appointment / Event Type"
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEventType)}
            options={EVENT_TYPES}
          />
        </div>

        {/* Client Selection (Optional / Linked) */}
        <div className={styles.field}>
          <Select
            label="Link Customer (Optional)"
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            options={[
              { value: '', label: 'General Shop Event (No customer)' },
              ...customers.map((c) => ({
                value: c.id,
                label: `${c.fullName}${c.whatsappNumber ? ` (${c.whatsappNumber})` : ''}`,
              })),
            ]}
          />
        </div>

        {/* Order Selection if customer has active orders */}
        {selectedCustomerId && customerOrders.length > 0 && (
          <div className={styles.field}>
            <Select
              label="Link Garment / Order"
              value={selectedOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              options={[
                { value: '', label: 'General / No specific outfit' },
                ...customerOrders.map((o) => ({
                  value: o.id,
                  label: `${o.orderDetails} (${o.status})`,
                })),
              ]}
            />
          </div>
        )}

        {/* Event Title */}
        <div className={styles.field}>
          <Input
            label="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2nd Fitting: Chief Adeleke"
            required
          />
        </div>

        {/* Date Field */}
        <div className={styles.field}>
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Time Presets Row */}
        <div className={styles.presetsSection}>
          <span className={styles.presetsLabel}>Quick Start Times:</span>
          <div className={styles.presetsRow}>
            {TIME_PRESETS.map((p) => {
              const isActive = startTime === p.start;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`${styles.timeChip} ${isActive ? styles.timeChipActive : ''}`}
                  onClick={() => handleApplyTimePreset(p.start, p.end)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range Inputs */}
        <div className={styles.timeRow}>
          <div className={styles.timeCol}>
            <Input
              type="time"
              label="Start Time (Optional)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className={styles.timeCol}>
            <Input
              type="time"
              label="End Time (Optional)"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* WhatsApp Notification Toggle */}
        {selectedCustomer?.whatsappNumber && (
          <label className={styles.noticeToggleLabel}>
            <input
              type="checkbox"
              checked={sendWhatsAppNotice}
              onChange={(e) => setSendWhatsAppNotice(e.target.checked)}
              className={styles.noticeCheckbox}
            />
            <span className={styles.noticeToggleText}>
              Send WhatsApp appointment reminder to {selectedCustomer.fullName}
            </span>
          </label>
        )}

        {/* Notes Field */}
        <div className={styles.field}>
          <TextArea
            label="Atelier Fitting Notes (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Focus on chest ease and sleeve taper"
            rows={2}
          />
        </div>

        {/* Form Actions */}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className={styles.submitBtn}
            icon={<Symbol name="calendar_today" size={18} />}
          >
            Save Appointment
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
