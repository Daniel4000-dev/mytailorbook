'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Button from '@/components/ui/Button/Button';
import Symbol from '@/components/ui/Symbol/Symbol';
import { scrollContentToTop } from '@/lib/scrollToTop';
import {
  initializeSubscription,
  confirmSubscriptionPayment,
  startFreeTrial,
  confirmFreeTrial,
  cancelSubscriptionAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
} from '@/app/actions/payments';
import {
  PREMIUM_MONTHLY_PRICE_NGN,
  PREMIUM_YEARLY_PRICE_NGN,
  TRIAL_VERIFICATION_AMOUNT_NGN,
  PLAN_TIERS,
  type PlanTierType,
} from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function BillingSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentShop, orders, staffMembers, refreshShop } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [cancelling, setCancelling] = useState(false);
  const [cancelStep, setCancelStep] = useState<'plans' | 'why-stay' | 'why-leave' | 'pause'>('plans');
  const [cancelReason, setCancelReason] = useState<string | null>(null);

  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [pauseMonths, setPauseMonths] = useState<1 | 2 | 3>(2);
  const [pauseReason, setPauseReason] = useState<string>('Seasonal lull after holidays');

  useEffect(() => {
    scrollContentToTop();
  }, [cancelStep]);

  // See original comment in settings/page.tsx (now removed from there): a
  // bfcache restore after a Paystack redirect can resurrect this page with
  // upgrading still true from before the user ever left.
  useEffect(() => {
    const handlePageShow = () => setUpgrading(false);
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const ordersThisMonth = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return orders.filter((o) => new Date(o.createdAt) >= start).length;
  }, [orders]);

  const activeStaffCount = staffMembers.filter((s) => s.active !== false).length;

  const currentMode = (currentShop?.businessMode || 'bespoke') as PlanTierType;
  const [selectedPlanTab, setSelectedPlanTab] = useState<PlanTierType>(currentMode);

  useEffect(() => {
    if (currentShop?.businessMode) {
      setSelectedPlanTab(currentShop.businessMode as PlanTierType);
    }
  }, [currentShop?.businessMode]);

  const activePlanConfig = PLAN_TIERS[selectedPlanTab] || PLAN_TIERS.bespoke;
  const planPriceMonthly = activePlanConfig.monthlyPriceNgn;
  const planPriceYearly = activePlanConfig.yearlyPriceNgn;

  const [nowMs] = useState(() => Date.now());
  const graceDaysLeft = currentShop?.graceExpiresAt
    ? Math.max(1, Math.ceil((new Date(currentShop.graceExpiresAt).getTime() - nowMs) / (24 * 60 * 60 * 1000)))
    : null;
  const trialDaysLeft = currentShop?.trialEndsAt
    ? Math.max(1, Math.ceil((new Date(currentShop.trialEndsAt).getTime() - nowMs) / (24 * 60 * 60 * 1000)))
    : null;
  const trialEligible = currentShop?.subscriptionStatus === 'free' && !currentShop?.trialUsedAt;

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return;
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) return;

    const flagKey = `payment-confirmed-${reference}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, '1');

    router.replace(ROUTES.settingsBilling);

    confirmSubscriptionPayment(reference)
      .then(() => {
        showToast('Payment successful — you\'re now on Premium', 'success');
        refreshShop();
      })
      .catch((err) => {
        console.error('confirmSubscriptionPayment (redirect path) failed:', err);
        showToast('We could not confirm your payment yet — it may still be processing.', 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('trial') !== 'success') return;
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) return;

    const flagKey = `trial-confirmed-${reference}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, '1');

    router.replace(ROUTES.settingsBilling);

    confirmFreeTrial(reference)
      .then(() => {
        showToast('Your free 30-day trial has started!', 'success');
        refreshShop();
      })
      .catch((err) => {
        console.error('confirmFreeTrial (redirect path) failed:', err);
        showToast('We could not confirm your trial yet — it may still be processing.', 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleUpgrade = (interval: 'monthly' | 'yearly' = 'monthly') => {
    setUpgrading(true);
    initializeSubscription(interval)
      .then(({ authorizationUrl }) => {
        window.location.href = authorizationUrl;
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Upgrade failed', 'error');
        setUpgrading(false);
      });
  };

  const handleStartTrial = (interval: 'monthly' | 'yearly' = 'monthly') => {
    setUpgrading(true);
    startFreeTrial(interval)
      .then(({ authorizationUrl }) => {
        window.location.href = authorizationUrl;
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Could not start trial', 'error');
        setUpgrading(false);
      });
  };

  const openCancelFlow = () => {
    setCancelStep('why-stay');
    setCancelReason(null);
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      const result = await cancelSubscriptionAction();
      if ('error' in result) {
        showToast(result.error, 'error');
        return;
      }
      const until = result.accessUntil ? new Date(result.accessUntil).toLocaleDateString('en-NG', { month: 'long', day: 'numeric' }) : null;
      showToast(
        until ? `Subscription canceled — Premium stays active until ${until}` : 'Subscription canceled',
        'success'
      );
      setCancelStep('plans');
      refreshShop();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not cancel — please try again', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const openPauseFlow = () => {
    if (currentShop?.subscriptionStatus !== 'active') {
      showToast('Subscription pause is only available on an active paid subscription.', 'info');
      return;
    }
    setCancelStep('pause');
  };

  const handleConfirmPause = async () => {
    setPausing(true);
    try {
      const result = await pauseSubscriptionAction(pauseMonths, pauseReason);
      if ('error' in result) {
        showToast(result.error, 'error');
        return;
      }
      const resumeDate = new Date(result.pauseEndsAt).toLocaleDateString('en-NG', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      showToast(`Subscription paused for ${pauseMonths} month(s) until ${resumeDate}. Your lookbook pictures are safe!`, 'success');
      setCancelStep('plans');
      refreshShop();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not pause subscription', 'error');
    } finally {
      setPausing(false);
    }
  };

  const handleResumeSubscription = async () => {
    setResuming(true);
    try {
      const result = await resumeSubscriptionAction();
      if ('error' in result) {
        showToast(result.error, 'error');
        return;
      }
      if ('needsCheckout' in result) {
        showToast('Please confirm your payment method to reactivate your plan.', 'info');
        handleUpgrade(billingInterval);
        return;
      }
      showToast('Welcome back! Your subscription has resumed successfully.', 'success');
      refreshShop();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not resume subscription', 'error');
    } finally {
      setResuming(false);
    }
  };

  return (
    <PageLayout width="narrow" header={<TopBar title="Billing & Subscription" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
      {cancelStep === 'plans' && (
        <>
          {currentShop?.subscriptionStatus === 'paused' && (
            <div className={styles.pauseBanner}>
              <div className={styles.pauseBannerHeader}>
                <div className={styles.pauseBannerTitle}>
                  <Symbol name="pause_circle" size={20} />
                  <span>Subscription Paused</span>
                </div>
                <span className={styles.pauseBadge}>
                  {currentShop.subscriptionPauseMonths || 2} {currentShop.subscriptionPauseMonths === 1 ? 'Month' : 'Months'}
                </span>
              </div>
              <p className={styles.pauseBannerBody}>
                Your workshop subscription is currently on an off-season breath. Your catalogue pictures and customer albums are <strong>100% preserved and protected</strong> from being cleared.
                {currentShop.subscriptionPauseEndsAt && (
                  <> Scheduled to resume on <strong>{new Date(currentShop.subscriptionPauseEndsAt).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</>
                )}
              </p>
              <Button variant="primary" loading={resuming} onClick={handleResumeSubscription}>
                <Symbol name="play_arrow" size={16} /> Resume Subscription Now
              </Button>
            </div>
          )}

          <div className={styles.intervalToggle} role="tablist" aria-label="Billing interval">
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === 'monthly'}
              className={`${styles.intervalOption} ${billingInterval === 'monthly' ? styles.intervalOptionActive : ''}`}
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === 'yearly'}
              className={`${styles.intervalOption} ${billingInterval === 'yearly' ? styles.intervalOptionActive : ''}`}
              onClick={() => setBillingInterval('yearly')}
            >
              Yearly
              <span className={styles.savingsBadge}>Save 2 months</span>
            </button>
          </div>

          {currentShop?.subscriptionStatus === 'past_due' && graceDaysLeft !== null && (
            <div className={styles.graceBanner}>
              <Symbol name="warning" size={16} />
              <span>
                {graceDaysLeft} day(s) left to update payment before you&apos;re moved to the Free plan. Your data stays safe either way.
              </span>
            </div>
          )}

          {currentShop?.subscriptionStatus === 'trialing' && trialDaysLeft !== null && (
            <div className={styles.graceBanner}>
              <Symbol name="workspace_premium" size={16} />
              <span>
                {trialDaysLeft} day(s) left in your free trial. Your card will be charged automatically when it ends — cancel anytime before then to avoid that.
              </span>
            </div>
          )}

          {/* Plan Category Switcher: Bespoke vs RTW vs Hybrid (Commented out: defaulting to Bespoke) */}
          {/* <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['bespoke', 'rtw', 'hybrid'] as PlanTierType[]).map((tierKey) => {
              const tier = PLAN_TIERS[tierKey];
              const isSelected = selectedPlanTab === tierKey;
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setSelectedPlanTab(tierKey)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--sf-radius-full, 999px)',
                    border: isSelected ? '1px solid var(--sf-color-primary, #047857)' : '1px solid var(--sf-border-light, #e5e7eb)',
                    background: isSelected ? 'var(--sf-color-primary, #047857)' : 'var(--sf-bg-surface, #ffffff)',
                    color: isSelected ? '#ffffff' : 'var(--sf-text-secondary, #4b5563)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tier.name}
                </button>
              );
            })}
          </div> */}

          <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
            <div className={styles.planCardHeader}>
              <div>
                <span className={styles.planName}>{activePlanConfig.name}</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                  {activePlanConfig.tagline}
                </p>
              </div>
              <span className={styles.planBadge}>
                {selectedPlanTab === currentMode ? 'Your Current Model' : 'Available Plan'}
              </span>
            </div>

            {billingInterval === 'monthly' ? (
              <span className={styles.planPrice}>
                ₦{planPriceMonthly.toLocaleString()}
                <span className={styles.planPriceUnit}>/month</span>
              </span>
            ) : (
              <span className={styles.planPrice}>
                ₦{planPriceYearly.toLocaleString()}
                <span className={styles.planPriceUnit}>/year</span>
              </span>
            )}
            {billingInterval === 'yearly' && (
              <span className={styles.priceSubtext}>
                Pay for 10 months, get 12 — vs. ₦{(planPriceMonthly * 12).toLocaleString()}/year billed monthly.
              </span>
            )}

            <ul className={styles.planFeatures}>
              {activePlanConfig.features.map((feat, idx) => (
                <li key={idx}><strong>{feat}</strong></li>
              ))}
              <li>Priority support</li>
            </ul>
            {currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing' ? (
              <div className={styles.currentPlanBadge}>
                <Symbol name="check" size={18} /> {currentShop.subscriptionStatus === 'trialing' ? 'Free Trial Active' : 'Current Plan'}
              </div>
            ) : trialEligible ? (
              <Button variant="primary" loading={upgrading} onClick={() => handleStartTrial(billingInterval)} fullWidth>
                Try free for 30 days
              </Button>
            ) : (
              <Button variant="primary" loading={upgrading} onClick={() => handleUpgrade(billingInterval)} fullWidth>
                {billingInterval === 'monthly'
                  ? `Upgrade ${activePlanConfig.name} — ₦${planPriceMonthly.toLocaleString()}/month`
                  : `Upgrade ${activePlanConfig.name} — ₦${planPriceYearly.toLocaleString()}/year`}
              </Button>
            )}
            {trialEligible && (
              <p className={styles.priceSubtext}>
                We place a small ₦{TRIAL_VERIFICATION_AMOUNT_NGN} card-verification charge, refunded within a few business days — it&apos;s not a fee. Free for 30 days, then ₦{(billingInterval === 'monthly' ? planPriceMonthly : planPriceYearly).toLocaleString()}/{billingInterval === 'monthly' ? 'month' : 'year'} unless you cancel — cancel anytime, before or during the trial, right from this page.
              </p>
            )}
          </div>

          <div className={styles.planCard}>
            <div className={styles.planCardHeader}>
              <span className={styles.planName}>Free Starter</span>
              <span className={styles.planPrice}>₦0</span>
            </div>
            <ul className={styles.planFeatures}>
              <li>Unlimited customers</li>
              <li>Unlimited custom styles & rack categories</li>
              <li><strong>{activePlanConfig.freeLimitDescription}</strong></li>
              <li>Receipts, POS register & invoices</li>
              <li>WhatsApp ticket, tracking link & digital showroom</li>
              <li className={styles.planFeatureMuted}>&quot;Powered by MyStitchBook&quot; badge shown</li>
              <li className={styles.planFeatureMuted}>No staff accounts</li>
              <li className={styles.planFeatureMuted}>No analytics & insights</li>
            </ul>
          </div>

          <p className={styles.hintText}>
            Cancel anytime. If a renewal payment fails, you keep Premium features for a 3-day grace period with reminders before reverting to Free — your data is never locked either way.
          </p>

          {currentShop?.subscriptionStatus === 'active' && (
            <div className={styles.subActionsRow}>
              <button type="button" className={styles.pausePlanBtn} onClick={openPauseFlow}>
                <Symbol name="pause_circle" size={15} /> Pause subscription (1–3 mo)
              </button>
              <button type="button" className={styles.cancelPlanLink} onClick={openCancelFlow}>
                Cancel subscription
              </button>
            </div>
          )}

          {currentShop?.subscriptionStatus === 'trialing' && (
            <button type="button" className={styles.cancelPlanLink} onClick={openCancelFlow}>
              Cancel trial
            </button>
          )}
        </>
      )}

      {cancelStep === 'why-stay' && (
        <>
          {currentShop?.subscriptionStatus === 'active' && (
            <div style={{ padding: '14px', background: 'rgba(67, 56, 202, 0.06)', borderRadius: '12px', border: '1px solid rgba(67, 56, 202, 0.2)', marginBottom: '16px' }}>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--sf-brand-indigo, #4338CA)', marginBottom: '4px' }}>
                Taking an off-season breath?
              </strong>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--sf-text-secondary)', lineHeight: 1.4 }}>
                Pause your subscription for 1 to 3 months instead of canceling. You pay ₦0, and all your lookbook photos and client catalogues remain 100% safe.
              </p>
            </div>
          )}

          <p className={styles.hintText}>
            Here&apos;s what moving to Free changes for {currentShop?.name || 'your workshop'}:
          </p>
          <ul className={styles.planFeatures}>
            <li>
              <strong>{ordersThisMonth}</strong> order{ordersThisMonth === 1 ? '' : 's'} created this month — Free caps new orders at 15/month
            </li>
            {activeStaffCount > 0 && (
              <li>
                <strong>{activeStaffCount}</strong> staff account{activeStaffCount === 1 ? '' : 's'} will lose access
              </li>
            )}
            <li>
              <strong>Lookbook &amp; Style Catalogues:</strong> Inactive catalogue pictures are preserved during active pauses (up to 3 months), but are cleared from server storage if your account stays on Free after 3 months.
            </li>
            <li>Analytics &amp; insights go away</li>
            <li>The &quot;Powered by MyStitchBook&quot; badge returns to your public pages</li>
          </ul>
          <p className={styles.hintText}>
            None of this happens right away — you keep Premium until your current billing period ends, and your data is never deleted or locked either way.
          </p>
          <div className={styles.cancelActions}>
            {currentShop?.subscriptionStatus === 'active' && (
              <Button variant="primary" fullWidth onClick={openPauseFlow}>
                <Symbol name="pause_circle" size={16} /> Pause Subscription Instead (1–3 Months)
              </Button>
            )}
            <Button variant={currentShop?.subscriptionStatus === 'active' ? 'secondary' : 'primary'} fullWidth onClick={() => setCancelStep('plans')}>
              Never mind, keep my {currentShop?.subscriptionStatus === 'trialing' ? 'trial' : 'plan'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setCancelStep('why-leave')}>
              Continue to cancel {currentShop?.subscriptionStatus === 'trialing' ? 'trial' : 'subscription'}
            </Button>
          </div>
        </>
      )}

      {cancelStep === 'pause' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>Pause Your Subscription</h3>
            <p className={styles.hintText} style={{ margin: 0 }}>
              Taking an off-season breath? Freeze your billing without losing your hard-earned lookbook pictures.
            </p>
          </div>

          <div className={styles.pauseDurationGrid}>
            {[1, 2, 3].map((m) => (
              <div
                key={m}
                className={`${styles.pauseDurationCard} ${pauseMonths === m ? styles.pauseDurationCardActive : ''}`}
                onClick={() => setPauseMonths(m as 1 | 2 | 3)}
              >
                <span className={styles.pauseDurationMonths}>{m} {m === 1 ? 'Month' : 'Months'}</span>
                <span className={styles.pauseDurationLabel}>
                  {m === 1 ? 'Quick break' : m === 2 ? 'Post-holiday' : 'Maximum lull'}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.pauseHighlights}>
            <div className={styles.pauseHighlightItem}>
              <Symbol name="shield" size={16} style={{ color: 'var(--sf-success)' }} />
              <span><strong>100% Photo Safety:</strong> Your catalogue pictures are never deleted during pause.</span>
            </div>
            <div className={styles.pauseHighlightItem}>
              <Symbol name="credit_card_off" size={16} style={{ color: 'var(--sf-brand-indigo, #4338CA)' }} />
              <span><strong>₦0 Billed:</strong> No card charges during your selected pause period.</span>
            </div>
            <div className={styles.pauseHighlightItem}>
              <Symbol name="restart_alt" size={16} style={{ color: 'var(--sf-text-secondary)' }} />
              <span><strong>1-Tap Resume:</strong> Unpause anytime in 1 tap whenever new client orders arrive.</span>
            </div>
          </div>

          <p className={styles.hintText} style={{ marginBottom: '8px' }}>Reason for pause (optional):</p>
          <div className={styles.cancelReasonList}>
            {[
              'Seasonal lull after holidays',
              'Workshop renovation or travel',
              'Low customer fabric intake',
              'Other',
            ].map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.cancelReasonOption} ${pauseReason === r ? styles.cancelReasonOptionActive : ''}`}
                onClick={() => setPauseReason(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div className={styles.cancelActions}>
            <Button variant="primary" fullWidth loading={pausing} onClick={handleConfirmPause}>
              Confirm {pauseMonths}-Month Pause
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setCancelStep('plans')}>
              Cancel &amp; Keep Plan Active
            </Button>
          </div>
        </>
      )}

      {cancelStep === 'why-leave' && (
        <>
          <p className={styles.hintText}>Optional, but it genuinely helps us fix what&apos;s not working:</p>
          <div className={styles.cancelReasonList}>
            {[
              'Too expensive',
              'Not using it enough',
              'Missing a feature I need',
              'Switching to another tool',
              'Something isn\'t working right',
              'Other',
            ].map((reason) => (
              <button
                key={reason}
                type="button"
                className={`${styles.cancelReasonOption} ${cancelReason === reason ? styles.cancelReasonOptionActive : ''}`}
                onClick={() => setCancelReason(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
          <div className={styles.cancelActions}>
            <Button variant="secondary" fullWidth onClick={() => setCancelStep('plans')}>Never mind, keep my plan</Button>
            <Button variant="danger" fullWidth loading={cancelling} onClick={handleConfirmCancel}>Cancel Subscription</Button>
          </div>
        </>
      )}
    </PageLayout>
  );
}
