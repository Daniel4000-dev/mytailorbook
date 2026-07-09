'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import TextArea from '@/components/ui/TextArea/TextArea';
import Badge from '@/components/ui/Badge/Badge';
import {
  FaBars,
  FaPlus,
  FaWhatsapp,
  FaCircleCheck,
  FaXmark,
  FaCalendarDays,
  FaUserSlash,
} from 'react-icons/fa6';
import { useSidebar } from '@/contexts/SidebarContext';
import { getWhatsAppLink, getAppointmentReminderMessage } from '@/lib/formatters';
import {
  getAppointmentsAction,
  addAppointmentAction,
  updateAppointmentStatusAction,
  deleteAppointmentAction,
} from '@/app/actions';
import type { Appointment, AppointmentType, Customer } from '@/lib/types';
import styles from './page.module.css';

const TYPE_LABELS: Record<AppointmentType, string> = {
  fitting: 'Fitting',
  pickup: 'Pickup',
  consultation: 'Consultation',
};

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const { customers, orders, currentShop, isLoaded } = useData();
  const { toggleMenu } = useSidebar();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [type, setType] = useState<AppointmentType>('fitting');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentShop) {
      getAppointmentsAction(currentShop.id)
        .then(setAppointments)
        .finally(() => setAppointmentsLoaded(true));
    }
  }, [currentShop]);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [appointments]
  );

  const suggestions = customerName.trim()
    ? customers.filter((c) => c.fullName.toLowerCase().includes(customerName.toLowerCase())).slice(0, 5)
    : customers.slice(0, 5);

  const customerOrders = selectedCustomerId ? orders.filter((o) => o.customerId === selectedCustomerId && o.status !== 'Completed') : [];

  const handleSelectSuggestion = (c: Customer) => {
    setCustomerName(c.fullName);
    setSelectedCustomerId(c.id);
    setShowSuggestions(false);
    setOrderId('');
  };

  const resetForm = () => {
    setCustomerName('');
    setSelectedCustomerId(null);
    setType('fitting');
    setScheduledDate('');
    setScheduledTime('');
    setOrderId('');
    setNotes('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!currentShop || !selectedCustomerId || !scheduledDate || !scheduledTime) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    setSaving(true);
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const appointment = await addAppointmentAction(currentShop.id, {
        customerId: customer.id,
        customerName: customer.fullName,
        orderId: orderId || undefined,
        type,
        scheduledAt,
        notes: notes || undefined,
      });
      setAppointments((prev) => [...prev, appointment]);
      resetForm();
      showToast('Appointment scheduled', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (appointment: Appointment, status: Appointment['status']) => {
    if (!currentShop) return;
    const updated = await updateAppointmentStatusAction(appointment.id, status, currentShop.id);
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDelete = async (appointmentId: string) => {
    if (!currentShop) return;
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
    await deleteAppointmentAction(appointmentId, currentShop.id);
  };

  const topBar = (
    <TopBar
      profileMode={{ greeting: 'Schedule', name: user?.name || '', avatarInitials: user?.name ? user.name[0] : 'S' }}
      leftAction={
        <div className={styles.mobileOnly}>
          <CircleIconButton icon={<FaBars />} onClick={toggleMenu} ariaLabel="Open menu" />
        </div>
      }
    />
  );

  if (authLoading || !isLoaded) {
    return (
      <PageLayout className={styles.pageGrid} header={topBar}>
        <div />
      </PageLayout>
    );
  }

  const customerForAppointment = (a: Appointment) => customers.find((c) => c.id === a.customerId);

  return (
    <PageLayout className={styles.pageGrid} header={topBar}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <p className={styles.introText}>Fitting and pickup appointments — checked daily, like Production.</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <FaPlus /> New Appointment
            </Button>
          )}
        </div>

        {showForm && (
          <div className={styles.card}>
            <div className={styles.inputWrapper}>
              <Input
                label="Customer"
                placeholder="Full name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedCustomerId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsList}>
                  {suggestions.map((c) => (
                    <button key={c.id} type="button" className={styles.suggestionItem} onClick={() => handleSelectSuggestion(c)}>
                      {c.fullName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Select
              label="Type"
              options={[
                { value: 'fitting', label: 'Fitting' },
                { value: 'pickup', label: 'Pickup' },
                { value: 'consultation', label: 'Consultation' },
              ]}
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
            />

            <div className={styles.formRow}>
              <Input label="Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              <Input label="Time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>

            {selectedCustomerId && customerOrders.length > 0 && (
              <Select
                label="Link to Order (optional)"
                options={[{ value: '', label: 'None' }, ...customerOrders.map((o) => ({ value: o.id, label: `${o.orderDetails.slice(0, 40)} (${o.status})` }))]}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            )}

            <TextArea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

            <div className={styles.formActions}>
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={!selectedCustomerId || !scheduledDate || !scheduledTime}>
                Save
              </Button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          {appointmentsLoaded && upcoming.length === 0 && (
            <div className={styles.emptyState}>
              <FaCalendarDays className={styles.emptyIcon} />
              <p>No upcoming appointments.</p>
            </div>
          )}

          <div className={styles.appointmentList}>
            {upcoming.map((appointment) => {
              const customer = customerForAppointment(appointment);
              const when = new Date(appointment.scheduledAt);
              return (
                <div key={appointment.id} className={styles.appointmentRow}>
                  <div className={styles.appointmentInfo}>
                    <div className={styles.appointmentTop}>
                      <span className={styles.appointmentCustomer}>{appointment.customerName}</span>
                      <Badge variant="default">{TYPE_LABELS[appointment.type]}</Badge>
                    </div>
                    <span className={styles.appointmentTime}>
                      {when.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                      {when.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {appointment.notes && <span className={styles.appointmentNotes}>{appointment.notes}</span>}
                  </div>
                  <div className={styles.appointmentActions}>
                    {customer && (
                      <a
                        href={getWhatsAppLink(
                          customer.whatsappNumber,
                          getAppointmentReminderMessage({
                            customerName: appointment.customerName,
                            shopName: currentShop?.name || 'us',
                            type: appointment.type,
                            scheduledAt: appointment.scheduledAt,
                          })
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.iconActionBtn}
                        aria-label="Send reminder"
                      >
                        <FaWhatsapp />
                      </a>
                    )}
                    <button type="button" className={styles.iconActionBtn} onClick={() => handleUpdateStatus(appointment, 'completed')} aria-label="Mark completed">
                      <FaCircleCheck />
                    </button>
                    <button type="button" className={styles.iconActionBtn} onClick={() => handleUpdateStatus(appointment, 'no_show')} aria-label="Mark no-show">
                      <FaUserSlash />
                    </button>
                    <button type="button" className={styles.iconActionBtn} onClick={() => handleDelete(appointment.id)} aria-label="Cancel appointment">
                      <FaXmark />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
