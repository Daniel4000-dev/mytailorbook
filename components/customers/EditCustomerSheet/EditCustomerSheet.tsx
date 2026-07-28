'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
import { GARMENT_STYLES } from '@/lib/constants';
import { isValidPhone, formatPhone } from '@/lib/formatters';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import type { Customer } from '@/lib/types';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import styles from './EditCustomerSheet.module.css';

interface EditCustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

/** Edits an existing customer's profile fields in place — the same fields
 *  collected in the New Client wizard, reused here instead of re-invented. */
export default function EditCustomerSheet({ isOpen, onClose, customer }: EditCustomerSheetProps) {
  const { updateCustomerProfile } = useData();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(customer.fullName);
  const [phone, setPhone] = useState(formatPhone(customer.whatsappNumber).replace(/^\+?234\s?/, ''));
  const [gender, setGender] = useState(customer.gender);
  const [address, setAddress] = useState(customer.address || '');
  const [styleSet, setStyleSet] = useState<string[]>(customer.preferredStyles || []);

  // Preset chips are gendered — no mixed picker.
  const STYLE_PRESETS = GARMENT_STYLES.filter((s) => s.gender === gender).map((s) => s.name);
  const [customStyle, setCustomStyle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the sheet (re)opens — adjusted during render,
  // per React's guidance for resetting state in response to a prop change,
  // rather than in an effect.
  const [prevOpenId, setPrevOpenId] = useState<string | null>(null);
  const openId = isOpen ? customer.id : null;
  if (isOpen && openId !== prevOpenId) {
    setPrevOpenId(openId);
    setFullName(customer.fullName);
    setPhone(formatPhone(customer.whatsappNumber).replace(/^\+?234\s?/, ''));
    setGender(customer.gender);
    setAddress(customer.address || '');
    setStyleSet(customer.preferredStyles || []);
    setError('');
  } else if (!isOpen && prevOpenId !== null) {
    setPrevOpenId(null);
  }

  const toggleStyle = (style: string) => {
    setStyleSet((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  };

  const addCustomStyle = () => {
    const value = customStyle.trim();
    if (value && !styleSet.includes(value) && !STYLE_PRESETS.includes(value)) {
      setStyleSet((prev) => [...prev, value]);
    }
    setCustomStyle('');
    setShowCustomInput(false);
  };

  const customChips = styleSet.filter((s) => !STYLE_PRESETS.includes(s));

  const handleSave = async () => {
    setError('');
    if (!fullName.trim() || !phone.trim()) {
      setError("Enter the client's name and phone number to continue.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid Nigerian phone number.');
      return;
    }
    setSaving(true);
    try {
      await updateCustomerProfile(customer.id, {
        fullName: fullName.trim(),
        whatsappNumber: phone.trim(),
        gender,
        address: address.trim() || undefined,
        preferredStyles: styleSet,
      });
      showToast('Profile updated', 'success');
      onClose();
    } catch {
      setError('Could not save — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      footer={
        <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      }
    >
      <div className={styles.form}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.capsLabel} htmlFor="edit-fullName">Full Name</label>
          <input
            id="edit-fullName"
            type="text"
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.capsLabel} htmlFor="edit-phone">Phone Number (WhatsApp)</label>
          <div className={styles.phoneRow}>
            <span className={styles.phonePrefix}>🇳🇬 +234</span>
            <input
              id="edit-phone"
              type="tel"
              className={`${styles.input} ${styles.phoneInput}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {FEATURE_FLAGS.customerAddress && (
          <div className={styles.field}>
            <label className={styles.capsLabel} htmlFor="edit-address">Home Address (Optional)</label>
            <input
              id="edit-address"
              type="text"
              className={styles.input}
              placeholder="e.g. 12 Adeola Street, Lagos"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.capsLabel}>Gender</span>
          <div className={styles.segment} role="radiogroup" aria-label="Gender">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={gender === g}
                className={`${styles.segmentBtn} ${gender === g ? styles.segmentBtnActive : ''}`}
                onClick={() => {
                  setGender(g);
                  if (g !== gender) setStyleSet([]);
                }}
              >
                {g === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.capsLabel}>Preferred Styles</span>
          <div className={styles.chips}>
            {[...STYLE_PRESETS, ...customChips].map((style) => {
              const active = styleSet.includes(style);
              return (
                <button
                  key={style}
                  type="button"
                  className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleStyle(style)}
                >
                  {active && <Symbol name="check" size={18} />}
                  {style}
                </button>
              );
            })}
            {showCustomInput ? (
              <input
                autoFocus
                className={`${styles.input} ${styles.customStyleInput}`}
                placeholder="Style name…"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                onBlur={addCustomStyle}
                onKeyDown={(e) => e.key === 'Enter' && addCustomStyle()}
              />
            ) : (
              <button type="button" className={styles.chip} onClick={() => setShowCustomInput(true)}>
                <Symbol name="add" size={18} />
                Other
              </button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
