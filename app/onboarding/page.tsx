'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import { scrollContentToTop } from '@/lib/scrollToTop';

import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/app/auth-actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trackEvent } from '@/lib/analytics';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import { onboardingSchema, type OnboardingInput } from '@/lib/validations';
import { ROUTES } from '@/lib/routes';
import Symbol from '@/components/ui/Symbol/Symbol';
import AspirationalVision from './_components/AspirationalVision';
import styles from './page.module.css';

// Welcome-tour screens shown before the studio setup — grounded in
// features that ship (measurements capture, production pipeline + tracking)
const WELCOME_SCREENS = [
  {
    image: '/images/onboarding/tape-measure.png',
    imageWidth: 632,
    imageHeight: 454,
    title: 'Say goodbye to paper measurements',
    subtitle: "Capture every customer's measurements once — they are remembered automatically for every order after.",
  },
  {
    image: '/images/onboarding/production-tracking.png',
    imageWidth: 759,
    imageHeight: 548,
    title: 'Your studio, start to finish',
    subtitle: 'Track each order through cutting, sewing and delivery, assign staff, and share a live link so customers can watch their own progress.',
  },
];

// Helper to generate a clean URL slug from the studio name
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'your-studio'
  );
}

// Helper to compute a luxury 2-letter monogram
function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function OnboardingPage() {
  const router = useRouter();
  const { googleUserInfo, needsOnboarding, loading, refreshProfile } = useAuth();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 0, 1 = Welcome Carousel; 2 = Studio Identity; 3 = Operating Model; 4 = Operations & Focus
  const [step, setStep] = useState(0);

  useEffect(() => {
    scrollContentToTop();
  }, [step]);

  const isGoogleAccount = !!googleUserInfo?.isGoogleAccount;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      shopName: '',
      name: '',
      businessMode: 'bespoke',
      weeklyCapacity: '20',
      rtwSourcingMethod: 'in-house',
      goal: 'Always knowing what is happening with their order',
    },
  });

  const watchedShopName = watch('shopName') || '';
  const watchedBusinessMode = watch('businessMode') || 'bespoke';
  const watchedWeeklyCapacity = watch('weeklyCapacity') || '20';
  const watchedRtwSourcing = watch('rtwSourcingMethod') || 'in-house';
  const watchedGoal = watch('goal') || 'Always knowing what is happening with their order';

  // Google gives us no signup form, so pre-fill from Google profile
  const [prefilledGoogleName, setPrefilledGoogleName] = useState<string | null>(null);
  if (googleUserInfo?.name && googleUserInfo.name !== prefilledGoogleName) {
    setPrefilledGoogleName(googleUserInfo.name);
    if (isGoogleAccount) {
      setValue('name', googleUserInfo.name);
    }
  }

  // Redirect to login if user lands here without needing onboarding
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loading || initialCheckDone.current) return;
    initialCheckDone.current = true;
    if (!needsOnboarding) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, needsOnboarding, router]);

  useEffect(() => {
    for (const screen of WELCOME_SCREENS) {
      preload(screen.image, { as: 'image' });
    }
  }, []);

  const [showVision, setShowVision] = useState(false);
  const [confirmedShopName, setConfirmedShopName] = useState('');

  // Handle moving from Step 2 (Identity) to Step 3 (Operating Model)
  const handleProceedFromIdentity = async () => {
    setApiError('');
    const isValid = await trigger(['shopName', ...(isGoogleAccount ? ['name' as const] : [])]);
    if (isValid) {
      setStep(3);
    }
  };

  // Handle moving from Step 3 (Craft Mode) to Step 4 (Operations)
  const handleProceedFromCraftMode = () => {
    setApiError('');
    setStep(4);
  };

  const onSubmit = async (data: OnboardingInput) => {
    setApiError('');

    // For Google accounts, enforce name locally if required
    if (isGoogleAccount && (!data.name || data.name.trim().length < 2)) {
      setApiError('Please provide a valid full name');
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeOnboarding(
        data.shopName,
        data.goal,
        isGoogleAccount ? data.name : undefined,
        data.businessMode,
        data.weeklyCapacity,
        data.rtwSourcingMethod
      );

      if (result?.error) {
        setApiError(result.error);
        return;
      }

      trackEvent('onboarding_completed', {
        via: isGoogleAccount ? 'google' : 'email',
        goal: data.goal,
      });

      await refreshProfile();
      setConfirmedShopName(data.shopName);
      setShowVision(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not finish setting up your workspace');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !needsOnboarding) return null;

  if (showVision) {
    return <AspirationalVision shopName={confirmedShopName} onFinish={() => router.push(ROUTES.dashboard)} />;
  }

  // ── Welcome Tour Screens (Step 0 & 1) ──
  if (step < 2) {
    const screen = WELCOME_SCREENS[step];
    return (
      <div className={styles.container}>
        <div className={styles.ambientGlow} />
        <div className={styles.ambientGlowSecondary} />

        <div className={styles.glassCard}>
          <div className={styles.header}>
            <div className={styles.brandBadge}>
              <Symbol name="auto_awesome" size={13} />
              <span>Atelier Welcome</span>
            </div>
            <BrandIcon alt="MyStitchBook" className={styles.sewingMachineSvg} />
            <h1 className={styles.brandTitle}>MYSTITCHBOOK</h1>
          </div>

          <div className={styles.tourContainer} key={step}>
            <div className={styles.tourArtworkFrame}>
              <Image
                src={screen.image}
                alt=""
                width={screen.imageWidth}
                height={screen.imageHeight}
                priority={step === 0}
                className={styles.tourImage}
              />
            </div>
            <h2 className={styles.tourTitle}>{screen.title}</h2>
            <p className={styles.tourSubtitle}>{screen.subtitle}</p>
          </div>

          <div className={styles.tourDots}>
            <span className={step === 0 ? styles.tourDotActive : styles.tourDot} />
            <span className={step === 1 ? styles.tourDotActive : styles.tourDot} />
          </div>

          <div className={styles.tourActions}>
            <button type="button" className={styles.skipBtn} onClick={() => setStep(2)}>
              Skip Tour
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ maxWidth: '240px' }}
              onClick={() => setStep(step === 0 ? 1 : 2)}
            >
              <span>{step === 0 ? 'Next Feature' : 'Begin Studio Setup'}</span>
              <Symbol name="arrow_forward" size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Progressive Studio Setup (Steps 2, 3, 4) ──
  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />
      <div className={styles.ambientGlowSecondary} />

      <div className={styles.glassCard}>
        {/* Atelier Top Stepper */}
        <div className={styles.stepMeta}>
          <span>Atelier Setup</span>
          <span>
            Step {step - 1} of 3 • {step === 2 ? 'Studio Identity' : step === 3 ? 'Operating Model' : 'Operations & Focus'}
          </span>
        </div>

        <div className={styles.stepper}>
          <div className={`${styles.stepPill} ${step >= 2 ? styles.stepPillActive : ''}`} />
          <div className={`${styles.stepPill} ${step >= 3 ? styles.stepPillActive : ''}`} />
          <div className={`${styles.stepPill} ${step >= 4 ? styles.stepPillActive : ''}`} />
        </div>

        {apiError && (
          <div className={styles.errorBanner} role="alert">
            <Symbol name="running_with_errors" size={20} />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* ── STEP 2: Studio Identity ── */}
            {step === 2 && (
              <motion.div
                key="step-identity"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <h2 className={styles.cardTitle}>Name your atelier</h2>
                <p className={styles.cardSubtitle}>
                  This name appears on client invoices, live order tracking links, and your digital portfolio.
                </p>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {isGoogleAccount && (
                    <div>
                      <AuthInput
                        id="name"
                        type="text"
                        label="Your Full Name"
                        {...register('name')}
                      />
                      {errors.name && <div className={styles.errorText}>{errors.name.message}</div>}
                    </div>
                  )}

                  <div>
                    <AuthInput
                      id="shopName"
                      type="text"
                      label="Shop / Studio Name"
                      placeholder="e.g. Savile Row Atelier"
                      autoFocus
                      {...register('shopName')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleProceedFromIdentity();
                        }
                      }}
                    />
                    {errors.shopName && <div className={styles.errorText}>{errors.shopName.message}</div>}
                  </div>
                </div>

                {/* Real-time Studio Identity Preview */}
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewLabel}>Studio Badge Preview</span>
                    <span className={styles.verifiedBadge}>
                      <Symbol name="verified" size={14} />
                      <span>Verified Atelier</span>
                    </span>
                  </div>

                  <div className={styles.previewAtelierBody}>
                    <div className={styles.monogramSeal}>{getMonogram(watchedShopName)}</div>
                    <div className={styles.previewAtelierDetails}>
                      <h3 className={styles.previewShopName}>
                        {watchedShopName.trim() || 'Your Atelier'}
                      </h3>
                      <p className={styles.previewSlug}>
                        mystitchbook.com/studio/{slugify(watchedShopName)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.xpBonusPill}>
                    <Symbol name="workspace_premium" size={16} />
                    <span>+50 Studio XP awarded upon completion</span>
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setStep(1)}
                  >
                    <Symbol name="arrow_back" size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleProceedFromIdentity}
                    disabled={!watchedShopName.trim() || watchedShopName.trim().length < 2}
                  >
                    <span>Continue to Operating Model</span>
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Operating Model ── */}
            {step === 3 && (
              <motion.div
                key="step-craft"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <h2 className={styles.cardTitle}>Select your operating model</h2>
                <p className={styles.cardSubtitle}>
                  We calibrate your production board, client measurements, and inventory tools around your craft.
                </p>

                <div className={styles.cardsGrid}>
                  {/* Bespoke Option */}
                  <div
                    role="button"
                    tabIndex={0}
                    className={`${styles.selectionCard} ${
                      watchedBusinessMode === 'bespoke' ? styles.selectionCardActive : ''
                    }`}
                    onClick={() => setValue('businessMode', 'bespoke', { shouldValidate: true })}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setValue('businessMode', 'bespoke', { shouldValidate: true });
                      }
                    }}
                  >
                    <div className={styles.cardIconBox}>
                      <Symbol name="content_cut" size={24} />
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardRow}>
                        <h3 className={styles.cardHeading}>Custom & Bespoke</h3>
                        <span className={styles.cardTag}>Made to Measure</span>
                      </div>
                      <p className={styles.cardDescription}>
                        Cut and sew to individual client measurements. Pattern drafting, multiple fittings, and bespoke alterations.
                      </p>
                    </div>
                    <div className={styles.checkIndicator}>
                      {watchedBusinessMode === 'bespoke' && <Symbol name="check" size={14} />}
                    </div>
                  </div>

                  {/* Ready to Wear Option */}
                  <div
                    role="button"
                    tabIndex={0}
                    className={`${styles.selectionCard} ${
                      watchedBusinessMode === 'rtw' ? styles.selectionCardActive : ''
                    }`}
                    onClick={() => setValue('businessMode', 'rtw', { shouldValidate: true })}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setValue('businessMode', 'rtw', { shouldValidate: true });
                      }
                    }}
                  >
                    <div className={styles.cardIconBox}>
                      <Symbol name="checkroom" size={24} />
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardRow}>
                        <h3 className={styles.cardHeading}>Ready-to-Wear (RTW)</h3>
                        <span className={styles.cardTag}>Standard Sizing</span>
                      </div>
                      <p className={styles.cardDescription}>
                        Pre-produced garments in standard sizes (S, M, L, XL). Stock inventory management, instant sales & off-the-rack fulfillment.
                      </p>
                    </div>
                    <div className={styles.checkIndicator}>
                      {watchedBusinessMode === 'rtw' && <Symbol name="check" size={14} />}
                    </div>
                  </div>

                  {/* Hybrid Option */}
                  <div
                    role="button"
                    tabIndex={0}
                    className={`${styles.selectionCard} ${
                      watchedBusinessMode === 'hybrid' ? styles.selectionCardActive : ''
                    }`}
                    onClick={() => setValue('businessMode', 'hybrid', { shouldValidate: true })}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setValue('businessMode', 'hybrid', { shouldValidate: true });
                      }
                    }}
                  >
                    <div className={styles.cardIconBox}>
                      <Symbol name="layers" size={24} />
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardRow}>
                        <h3 className={styles.cardHeading}>Hybrid Atelier</h3>
                        <span className={styles.cardTag}>Full Atelier Suite</span>
                      </div>
                      <p className={styles.cardDescription}>
                        The complete tailoring studio. Made-to-measure custom commissions alongside seasonal ready-to-wear collections.
                      </p>
                    </div>
                    <div className={styles.checkIndicator}>
                      {watchedBusinessMode === 'hybrid' && <Symbol name="check" size={14} />}
                    </div>
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setStep(2)}
                  >
                    <Symbol name="arrow_back" size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleProceedFromCraftMode}
                  >
                    <span>Continue to Operations</span>
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Operations & Brand Reputation ── */}
            {step === 4 && (
              <motion.div
                key="step-operations"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <h2 className={styles.cardTitle}>Fine-tune your operations</h2>
                <p className={styles.cardSubtitle}>
                  Set your weekly rhythm and the core reputation you want clients to praise you for.
                </p>

                {/* Section A: Weekly Capacity (Bespoke or Hybrid) */}
                {(watchedBusinessMode === 'bespoke' || watchedBusinessMode === 'hybrid') && (
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <Symbol name="speed" size={18} />
                      <span>Weekly Garment Production Capacity</span>
                    </div>
                    <p className={styles.sectionSubtext}>
                      Helps your calendar warn your cutting room before you overbook.
                    </p>

                    <div className={styles.capacityGrid}>
                      {[
                        { val: '5', label: '1 – 5', desc: 'Artisan Solo' },
                        { val: '20', label: '6 – 20', desc: 'Active Studio' },
                        { val: '50', label: '21 – 50', desc: 'Growing Team' },
                        { val: '100', label: '51 – 100', desc: 'Production' },
                        { val: '500', label: '100+', desc: 'High Volume' },
                      ].map((item) => (
                        <div
                          key={item.val}
                          role="button"
                          tabIndex={0}
                          className={`${styles.capacityChip} ${
                            watchedWeeklyCapacity === item.val ? styles.capacityChipActive : ''
                          }`}
                          onClick={() => setValue('weeklyCapacity', item.val, { shouldValidate: true })}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setValue('weeklyCapacity', item.val, { shouldValidate: true });
                            }
                          }}
                        >
                          <span className={styles.capacityNum}>{item.label}</span>
                          <span className={styles.capacityDesc}>{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section B: RTW Sourcing Method (RTW or Hybrid) */}
                {(watchedBusinessMode === 'rtw' || watchedBusinessMode === 'hybrid') && (
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <Symbol name="inventory_2" size={18} />
                      <span>Ready-to-Wear Sourcing Method</span>
                    </div>
                    <p className={styles.sectionSubtext}>
                      Configures stock replenishment and inventory tracking.
                    </p>

                    <div className={styles.cardsGrid} style={{ marginTop: '4px' }}>
                      {[
                        {
                          val: 'in-house',
                          icon: 'precision_manufacturing',
                          title: 'Manufacture in-house',
                          desc: 'Cut & sew your standard sizes internally.',
                        },
                        {
                          val: 'wholesale',
                          icon: 'storefront',
                          title: 'Source externally',
                          desc: 'Procure ready-made inventory from trusted vendors.',
                        },
                        {
                          val: 'both',
                          icon: 'layers',
                          title: 'Both methods',
                          desc: 'In-house production combined with wholesale inventory.',
                        },
                      ].map((sourcing) => (
                        <div
                          key={sourcing.val}
                          role="button"
                          tabIndex={0}
                          className={`${styles.selectionCard} ${
                            watchedRtwSourcing === sourcing.val ? styles.selectionCardActive : ''
                          }`}
                          style={{ minHeight: '60px', padding: '10px 14px' }}
                          onClick={() => setValue('rtwSourcingMethod', sourcing.val as 'in-house' | 'wholesale' | 'both', { shouldValidate: true })}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setValue('rtwSourcingMethod', sourcing.val as 'in-house' | 'wholesale' | 'both', { shouldValidate: true });
                            }
                          }}
                        >
                          <div className={styles.cardIconBox} style={{ width: '38px', height: '38px' }}>
                            <Symbol name={sourcing.icon} size={20} />
                          </div>
                          <div className={styles.cardContent}>
                            <h4 className={styles.cardHeading} style={{ fontSize: 'var(--sf-text-sm)' }}>
                              {sourcing.title}
                            </h4>
                            <p className={styles.cardDescription}>{sourcing.desc}</p>
                          </div>
                          <div className={styles.checkIndicator}>
                            {watchedRtwSourcing === sourcing.val && <Symbol name="check" size={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section C: Studio Reputation / Main Goal */}
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <Symbol name="auto_awesome" size={18} />
                    <span>What do you want clients to know you for?</span>
                  </div>
                  <p className={styles.sectionSubtext}>
                    Displayed on your daily studio dashboard to keep your team aligned.
                  </p>

                  <div className={styles.goalGrid}>
                    {[
                      {
                        val: 'Always knowing what is happening with their order',
                        icon: 'visibility',
                        label: 'Always knowing what is happening with their order',
                      },
                      {
                        val: 'Keeping my word on delivery dates',
                        icon: 'schedule',
                        label: 'Keeping my word on delivery dates',
                      },
                      {
                        val: 'Remembering every customer details',
                        icon: 'assignment',
                        label: "Remembering every customer's details",
                      },
                      {
                        val: 'Running a more organised business',
                        icon: 'storefront',
                        label: 'Running a more organised business',
                      },
                    ].map((g) => (
                      <div
                        key={g.val}
                        role="button"
                        tabIndex={0}
                        className={`${styles.goalCard} ${
                          watchedGoal === g.val ? styles.goalCardActive : ''
                        }`}
                        onClick={() => setValue('goal', g.val, { shouldValidate: true })}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setValue('goal', g.val, { shouldValidate: true });
                          }
                        }}
                      >
                        <div className={styles.goalIconBox}>
                          <Symbol name={g.icon} size={18} />
                        </div>
                        <span className={styles.goalText}>{g.label}</span>
                        <div className={styles.checkIndicator}>
                          {watchedGoal === g.val && <Symbol name="check" size={14} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setStep(3)}
                    disabled={submitting}
                  >
                    <Symbol name="arrow_back" size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Symbol name="progress_activity" size={18} className="global-spinner" />
                        <span>Crafting Atelier Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch Atelier Workspace</span>
                        <Symbol name="workspace_premium" size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
