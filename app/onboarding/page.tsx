'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaRulerCombined, FaClipboardList } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/app/auth-actions';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import styles from './page.module.css';

// Welcome-tour screens shown before the setup form below — grounded in
// features that actually ship (measurement reuse, the production board +
// shareable tracking link), not generic onboarding copy.
const WELCOME_SCREENS = [
  {
    icon: <FaRulerCombined />,
    title: 'Say goodbye to paper measurements',
    subtitle: "Capture every customer's measurements once — they're remembered automatically for every order after.",
  },
  {
    icon: <FaClipboardList />,
    title: 'Your studio, start to finish',
    subtitle: 'Track each order through cutting, sewing and delivery, assign staff, and share a live link so customers can watch their own progress.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { googleUserInfo, needsOnboarding, loading, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 0/1 = welcome carousel screens, 2 = the actual setup form below.
  const [step, setStep] = useState(0);

  // Google gives us no signup form, so there's no name to carry over yet —
  // pre-fill from their Google profile and let them confirm/edit it here.
  // Email signups already gave a name at signup, so this field is skipped
  // entirely for them (see the conditional render below). Adjusted during
  // render (guarded so it only fires once, when the async profile name
  // actually arrives) rather than in an effect, so it never clobbers the
  // user's own edits afterward.
  const [prefilledGoogleName, setPrefilledGoogleName] = useState<string | null>(null);
  if (googleUserInfo?.name && googleUserInfo.name !== prefilledGoogleName) {
    setPrefilledGoogleName(googleUserInfo.name);
    setName(googleUserInfo.name);
  }

  // If someone lands here without an in-progress sign-in, send them
  // back to login rather than showing a dead-end form. This must only ever
  // check once, on the initial load — otherwise a *successful* submission
  // (which also flips `needsOnboarding` to false, via refreshProfile) races
  // this same effect against the handler's own `router.push('/dashboard')`,
  // intermittently bouncing a freshly-onboarded user back to /login instead.
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loading || initialCheckDone.current) return;
    initialCheckDone.current = true;
    if (!needsOnboarding) {
      router.replace('/login');
    }
  }, [loading, needsOnboarding, router]);

  const isGoogleAccount = !!googleUserInfo?.isGoogleAccount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!shopName || (isGoogleAccount && !name)) {
      setError('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding(shopName, isGoogleAccount ? name : undefined);
      await refreshProfile();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish setting up your workspace');
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
          <div className={styles.carouselIcon}>{screen.icon}</div>
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
        <Image src="/images/logo-mark.png" alt="MyStitchBook" width={496} height={496} className={`${styles.sewingMachineSvg} brandLogoAuto`} />
      </div>
      <h1 className={styles.brandTitle}>MYSTITCHBOOK</h1>
      <p className={styles.subheading}>
        Almost there — tell us a bit about your studio to finish setting up your workspace.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {isGoogleAccount && (
          <AuthInput
            id="name"
            type="text"
            label="Your Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <AuthInput
          id="shopName"
          type="text"
          label="Shop / Studio Name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          required
        />

        <button type="submit" className={styles.loginButton} disabled={submitting} style={{ marginTop: '12px' }}>
          {submitting ? 'Setting up...' : 'Finish Setup'}
        </button>
      </form>
    </div>
  );
}
