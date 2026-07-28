'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import { isValidPhone } from '@/lib/formatters';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import styles from './page.module.css';

import { GARMENT_STYLES } from '@/lib/constants';

/** Step 2 of the walk-in ritual: FAB choice → this profile → straight
 *  into a New Order pre-filled with the freshly created client. */
export default function NewClientPage() {
  const router = useRouter();
  const { addCustomer } = useData();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [styleSet, setStyleSet] = useState<string[]>([]);

  // Preset chips are gendered — no mixed picker. Style names from the
  // built-in catalog, filtered to whichever gender is currently selected.
  const STYLE_PRESETS = GARMENT_STYLES.filter((s) => s.gender === gender).map((s) => s.name);
  const [customStyle, setCustomStyle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async () => {
    setError('');
    if (!fullName.trim() || !phone.trim()) {
      setError("Enter the client's name and phone number to continue.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid Nigerian phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const customer = await addCustomer({
        fullName: fullName.trim(),
        whatsappNumber: phone.trim(),
        gender,
        address: address.trim() || undefined,
        preferredStyles: styleSet,
        measurements: {},
      });
      showToast(`${customer.fullName} added to customers`, 'success');
      // Step 3: hand straight into the order wizard, pre-filled.
      router.replace(`/orders/new?customer=${customer.id}`);
    } catch {
      setError('Could not create the profile — check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Transactional header */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
          <Symbol name="arrow_back" size={28} />
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.stepLabel}>Step 2 of 3</span>
          <h1 className={styles.headerTitle}>New Client</h1>
        </div>
        <span className={styles.headerSpacer} />
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} />
        </div>
      </header>

      <main className={styles.scroll}>
        <div className={styles.formCol}>
          {/* Personal details */}
          <section className={styles.section}>
            <div>
              <h2 className={styles.sectionTitle}>Client Profile</h2>
              <p className={styles.sectionSub}>Enter the essential details for their atelier record.</p>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.capsLabel} htmlFor="fullName">Full Name</label>
              <div className={styles.inputWrap}>
                <input
                  id="fullName"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Adebayo Ogunlesi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Symbol name="person" size={22} className={styles.inputIcon} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.capsLabel} htmlFor="phone">Phone Number (WhatsApp)</label>
              <div className={styles.phoneRow}>
                <span className={styles.phonePrefix}>🇳🇬 +234</span>
                <input
                  id="phone"
                  type="tel"
                  className={`${styles.input} ${styles.phoneInput}`}
                  placeholder="803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {FEATURE_FLAGS.customerAddress && (
              <div className={styles.field}>
                <label className={styles.capsLabel} htmlFor="address">Home Address (Optional)</label>
                <div className={styles.inputWrap}>
                  <input
                    id="address"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 12 Adeola Street, Lagos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <Symbol name="location_on" size={22} className={styles.inputIcon} />
                </div>
              </div>
            )}
          </section>

          <hr className={styles.divider} />

          {/* Demographics & preferences */}
          <section className={styles.section}>
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
                      // Previously picked chips belong to the other gender's
                      // catalog — clear rather than leave a stale mismatch.
                      setStyleSet([]);
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
                      {active && <Symbol name="check" size={20} />}
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
                    <Symbol name="add" size={20} />
                    Other
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed glass action bar — portaled straight to document.body, see
          FixedBottomPortal for why. */}
      <FixedBottomPortal>
        <div className={styles.actionBar}>
          <div className={styles.actionBarInner}>
            <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
              Cancel
            </button>
            <button type="button" className={styles.createBtn} onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Profile & Proceed'}
              <Symbol name="arrow_forward" size={22} />
            </button>
          </div>
        </div>
      </FixedBottomPortal>
    </div>
  );
}
