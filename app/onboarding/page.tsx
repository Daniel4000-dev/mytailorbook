'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import styles from './page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

// Welcome-tour screens shown before the setup form below — grounded in
// features that actually ship (measurement reuse, the production board +
// shareable tracking link), not generic onboarding copy.
const WELCOME_SCREENS = [
  {
    image: '/images/onboarding/tape-measure.png',
    imageWidth: 632,
    imageHeight: 454,
    // Only this screen bleeds off the left edge — the tape's diagonal
    // shape reads naturally as "entering from off-screen." The second
    // screen's illustration is a centered, symmetrical composition (shirt
    // + checkmarks + phone) that doesn't have a natural leading edge to
    // bleed from, so it stays centered like the text under it.
    bleedLeft: true,
    title: 'Say goodbye to paper measurements',
    subtitle: "Capture every customer's measurements once — they're remembered automatically for every order after.",
  },
  {
    image: '/images/onboarding/production-tracking.png',
    imageWidth: 759,
    imageHeight: 548,
    title: 'Your studio, start to finish',
    subtitle: 'Track each order through cutting, sewing and delivery, assign staff, and share a live link so customers can watch their own progress.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { googleUserInfo, needsOnboarding, loading, refreshProfile } = useAuth();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 0/1 = welcome carousel screens, 2 = the actual setup form below.
  const [step, setStep] = useState(0);

  // The carousel-to-form transition is a full content swap on one page,
  // not a real navigation — reset scroll so the (potentially long) setup
  // form doesn't open mid-scroll from wherever the carousel left off.
  useEffect(() => {
    scrollContentToTop();
  }, [step]);

  const isGoogleAccount = !!googleUserInfo?.isGoogleAccount;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  });

  // Google gives us no signup form, so there's no name to carry over yet —
  // pre-fill from their Google profile and let them confirm/edit it here.
  const [prefilledGoogleName, setPrefilledGoogleName] = useState<string | null>(null);
  if (googleUserInfo?.name && googleUserInfo.name !== prefilledGoogleName) {
    setPrefilledGoogleName(googleUserInfo.name);
    if (isGoogleAccount) {
      setValue('name', googleUserInfo.name);
    }
  }

  // If someone lands here without an in-progress sign-in, send them
  // back to login rather than showing a dead-end form.
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

  const onSubmit = async (data: OnboardingInput) => {
    setApiError('');
    
    // For Google accounts, enforce name locally if required
    if (isGoogleAccount && (!data.name || data.name.trim().length < 2)) {
      setApiError('Please provide a valid name');
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeOnboarding(data.shopName, isGoogleAccount ? data.name : undefined);
      if (result?.error) {
        setApiError(result.error);
        return;
      }
      trackEvent('onboarding_completed', { via: isGoogleAccount ? 'google' : 'email' });
      await refreshProfile();
      router.push(ROUTES.dashboard);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not finish setting up your workspace');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !needsOnboarding) return null;

  if (step < 2) {
    const screen = WELCOME_SCREENS[step];
    return (
      <div className={styles.container}>
        <div className={styles.carousel} key={step}>
          <Image
            src={screen.image}
            alt=""
            width={screen.imageWidth}
            height={screen.imageHeight}
            priority={step === 0}
            className={`${styles.carouselImage} ${screen.bleedLeft ? styles.carouselImageBleed : ''}`}
          />
          <h1 className={styles.carouselTitle}>{screen.title}</h1>
          <p className={styles.carouselSubtitle}>{screen.subtitle}</p>
        </div>

        <div className={styles.dots}>
          <span className={step === 0 ? styles.dotActive : styles.dot} />
          <span className={step === 1 ? styles.dotActive : styles.dot} />
        </div>

        <div className={styles.carouselActions}>
          <button type="button" className={styles.skipBtn} onClick={() => setStep(2)}>
            Skip
          </button>
          <button type="button" className={styles.nextBtn} onClick={() => setStep(step === 0 ? 1 : 2)}>
            {step === 0 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <BrandIcon alt="MyStitchBook" className={styles.sewingMachineSvg} />
      </div>
      <h1 className={styles.brandTitle}>MYSTITCHBOOK</h1>
      <p className={styles.subheading}>
        Almost there — tell us a bit about your studio to finish setting up your workspace.
      </p>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {apiError && <div className={styles.errorBanner}>{apiError}</div>}

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

        <div style={{ marginTop: isGoogleAccount ? '1rem' : '0' }}>
          <AuthInput
            id="shopName"
            type="text"
            label="Shop / Studio Name"
            {...register('shopName')}
          />
          {errors.shopName && <div className={styles.errorText}>{errors.shopName.message}</div>}
        </div>

        <button type="submit" className={styles.loginButton} disabled={submitting} style={{ marginTop: '24px' }}>
          {submitting && <Symbol name="progress_activity" className="global-spinner" />}
          {submitting ? 'Setting up...' : 'Finish Setup'}
        </button>
      </form>
    </div>
  );
}
