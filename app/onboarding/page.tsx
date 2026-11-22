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
import { APP_CONFIG } from '@/lib/config';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import AspirationalVision from './_components/AspirationalVision';
import styles from './page.module.css';

const ONBOARDING_SAMPLE_PORTFOLIO = [
  {
    id: 'sample-suit',
    name: 'Italian Wool 2-Piece Suit',
    price: '₦85,000',
    image: '/images/garments/suit-male.jpg',
    tag: 'Bespoke',
  },
  {
    id: 'sample-agbada',
    name: 'Grand Ceremonial Agbada',
    price: '₦120,000',
    image: '/images/garments/agbada-male.jpg',
    tag: 'Ceremonial',
  },
  {
    id: 'sample-senator',
    name: 'Classic Tailored Senator',
    price: '₦45,000',
    image: '/images/garments/senator-male.jpg',
    tag: 'Signature',
  },
];

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

  // 0, 1 = Optional Welcome Carousel; 2 = Shop Name; 3 = What You Make; 4 = Sales Target & Goals
  // Default directly to Step 2 so tailors start immediately without carousel friction
  const [step, setStep] = useState(2);

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
      name: googleUserInfo?.name || '',
      businessMode: 'bespoke',
      weeklyCapacity: '20',
      rtwSourcingMethod: 'in-house',
      goal: 'Always knowing what is happening with their order',
      teamSize: '1-2',
      apprenticeNames: '',
    },
  });

  const watchedShopName = watch('shopName') || '';
  const watchedBusinessMode = watch('businessMode') || 'bespoke';
  const watchedWeeklyCapacity = watch('weeklyCapacity') || '20';
  const watchedRtwSourcing = watch('rtwSourcingMethod') || 'in-house';
  const watchedGoal = watch('goal') || 'Always knowing what is happening with their order';
  const watchedTeamSize = watch('teamSize') || '1-2';

  // Google gives us no signup form, so silently pre-fill from Google profile
  useEffect(() => {
    if (isGoogleAccount && googleUserInfo?.name) {
      setValue('name', googleUserInfo.name);
    }
  }, [isGoogleAccount, googleUserInfo?.name, setValue]);

  const [showVision, setShowVision] = useState(false);
  const [confirmedShopName, setConfirmedShopName] = useState('');

  // Redirect to dashboard if user lands here without needing onboarding
  useEffect(() => {
    if (loading) return;
    if (!needsOnboarding && !showVision) {
      router.replace(ROUTES.dashboard);
    }
  }, [loading, needsOnboarding, showVision, router]);

  useEffect(() => {
    for (const screen of WELCOME_SCREENS) {
      preload(screen.image, { as: 'image' });
    }
  }, []);

  // Handle moving from Step 2 (Identity) directly to Step 4 (Workshop Focus)
  // Operating model defaults to bespoke
  const handleProceedFromIdentity = async () => {
    setApiError('');
    const isValid = await trigger(['shopName', ...(isGoogleAccount ? ['name' as const] : [])]);
    if (isValid) {
      setValue('businessMode', 'bespoke', { shouldValidate: true });
      setStep(4);
    }
  };

  // Handle moving from Step 3 (Craft Mode) to Step 4 (Operations)
  const handleProceedFromCraftMode = () => {
    setApiError('');
    if (watchedBusinessMode === 'rtw' && watchedGoal === 'Always knowing what is happening with their order') {
      setValue('goal', 'Instant off-the-rack availability', { shouldValidate: true });
    } else if (watchedBusinessMode !== 'rtw' && watchedGoal === 'Instant off-the-rack availability') {
      setValue('goal', 'Always knowing what is happening with their order', { shouldValidate: true });
    }
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

  if (showVision) {
    return (
      <AspirationalVision
        shopName={confirmedShopName}
        businessMode={watchedBusinessMode}
        onFinish={() => {
          window.location.href = ROUTES.dashboard;
        }}
      />
    );
  }

  if (loading || !needsOnboarding) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Preparing your workshop...</p>
      </div>
    );
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
              <span>Welcome</span>
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
            {step === 0 ? (
              <>
                <button type="button" className={styles.skipBtn} onClick={() => setStep(2)}>
                  Skip to Setup
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ maxWidth: '240px' }}
                  onClick={() => setStep(1)}
                >
                  <span>Next</span>
                  <Symbol name="arrow_forward" size={18} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className={styles.skipBtn} onClick={() => setStep(0)}>
                  <Symbol name="arrow_back" size={16} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ maxWidth: '240px' }}
                  onClick={() => setStep(2)}
                >
                  <span>Start Shop Setup</span>
                  <Symbol name="arrow_forward" size={18} />
                </button>
              </>
            )}
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
        {/* Top Stepper */}
        <div className={styles.stepMeta}>
          <span>Shop Setup</span>
          <span>
            Step {step - 1} of 3 • {step === 2 ? 'Shop Name' : step === 3 ? 'What You Make' : 'Workshop Focus'}
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
                <h2 className={styles.cardTitle}>Name your shop or brand</h2>
                <p className={styles.cardSubtitle}>
                  This name appears on client invoices, live order tracking links, and your digital portfolio.
                </p>

                <div className={styles.formFields}>
                  {isGoogleAccount && !googleUserInfo?.name && (
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
                      label="Shop / Brand Name"
                      placeholder="e.g. Savile Row Tailors"
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

                {/* Real-time Digital Portfolio & Lookbook Preview */}
                <div className={styles.previewSection}>
                  <div className={styles.previewHeader}>
                    <div className={styles.previewHeaderLeft}>
                      <span className={styles.previewUrlBadge}>
                        <Symbol name="lock" size={12} />
                        <span>{APP_CONFIG.domain}/studio/{slugify(watchedShopName)}</span>
                      </span>
                      <span className={styles.previewPill}>Public Portfolio Preview</span>
                    </div>
                    <span className={styles.verifiedBadge}>
                      <Symbol name="verified" size={13} />
                      <span>Verified Tailor</span>
                    </span>
                  </div>

                  <div className={styles.previewShopBanner}>
                    <div className={styles.previewShopDetails}>
                      <h3 className={styles.previewShopName}>
                        {watchedShopName.trim() || 'Your Workshop Name'}
                      </h3>
                      <p className={styles.previewTagline}>
                        {watchedBusinessMode === 'rtw'
                          ? 'Ready-to-Wear Showroom & Curated Ensembles'
                          : watchedBusinessMode === 'hybrid'
                          ? 'Bespoke Custom Tailoring & Ready-to-Wear'
                          : 'Bespoke Tailoring & Made-to-Measure'}
                      </p>
                    </div>
                    <div className={styles.previewDirectOrder}>
                      <WhatsappIcon size={13} />
                      <span>WhatsApp Inquiries</span>
                    </div>
                  </div>

                  {/* Real Sample Work Showcase */}
                  <div className={styles.sampleWorkSection}>
                    <div className={styles.sampleWorkHeader}>
                      <span className={styles.sampleWorkTitle}>Lookbook Sample Work</span>
                      <span className={styles.sampleWorkSub}>Published to your public catalogue</span>
                    </div>
                    <div className={styles.sampleWorkGrid}>
                      {ONBOARDING_SAMPLE_PORTFOLIO.map((item) => (
                        <div key={item.id} className={styles.sampleWorkCard}>
                          <div className={styles.sampleImgFrame}>
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="(max-width: 600px) 30vw, 150px"
                              className={styles.sampleImg}
                            />
                            <span className={styles.sampleTag}>{item.tag}</span>
                          </div>
                          <div className={styles.sampleMeta}>
                            <span className={styles.sampleName}>{item.name}</span>
                            <span className={styles.samplePrice}>From {item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.trustBadgePill}>
                    <Symbol name="workspace_premium" size={15} />
                    <span>
                      {watchedBusinessMode === 'bespoke'
                        ? 'Measurement book & client progress tracking included'
                        : watchedBusinessMode === 'rtw'
                        ? 'Showroom & instant WhatsApp catalogue included'
                        : 'Full tailoring workshop & showroom included'}
                    </span>
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleProceedFromIdentity}
                    disabled={!watchedShopName.trim() || watchedShopName.trim().length < 2}
                  >
                    <span>Next: Workshop Focus</span>
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Operating Model (Commented out: defaulting to Bespoke) ── */}
            {/* {step === 3 && (
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
                        <h3 className={styles.cardHeading}>Custom &amp; Bespoke</h3>
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
                        Pre-produced garments in standard sizes (S, M, L, XL). Stock inventory management, instant sales &amp; off-the-rack fulfillment.
                      </p>
                    </div>
                    <div className={styles.checkIndicator}>
                      {watchedBusinessMode === 'rtw' && <Symbol name="check" size={14} />}
                    </div>
                  </div>

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
                        <h3 className={styles.cardHeading}>Custom &amp; Ready-to-Wear</h3>
                        <span className={styles.cardTag}>Full Suite</span>
                      </div>
                      <p className={styles.cardDescription}>
                        The complete tailoring shop. Custom orders from scratch alongside off-the-rack garments.
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
                    <span>Continue to Workshop Focus</span>
                    <Symbol name="arrow_forward" size={18} />
                  </button>
                </div>
              </motion.div>
            )} */}

            {/* ── STEP 4: Workshop Focus ── */}
            {step === 4 && (
              <motion.div
                key="step-operations"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <h2 className={styles.cardTitle}>Set your workshop focus</h2>
                <p className={styles.cardSubtitle}>
                  Choose the core reputation you want clients to praise you for.
                </p>

                {/* Section A: Studio Reputation / Main Goal */}
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <Symbol name="auto_awesome" size={18} />
                    <span>What do you want clients to know you for?</span>
                  </div>
                  <p className={styles.sectionSubtext}>
                    Displayed on your daily studio dashboard to keep your team aligned.
                  </p>

                  <div className={styles.goalGrid}>
                    {(watchedBusinessMode === 'rtw' ? [
                      {
                        val: 'Instant off-the-rack availability',
                        icon: 'checkroom',
                        label: 'Always having popular sizes in stock',
                      },
                      {
                        val: 'Fast delivery & instant WhatsApp ordering',
                        icon: 'bolt',
                        label: 'Fast delivery & instant WhatsApp ordering',
                      },
                      {
                        val: 'High quality ready-to-wear finishes',
                        icon: 'verified',
                        label: 'High quality ready-to-wear finishes',
                      },
                      {
                        val: 'Running a more organised business',
                        icon: 'storefront',
                        label: 'Running a more organised retail business',
                      },
                    ] : [
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
                    ]).map((g) => (
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
                    onClick={() => setStep(2)}
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
                        <span>Setting up your shop...</span>
                      </>
                    ) : (
                      <>
                        <span>Open My Shop</span>
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
