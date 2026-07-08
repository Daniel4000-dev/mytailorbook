'use client';

import { useState, type FormEvent } from 'react';
import { FaUser, FaPhone, FaMoneyBill, FaHandHoldingDollar, FaCalendarDay, FaPlus, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Select from '@/components/ui/Select/Select';
import Button from '@/components/ui/Button/Button';
import { formatCurrency, isValidPhone, formatPhone } from '@/lib/formatters';
import type { Priority, Customer, OrderStatus, OrderItem } from '@/lib/types';
import styles from './OrderForm.module.css';

interface ItemRow {
  id: string;
  description: string;
  price: string;
}

interface OrderFormProps {
  onClose: () => void;
}

export default function OrderForm({ onClose }: OrderFormProps) {
  const { user } = useAuth();
  const { customers, findOrCreateCustomer, addOrder, staffMembers } = useData();
  const { showToast } = useToast();
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
  const [itemized, setItemized] = useState(false);
  const [itemRows, setItemRows] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), description: '', price: '' },
    { id: crypto.randomUUID(), description: '', price: '' },
  ]);

  const itemsTotal = itemRows.reduce((sum, r) => sum + (parseInt(r.price.replace(/,/g, '')) || 0), 0);
  const total = itemized ? itemsTotal : parseInt(totalBill.replace(/,/g, '')) || 0;
  const deposit = parseInt(depositPaid.replace(/,/g, '')) || 0;
  const balance = Math.max(0, total - deposit);

  const handleItemChange = (id: string, field: 'description' | 'price', value: string) => {
    setItemRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: field === 'price' ? value.replace(/[^0-9,]/g, '') : value } : r)));
  };

  const handleAddItemRow = () => {
    setItemRows((prev) => [...prev, { id: crypto.randomUUID(), description: '', price: '' }]);
  };

  const handleRemoveItemRow = (id: string) => {
    setItemRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const staffOptions = staffMembers
    .filter((u) => u.active !== false)
    .map((u) => ({ value: u.uid, label: u.uid === user?.uid ? `${u.name} (You)` : u.name }));

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

  const validItemRows = itemRows.filter((r) => r.description.trim() && (parseInt(r.price.replace(/,/g, '')) || 0) > 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || !phone) {
      setError('Please fill in all required fields');
      return;
    }
    if (itemized ? validItemRows.length === 0 : !details || !totalBill) {
      setError(itemized ? 'Add at least one item with a description and price' : 'Please fill in all required fields');
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

      const items: OrderItem[] | undefined = itemized
        ? validItemRows.map((r) => ({ id: r.id, description: r.description.trim(), price: parseInt(r.price.replace(/,/g, '')) || 0 }))
        : undefined;

      await addOrder({
        customerId: customer.id,
        customerName: customer.fullName,
        orderDetails: itemized ? validItemRows.map((r) => r.description.trim()).join('; ') : details,
        items,
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

      showToast(`Order created for ${customer.fullName}`, 'success');
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

      {!itemized ? (
        <>
          <TextArea
            label="Order Details"
            placeholder="Describe the garment — fabric, style, measurements..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            required
          />
          <button type="button" className={styles.itemizeToggle} onClick={() => setItemized(true)}>
            <FaPlus /> This order has multiple garments — itemize it
          </button>
        </>
      ) : (
        <div className={styles.itemsSection}>
          <div className={styles.itemsSectionHeader}>
            <span className={styles.itemsSectionLabel}>Garments in this order</span>
            <button type="button" className={styles.itemizeToggle} onClick={() => setItemized(false)}>
              Switch to single description
            </button>
          </div>
          {itemRows.map((row, i) => (
            <div key={row.id} className={styles.itemRow}>
              <Input
                placeholder={`Garment ${i + 1}, e.g. Agbada`}
                value={row.description}
                onChange={(e) => handleItemChange(row.id, 'description', e.target.value)}
              />
              <Input
                placeholder="Price (₦)"
                value={row.price}
                onChange={(e) => handleItemChange(row.id, 'price', e.target.value)}
                inputMode="numeric"
              />
              {itemRows.length > 1 && (
                <button type="button" className={styles.itemRemoveBtn} onClick={() => handleRemoveItemRow(row.id)} aria-label="Remove item">
                  <FaXmark />
                </button>
              )}
            </div>
          ))}
          <button type="button" className={styles.addItemBtn} onClick={handleAddItemRow}>
            <FaPlus /> Add Another Garment
          </button>
        </div>
      )}

      <Input
        label="Total Bill (₦)"
        placeholder="0"
        icon={<FaMoneyBill />}
        value={itemized ? itemsTotal.toLocaleString('en-NG') : totalBill}
        onChange={(e) => setTotalBill(e.target.value.replace(/[^0-9,]/g, ''))}
        onBlur={() => formatOnBlur(totalBill, setTotalBill)}
        inputMode="numeric"
        disabled={itemized}
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
