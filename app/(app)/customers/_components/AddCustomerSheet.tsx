'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
import { isValidPhone, formatPhone, normalizePhone } from '@/lib/formatters';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { PhoneInput } from '@/components/ui/PhoneInput/PhoneInput';
import type { Customer } from '@/lib/types';
import styles from './EditCustomerSheet.module.css';

interface AddCustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
}

export default function AddCustomerSheet({ isOpen, onClose, onCustomerCreated }: AddCustomerSheetProps) {
  const { addCustomer, customers } = useData();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setGender('male');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!fullName.trim() || !phone.trim()) {
      setError("Enter the client's name and phone number to continue.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number.');
      return;
    }

    const normalizedNewPhone = normalizePhone(phone);
    const rawInputDigits = normalizedNewPhone.replace(/\D/g, '');
    const existingWithPhone = customers.find((c) => {
      if (!c.whatsappNumber) return false;
      const dbNormalized = normalizePhone(c.whatsappNumber);
      if (dbNormalized === normalizedNewPhone) return true;
      const rawDbDigits = dbNormalized.replace(/\D/g, '');
      return rawDbDigits.length >= 10 && rawInputDigits.length >= 10
        ? rawDbDigits.slice(-10) === rawInputDigits.slice(-10)
        : rawDbDigits === rawInputDigits;
    });

    if (existingWithPhone) {
      setError(`Another client (${existingWithPhone.fullName}) is already registered with this phone number.`);
      return;
    }

    setSaving(true);
    try {
      const created = await addCustomer({
        fullName: fullName.trim(),
        whatsappNumber: phone.trim(),
        gender,
      });
      showToast('Client added', 'success');
      resetForm();
      onClose();
      if (onCustomerCreated) {
        onCustomerCreated(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New Client">
      <div className={styles.body}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <Symbol name="running_with_errors" size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="add-customer-name">
            Client&apos;s name
          </label>
          <input
            id="add-customer-name"
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Chief Adebayo"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="add-customer-phone">
            WhatsApp or phone number
          </label>
          <PhoneInput
            id="add-customer-phone"
            value={phone}
            onChange={setPhone}
            placeholder="080 1234 5678"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Garment Focus</label>
          <div className={styles.segmented} role="radiogroup" aria-label="Client gender">
            <button
              type="button"
              role="radio"
              aria-checked={gender === 'male'}
              className={`${styles.segment} ${gender === 'male' ? styles.segmentActive : ''}`}
              onClick={() => setGender('male')}
            >
              Men&apos;s Wear
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={gender === 'female'}
              className={`${styles.segment} ${gender === 'female' ? styles.segmentActive : ''}`}
              onClick={() => setGender('female')}
            >
              Women&apos;s Wear
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save Client
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
