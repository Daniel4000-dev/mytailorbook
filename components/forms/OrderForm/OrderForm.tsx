'use client';

import { useState, type FormEvent } from 'react';
import { FaUser, FaPhone, FaMoneyBill, FaHandHoldingDollar, FaCalendarDay } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Select from '@/components/ui/Select/Select';
import Button from '@/components/ui/Button/Button';
import { formatCurrency, isValidPhone, formatPhone } from '@/lib/formatters';
import type { Priority, Customer, OrderStatus } from '@/lib/types';
import styles from './OrderForm.module.css';

interface OrderFormProps {
  onClose: () => void;
}

export default function OrderForm({ onClose }: OrderFormProps) {
  const { user } = useAuth();
  const { customers, findOrCreateCustomer, addOrder, staffMembers } = useData();
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState('');
  const [totalBill, setTotalBill] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [startingStage, setStartingStage] = useState<OrderStatus>('Documented');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const total = parseInt(totalBill.replace(/,/g, '')) || 0;
  const deposit = parseInt(depositPaid.replace(/,/g, '')) || 0;
  const balance = Math.max(0, total - deposit);

  const staffOptions = staffMembers
    .filter((u) => u.role === 'Staff')
    .map((u) => ({ value: u.uid, label: u.name }));

  const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: '⚡ Urgent' },
    { value: 'rush', label: '🔥 Rush' },
  ];

  const stageOptions: { value: OrderStatus; label: string }[] = [
    { value: 'Documented', label: '📋 Documented' },
    { value: 'Cutting', label: '✂️ Cutting' },
    { value: 'Sewing', label: '🧵 Sewing' },
    { value: 'Ready', label: '👔 Ready' },
  ];

  const suggestions = customerName.trim()
    ? customers.filter(c => 
        c.fullName.toLowerCase().includes(customerName.toLowerCase()) ||
        c.whatsappNumber.includes(customerName)
      ).slice(0, 5)
    : customers.slice(0, 5);

  const handleSelectSuggestion = (c: Customer) => {
    setCustomerName(c.fullName);
    setPhone(c.whatsappNumber);
    setSelectedCustomerId(c.id);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || !phone || !details || !totalBill) {
      setError('Please fill in all required fields');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid Nigerian phone number');
      return;
    }
    if (deposit > total) {
      setError('Deposit cannot exceed total bill');
      return;
    }

    setSubmitting(true);
    try {
      const customer = await findOrCreateCustomer(customerName, phone);
      const selectedStaff = staffMembers.find((u) => u.uid === assignedTo);

      await addOrder({
        customerId: customer.id,
        customerName: customer.fullName,
        orderDetails: details,
        totalBill: total,
        depositPaid: deposit,
        status: startingStage,
        assignedTo: assignedTo || undefined,
        assignedToName: selectedStaff?.name,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
        images: [],
        statusHistory: [{
          from: null,
          to: startingStage,
          changedBy: user?.uid || 'unknown',
          changedByName: user?.name || 'Unknown',
          timestamp: new Date().toISOString(),
        }],
      });

      onClose();
    } catch (err) {
      setError('Failed to create order');
      setSubmitting(false);
    }
  };

  const formatOnBlur = (value: string, setter: (v: string) => void) => {
    const num = parseInt(value.replace(/,/g, '')) || 0;
    if (num > 0) setter(num.toLocaleString('en-NG'));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.inputWrapper}>
        <Input
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>Customer Name</span>
              {selectedCustomerId && (
                <a 
                  href={`/customers/${selectedCustomerId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--sf-accent-emerald)', fontSize: 'var(--sf-text-xs)', textDecoration: 'underline' }}
                >
                  View Measurements
                </a>
              )}
            </div>
          }
          placeholder="Full name"
          icon={<FaUser />}
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            setSelectedCustomerId(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          required
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestionsList}>
            {suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.suggestionItem}
                onClick={() => handleSelectSuggestion(c)}
              >
                <span className={styles.suggestionName}>{c.fullName}</span>
                <span className={styles.suggestionPhone}>{formatPhone(c.whatsappNumber)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Input
        label="WhatsApp Number"
        placeholder="08012345678"
        icon={<FaPhone />}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />

      <TextArea
        label="Order Details"
        placeholder="Describe the garment — fabric, style, measurements..."
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        required
      />

      <Input
        label="Total Bill (₦)"
        placeholder="0"
        icon={<FaMoneyBill />}
        value={totalBill}
        onChange={(e) => setTotalBill(e.target.value.replace(/[^0-9,]/g, ''))}
        onBlur={() => formatOnBlur(totalBill, setTotalBill)}
        inputMode="numeric"
      />
      <Input
        label="Deposit (₦)"
        placeholder="0"
        icon={<FaHandHoldingDollar />}
        value={depositPaid}
        onChange={(e) => setDepositPaid(e.target.value.replace(/[^0-9,]/g, ''))}
        onBlur={() => formatOnBlur(depositPaid, setDepositPaid)}
        inputMode="numeric"
      />

      {total > 0 && (
        <div className={styles.balancePreview}>
          <span className={styles.balanceLabel}>Balance Owed</span>
          <span className={styles.balanceValue}>{formatCurrency(balance)}</span>
        </div>
      )}

      <Select
        label="Assign To"
        options={[{ value: '', label: 'Unassigned' }, ...staffOptions]}
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
      />

      <Select
        label="Starting Stage"
        options={stageOptions}
        value={startingStage}
        onChange={(e) => setStartingStage(e.target.value as OrderStatus)}
      />

      <div className={styles.row}>
        <Input
          label="Due Date"
          type="date"
          icon={<FaCalendarDay />}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Select
          label="Priority"
          options={priorityOptions}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        />
      </div>

      <Button type="submit" fullWidth loading={submitting} size="lg">
        Create Order
      </Button>
    </form>
  );
}
