'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';

import { scrollContentToTop } from '@/lib/scrollToTop';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import StyleMeasureForm from '@/components/orders/StyleMeasureForm/StyleMeasureForm';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/analytics';
import { customerSchema, type CustomerInput } from '@/lib/validations';
import { PhoneInput } from '@/components/ui/PhoneInput/PhoneInput';
import { normalizePhone, parseMeasurementValue } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

import { GARMENT_STYLES, FULL_BODY_MEASUREMENTS } from '@/lib/constants';

/** Step 2 of the walk-in ritual: FAB choice → this profile → straight
 *  into a New Order pre-filled with the freshly created client. */
export default function NewClientPage() {
  const router = useRouter();
  const { addCustomer, customers } = useData();
  const { showToast } = useToast();
  // FixedBottomPortal escapes to document.body, so its fixed positioning
  // can't rely on CSS descendant selectors to know whether the app's own
  // sidebar is collapsed (280px vs 80px) — read the same state the
  // sidebar itself uses and pass it through as a data attribute instead
  // (same pattern as the New Order wizard's .summaryBarWrap).
  const { isCollapsed } = useSidebar();

  const {
    register,
    control,
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
  const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);
  // Second screen of this same step: full-body measurements, entirely
  // optional — every field can be left blank and Skip moves on exactly
  // like Continue does, just without saving any numbers.
  const [screen, setScreen] = useState<'profile' | 'measurements'>('profile');
  const [bodyMeasurements, setBodyMeasurements] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState('');
  const bodySpec = FULL_BODY_MEASUREMENTS[gender];

  // Same page, two full content swaps — reset scroll on each so Continue
  // doesn't land the measurements screen mid-scroll from the profile form.
  useEffect(() => {
    scrollContentToTop();
  }, [screen]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator) {
      setIsContactPickerSupported(true);
    }
  }, []);

  const handleImportContact = async () => {
    if (typeof navigator === 'undefined' || !('contacts' in navigator)) {
      showToast('Apple restricts contact importing on iPhones for web apps. Please enter the details manually.', 'error');
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      // @ts-expect-error Form uses uncontrolled internal state for nested arrays that typecheck struggles with
      const contacts = await navigator.contacts.select(props, opts);
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        if (contact.name && contact.name.length > 0) {
          setValue('fullName', contact.name[0]);
        }
        if (contact.tel && contact.tel.length > 0) {
          // Keep only digits and + for the phone number
          const cleanedPhone = contact.tel[0].replace(/[^\d+]/g, '');
          setValue('phone', cleanedPhone);
        }
      }
    } catch (ex) {
      console.error('Failed to select contact:', ex);
    }
  };

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

  const findDuplicateClient = (phoneInput: string) => {
    const normalizedInput = normalizePhone(phoneInput);
    const rawInputDigits = normalizedInput.replace(/\D/g, '');
    return customers.find((c) => {
      if (!c.whatsappNumber) return false;
      const dbNormalized = normalizePhone(c.whatsappNumber);
      if (dbNormalized === normalizedInput) return true;
      const rawDbDigits = dbNormalized.replace(/\D/g, '');
      return rawDbDigits.length >= 10 && rawInputDigits.length >= 10
        ? rawDbDigits.slice(-10) === rawInputDigits.slice(-10)
        : rawDbDigits === rawInputDigits;
    });
  };

  const onSubmit = async (data: CustomerInput, proceedToOrder: boolean = true) => {
    setApiError('');
    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(data.phone);
      const duplicate = findDuplicateClient(data.phone);

      if (duplicate) {
        const errorMsg = `A client with the number ${data.phone.trim()} already exists (${duplicate.fullName}).`;
        setApiError(errorMsg);
        showToast(errorMsg, 'error');
        setSubmitting(false);
        return;
      }

      const measurements: Record<string, number> = {};
      for (const [key, value] of Object.entries(bodyMeasurements)) {
        const num = parseMeasurementValue(value);
        if (num !== null) measurements[key] = num;
      }
      const customer = await addCustomer({
        fullName: data.fullName.trim(),
        whatsappNumber: normalizedPhone,
        gender: data.gender,
        address: data.address?.trim() || undefined,
        birthdate: data.birthdate?.trim() || undefined,
        preferredStyles: data.preferredStyles || [],
        measurements,
        measurementNotes: measurementNotes.trim() || undefined,
      });
      showToast(`${customer.fullName} added to customers`, 'success');
      trackEvent('customer_created');
      if (proceedToOrder) {
        router.replace(ROUTES.orderNewForCustomer(customer.id));
      } else {
        router.replace(ROUTES.customerDetail(customer.id));
      }
    } catch (err) {
      // The client-side duplicate check above reads from the local (SWR)
      // customer list, which can be a beat stale — e.g. another staff
      // member just added the same number. The DB's own unique constraint
      // (unique_shop_whatsapp) is the real guard; surface ITS rejection
      // with the same friendly wording instead of a raw Postgres error.
      const message = err instanceof Error ? err.message : '';
      let errorMsg = '';
      if (message.toLowerCase().includes('unique_shop_whatsapp') || message.toLowerCase().includes('duplicate key')) {
        errorMsg = `A client with the number ${data.phone.trim()} already exists.`;
      } else {
        errorMsg = message || 'Could not create the profile — check your connection and try again.';
      }
      setApiError(errorMsg);
      showToast(errorMsg, 'error');
      setSubmitting(false);
    }
  };

  const handleContinueToMeasurements = (data: CustomerInput) => {
    const duplicate = findDuplicateClient(data.phone);

    if (duplicate) {
      const errorMsg = `A client with the number ${data.phone.trim()} already exists (${duplicate.fullName}).`;
      setApiError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }
    
    setApiError('');
    setScreen('measurements');
  };

  // Desktop-only step rail — this page is itself just step 2 of the
  // larger walk-in ritual (FAB → this profile → New Order), but it has
  // two full-screen swaps of its own (profile, then optional
  // measurements). Two entries is thin for a dedicated sidebar-style
  // rail, so rather than mechanically cloning the 4-step order wizard's
  // rail, this stays a compact two-pill strip inline in the header —
  // still answers "where am I / what's next" and lets the tailor jump
  // back to Profile without a Back click, but doesn't burn 220px of
  // desktop width on a two-item list.
  const SCREEN_ORDER: Array<'profile' | 'measurements'> = ['profile', 'measurements'];
  const SCREEN_LABEL: Record<'profile' | 'measurements', string> = {
    profile: 'Profile',
    measurements: 'Measurements',
  };
  const currentScreenIndex = SCREEN_ORDER.indexOf(screen);

  return (
    <div className={styles.page}>
      {/* Transactional header */}
      <header className={styles.header}>
        {/* Content aligns to the same measure as the body column and the
            floating action bar below — max-width + margin:auto is a no-op
            below the desktop breakpoint, so mobile stays pixel-identical. */}
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => (screen === 'measurements' ? setScreen('profile') : router.back())}
            aria-label="Go back"
          >
            <Symbol name="arrow_back" size={28} />
          </button>
          <div className={styles.headerCenter}>
            <span className={styles.stepLabel}>
              {screen === 'profile' ? 'Step 1 of 2: Profile' : 'Step 2 of 2: Measurements'}
            </span>
            <h1 className={styles.headerTitle}>{screen === 'profile' ? 'New Client' : 'Body Measurements'}</h1>
          </div>
          <span className={styles.headerSpacer} />
          {/* Desktop-only — CSS-hidden below 1024px (see .screenRail), so
              this is purely additive on mobile: nothing removed, nothing
              re-flowed. Positioned absolutely within .headerInner so it
              doesn't disturb the backBtn/headerCenter/headerSpacer
              space-between balance that centers the title on mobile. */}
          <nav className={styles.screenRail} aria-label="New client screens">
            {SCREEN_ORDER.map((s, i) => {
              const state = i < currentScreenIndex ? 'done' : i === currentScreenIndex ? 'current' : 'upcoming';
              return (
                <button
                  key={s}
                  type="button"
                  className={styles.screenRailItem}
                  data-state={state}
                  disabled={state !== 'done'}
                  onClick={() => state === 'done' && setScreen(s)}
                >
                  <span className={styles.screenRailGlyph}>
                    {state === 'done' ? <Symbol name="check" size={12} /> : i + 1}
                  </span>
                  {SCREEN_LABEL[s]}
                </button>
              );
            })}
          </nav>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ transform: `scaleX(${screen === 'profile' ? 0.5 : 1})` }}
          />
        </div>
      </header>

      {screen === 'measurements' ? (
        <main className={styles.scroll}>
          <div className={styles.formCol}>
            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Full-Body Measurements</h2>
                <p className={styles.sectionSub}>
                  Optional — tap any field to record measurements now, or save and record during fitting.
                  Whatever you save here pre-fills orders for {watch('fullName') || 'this client'}.
                </p>
              </div>

              {apiError && <div className={styles.errorBanner}>{apiError}</div>}

              <StyleMeasureForm
                spec={bodySpec}
                values={bodyMeasurements}
                onChange={(key, value) => setBodyMeasurements((prev) => ({ ...prev, [key]: value }))}
              />

              <div className={styles.insetCard}>
                <div className={styles.field}>
                  <label className={styles.capsLabel} htmlFor="measurementNotes">Special Fitting / Posture Notes</label>
                  <textarea
                    id="measurementNotes"
                    className={styles.textarea}
                    placeholder="e.g. Dropped left shoulder, prefers high-waisted trousers, fitted sleeves."
                    value={measurementNotes}
                    onChange={(e) => setMeasurementNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </section>
          </div>
        </main>
      ) : (
      <main className={styles.scroll}>
        <div className={styles.formCol}>
          {/* Personal details */}
          <section className={styles.section}>
            <div>
              <div className={styles.titleRow}>
                <h2 className={styles.sectionTitle}>Client Profile</h2>
                {isContactPickerSupported && (
                  <button type="button" className={styles.importBtn} onClick={handleImportContact}>
                    <Symbol name="contact_phone" size={18} />
                    Import Contact
                  </button>
                )}
              </div>
              <p className={styles.sectionSub}>Enter essential details for their client record.</p>
            </div>

            {apiError && <div className={styles.errorBanner}>{apiError}</div>}

            <div className={styles.insetCard}>
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
                  <Symbol name="person" size={20} className={styles.inputIcon} />
                </div>
                {errors.fullName && <div className={styles.errorText}>{errors.fullName.message}</div>}
              </div>

              <div className={styles.hairlineDivider} />

              <div className={styles.field}>
                <label className={styles.capsLabel} htmlFor="phone">Phone Number (WhatsApp)</label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="phone"
                      placeholder="803 000 0000"
                      {...field}
                    />
                  )}
                />
                {errors.phone && <div className={styles.errorText}>{errors.phone.message}</div>}
              </div>

              {FEATURE_FLAGS.customerAddress && (
                <>
                  <div className={styles.hairlineDivider} />
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
                      <Symbol name="location_on" size={20} className={styles.inputIcon} />
                    </div>
                    {errors.address && <div className={styles.errorText}>{errors.address.message}</div>}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Demographics & preferences */}
          <section className={styles.section}>
            <div>
              <h2 className={styles.sectionTitle} style={{ fontSize: '18px' }}>Garment Preferences</h2>
            </div>

            <div className={styles.insetCard}>
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

              <div className={styles.hairlineDivider} />

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
                        {active && <Symbol name="check" size={16} />}
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
                      <Symbol name="add" size={16} />
                      Other
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      )}

      {/* Fixed glass action bar — portaled straight to document.body, see
          FixedBottomPortal for why. */}
      <FixedBottomPortal>
        <div className={styles.actionBar} data-collapsed={isCollapsed}>
          <div className={styles.actionBarInner}>
            {screen === 'measurements' ? (
              <>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setScreen('profile')}
                  disabled={submitting}
                >
                  Back
                </button>
                <div className={styles.actionGroupRight}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleSubmit((data) => onSubmit(data, false))}
                    disabled={submitting}
                  >
                    Save Profile Only
                  </button>
                  <button
                    type="button"
                    className={styles.createBtn}
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={submitting}
                  >
                    {submitting && <Symbol name="progress_activity" className="global-spinner" />}
                    Save & Start Order
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={submitting}>
                  Cancel
                </button>
                <div className={styles.actionGroupRight}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleSubmit((data) => onSubmit(data, false))}
                    disabled={submitting}
                  >
                    Save Profile
                  </button>
                  <button
                    type="button"
                    className={styles.createBtn}
                    onClick={handleSubmit(handleContinueToMeasurements)}
                    disabled={submitting}
                  >
                    Add Measurements
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </FixedBottomPortal>
    </div>
  );
}
