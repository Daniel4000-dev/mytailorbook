'use client';

import { useState, type FormEvent } from 'react';
import { FaUser, FaEnvelope } from 'react-icons/fa6';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { APP_CONFIG } from '@/lib/config';
import styles from './StaffForm.module.css';

interface StaffFormProps {
  onClose: () => void;
}

export default function StaffForm({ onClose }: StaffFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  if (success) {
    return (
      <div className={styles.success}>
        <p>✓ Staff member added successfully</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Full Name" placeholder="Staff member name" icon={<FaUser />} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label="Email"
        type="email"
        placeholder={`staff@${APP_CONFIG.domain}`}
        icon={<FaEnvelope />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" fullWidth loading={submitting}>Add Staff Member</Button>
    </form>
  );
}
