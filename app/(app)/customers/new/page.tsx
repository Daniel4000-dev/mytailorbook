'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { FaSpinner } from 'react-icons/fa6';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/analytics';
import { customerSchema, type CustomerInput } from '@/lib/validations';
import styles from './page.module.css';

import { GARMENT_STYLES } from '@/lib/constants';

/** Step 2 of the walk-in ritual: FAB choice → this profile → straight
 *  into a New Order pre-filled with the freshly created client. */
export default function NewClientPage() {
  const router = useRouter();
  const { addCustomer } = useData();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      gender: 'male',
      preferredStyles: [],
    },
  });

  const gender = watch('gender');
  const styleSet = watch('preferredStyles') || [];

  // Preset chips are gendered — no mixed picker. Style names from the
  // built-in catalog, filtered to whichever gender is currently selected.
  const STYLE_PRESETS = GARMENT_STYLES.filter((s) => s.gender === gender).map((s) => s.name);
  const [customStyle, setCustomStyle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleStyle = (style: string) => {
    const nextStyles = styleSet.includes(style) 
      ? styleSet.filter((s) => s !== style) 
      : [...styleSet, style];
    setValue('preferredStyles', nextStyles);
  };

  const addCustomStyle = () => {
    const value = customStyle.trim();
    if (value && !styleSet.includes(value) && !STYLE_PRESETS.includes(value)) {
      setValue('preferredStyles', [...styleSet, value]);
    }
    setCustomStyle('');
    setShowCustomInput(false);
  };

  const customChips = styleSet.filter((s) => !STYLE_PRESETS.includes(s));

  const onSubmit = async (data: CustomerInput) => {
    setApiError('');
    setSubmitting(true);
    try {
      const customer = await addCustomer({
        fullName: data.fullName.trim(),
        whatsappNumber: data.phone.trim(),
        gender: data.gender,
        address: data.address?.trim() || undefined,
        preferredStyles: data.preferredStyles || [],
        measurements: {},
      });
      showToast(`${customer.fullName} added to customers`, 'success');
      trackEvent('customer_created');
      // Step 3: hand straight into the order wizard, pre-filled.
      router.replace(`/orders/new?customer=${customer.id}`);
    } catch {
      setApiError('Could not create the profile — check your connection and try again.');
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

            {apiError && <div className={styles.errorBanner}>{apiError}</div>}

            <div className={styles.field}>
              <label className={styles.capsLabel} htmlFor="fullName">Full Name</label>
              <div className={styles.inputWrap}>
                <input
                  id="fullName"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Adebayo Ogunlesi"
                  {...register('fullName')}
                />
                <Symbol name="person" size={22} className={styles.inputIcon} />
              </div>
              {errors.fullName && <div className={styles.errorText} style={{ color: 'var(--red)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{errors.fullName.message}</div>}
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
                  {...register('phone')}
                />
              </div>
              {errors.phone && <div className={styles.errorText} style={{ color: 'var(--red)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{errors.phone.message}</div>}
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
                    {...register('address')}
                  />
                  <Symbol name="location_on" size={22} className={styles.inputIcon} />
                </div>
                {errors.address && <div className={styles.errorText} style={{ color: 'var(--red)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{errors.address.message}</div>}
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
                      setValue('gender', g);
                      // Previously picked chips belong to the other gender's
                      // catalog — clear rather than leave a stale mismatch.
                      setValue('preferredStyles', []);
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
            <button type="button" className={styles.createBtn} onClick={handleSubmit(onSubmit)} disabled={submitting}>
                <>
                  {submitting && <FaSpinner className="global-spinner" />}
                  Create Profile & Proceed
                  <Symbol name="arrow_forward" size={22} />
                </>
            </button>
          </div>
        </div>
      </FixedBottomPortal>
    </div>
  );
}
