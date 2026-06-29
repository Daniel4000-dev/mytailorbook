'use client';

import { useState, type FormEvent } from 'react';
import { FaUser, FaPhone } from 'react-icons/fa6';
import { useData } from '@/contexts/DataContext';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Button from '@/components/ui/Button/Button';
import { isValidPhone, formatPhone } from '@/lib/formatters';
import styles from './CustomerForm.module.css';

interface CustomerFormProps {
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
}

export default function CustomerForm({ onClose, onSuccess }: CustomerFormProps) {
  const { addCustomer } = useData();
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !whatsappNumber) {
      setError('Please fill in all required fields');
      return;
    }
    if (!isValidPhone(whatsappNumber)) {
      setError('Enter a valid Nigerian phone number');
      return;
    }

    setSubmitting(true);
    try {
      const newCustomer = await addCustomer({
        fullName,
        whatsappNumber,
        gender,
        measurements: {},
      });
      
      onSuccess?.(newCustomer.id);
      onClose();
    } catch (err) {
      setError('Failed to create customer');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <Input
        label="Full Name"
        placeholder="e.g. John Doe"
        icon={<FaUser />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <Input
        label="WhatsApp Number"
        placeholder="08012345678"
        icon={<FaPhone />}
        value={whatsappNumber}
        onChange={(e) => setWhatsappNumber(e.target.value)}
        required
      />

      <Select
        label="Gender"
        value={gender}
        onChange={(e) => setGender(e.target.value as 'male' | 'female')}
        options={[
          { label: 'Female', value: 'female' },
          { label: 'Male', value: 'male' },
        ]}
      />

      <Button type="submit" fullWidth loading={submitting} size="lg">
        Add Customer
      </Button>
    </form>
  );
}
