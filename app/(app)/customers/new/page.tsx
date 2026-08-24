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
  // Second screen of this same step: full-body measurements, entirely
  // optional — every field can be left blank and Skip moves on exactly
  // like Continue does, just without saving any numbers.
  const [screen, setScreen] = useState<'profile' | 'measurements'>('profile');
  const [bodyMeasurements, setBodyMeasurements] = useState<Record<string, string>>({});
  const bodySpec = FULL_BODY_MEASUREMENTS[gender];

  // Same page, two full content swaps — reset scroll on each so Continue
  // doesn't land the measurements screen mid-scroll from the profile form.
  useEffect(() => {
    scrollContentToTop();
  }, [screen]);

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
      const normalizedPhone = data.phone.trim();
      const duplicate = customers.find((c) => c.whatsappNumber === normalizedPhone);

      if (duplicate) {
        setApiError(`A client with the number ${normalizedPhone} already exists (${duplicate.fullName}).`);
        setSubmitting(false);
        return;
      }

      const measurements: Record<string, number> = {};
      for (const [key, value] of Object.entries(bodyMeasurements)) {
        const num = parseFloat(value);
        if (!isNaN(num)) measurements[key] = num;
      }
      const customer = await addCustomer({
        fullName: data.fullName.trim(),
        whatsappNumber: normalizedPhone,
        gender: data.gender,
        address: data.address?.trim() || undefined,
        preferredStyles: data.preferredStyles || [],
        measurements,
      });
      showToast(`${customer.fullName} added to customers`, 'success');
      trackEvent('customer_created');
      // Step 3: hand straight into the order wizard, pre-filled.
      router.replace(ROUTES.orderNewForCustomer(customer.id));
    } catch (err) {
      // The client-side duplicate check above reads from the local (SWR)
      // customer list, which can be a beat stale — e.g. another staff
      // member just added the same number. The DB's own unique constraint
      // (unique_shop_whatsapp) is the real guard; surface ITS rejection
      // with the same friendly wording instead of a raw Postgres error.
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('unique_shop_whatsapp') || message.toLowerCase().includes('duplicate key')) {
        setApiError(`A client with the number ${data.phone.trim()} already exists.`);
      } else {
        setApiError(message || 'Could not create the profile — check your connection and try again.');
      }
      setSubmitting(false);
    }
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
            <span className={styles.stepLabel}>Step 2 of 3</span>
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
          <div className={styles.progressFill} />
        </div>
      </header>

      {screen === 'measurements' ? (
        <main className={styles.scroll}>
          <div className={styles.formCol}>
            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Full-Body Measurements</h2>
                <p className={styles.sectionSub}>
                  Optional — tap a card to fill it in, or skip the whole thing and take these at fitting instead.
                  Whatever you save here pre-fills every garment&apos;s measurements for {watch('fullName') || 'this client'} from now on.
                </p>
              </div>
              <StyleMeasureForm
                spec={bodySpec}
                values={bodyMeasurements}
                onChange={(key, value) => setBodyMeasurements((prev) => ({ ...prev, [key]: value }))}
              />
            </section>
          </div>
        </main>
      ) : (
      <main className={styles.scroll}>
        <div className={styles.formCol}>
          {/* Personal details */}
          <section className={styles.section}>
            <div>
              <h2 className={styles.sectionTitle}>Client Profile</h2>
              <p className={styles.sectionSub}>Enter the essential details for their client record.</p>
            </div>

            {apiError && <div className={styles.errorBanner}>{apiError}</div>}

            <div className={styles.fieldRow}>
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
                {errors.fullName && <div className={styles.errorText}>{errors.fullName.message}</div>}
              </div>

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
                {errors.address && <div className={styles.errorText}>{errors.address.message}</div>}
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
      )}

      {/* Fixed glass action bar — portaled straight to document.body, see
          FixedBottomPortal for why. */}
      <FixedBottomPortal>
        <div className={styles.actionBar} data-collapsed={isCollapsed}>
          <div className={styles.actionBarInner}>
            {screen === 'measurements' ? (
              <>
                <button type="button" className={styles.cancelBtn} onClick={handleSubmit(onSubmit)} disabled={submitting}>
                  Skip for now
                </button>
                <button type="button" className={styles.createBtn} onClick={handleSubmit(onSubmit)} disabled={submitting}>
                  {submitting && <Symbol name="progress_activity" className="global-spinner" />}
                  Create Profile & Proceed
                  <Symbol name="arrow_forward" size={22} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
                  Cancel
                </button>
                <button type="button" className={styles.createBtn} onClick={handleSubmit(() => setScreen('measurements'))} disabled={submitting}>
                  Continue
                  <Symbol name="arrow_forward" size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      </FixedBottomPortal>
    </div>
  );
}
