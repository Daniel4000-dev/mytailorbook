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
import { initializeSubscription, confirmSubscriptionPayment, startFreeTrial, confirmFreeTrial, cancelSubscriptionAction } from '@/app/actions/payments';
import { trackEvent } from '@/lib/analytics';
import { PREMIUM_MONTHLY_PRICE_NGN, PREMIUM_YEARLY_PRICE_NGN, TRIAL_VERIFICATION_AMOUNT_NGN } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

export default function BillingSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentShop, orders, staffMembers, refreshShop } = useData();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [cancelling, setCancelling] = useState(false);
  const [cancelStep, setCancelStep] = useState<'plans' | 'why-stay' | 'why-leave'>('plans');
  const [cancelReason, setCancelReason] = useState<string | null>(null);

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
        trackEvent('subscription_upgraded');
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
        trackEvent('trial_started');
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
    trackEvent('upgrade_checkout_started', { interval });
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
    trackEvent('trial_checkout_started', { interval });
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
      trackEvent('subscription_canceled', { reason: cancelReason || 'not_given' });
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

  return (
    <PageLayout width="narrow" header={<TopBar title="Billing & Subscription" showBack={!isDesktop} onBack={() => router.push(ROUTES.settings)} />}>
      {cancelStep === 'plans' && (
        <>
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

          <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
            <div className={styles.planCardHeader}>
              <span className={styles.planName}>Premium</span>
              <span className={styles.planBadge}>Recommended</span>
            </div>

            {billingInterval === 'monthly' ? (
              <span className={styles.planPrice}>
                ₦{PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}
                <span className={styles.planPriceUnit}>/month</span>
              </span>
            ) : (
              <span className={styles.planPrice}>
                ₦{PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}
                <span className={styles.planPriceUnit}>/year</span>
              </span>
            )}
            {billingInterval === 'yearly' && (
              <span className={styles.priceSubtext}>
                Pay for 10 months, get 12 — vs. ₦{(PREMIUM_MONTHLY_PRICE_NGN * 12).toLocaleString()}/year billed monthly.
              </span>
            )}

            <ul className={styles.planFeatures}>
              <li>Everything in Free</li>
              <li><strong>Unlimited orders</strong></li>
              <li><strong>Staff accounts</strong></li>
              <li><strong>Analytics &amp; insights</strong></li>
              <li>Badge removed from your public pages</li>
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
                  ? `Upgrade — ₦${PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}/month`
                  : `Upgrade — ₦${PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}/year`}
              </Button>
            )}
            {trialEligible && (
              <p className={styles.priceSubtext}>
                We place a small ₦{TRIAL_VERIFICATION_AMOUNT_NGN} card-verification charge, refunded within a few business days — it&apos;s not a fee. After 30 free days, you&apos;re billed ₦{(billingInterval === 'monthly' ? PREMIUM_MONTHLY_PRICE_NGN : PREMIUM_YEARLY_PRICE_NGN).toLocaleString()}/{billingInterval === 'monthly' ? 'month' : 'year'} unless you cancel.
              </p>
            )}
          </div>

          <div className={styles.planCard}>
            <div className={styles.planCardHeader}>
              <span className={styles.planName}>Free</span>
              <span className={styles.planPrice}>₦0</span>
            </div>
            <ul className={styles.planFeatures}>
              <li>Unlimited customers</li>
              <li>Unlimited custom styles</li>
              <li>15 orders / month</li>
              <li>Receipts &amp; invoices</li>
              <li>WhatsApp button, tracking link &amp; portfolio</li>
              <li className={styles.planFeatureMuted}>&quot;Powered by MyStitchBook&quot; badge shown</li>
              <li className={styles.planFeatureMuted}>No staff accounts</li>
              <li className={styles.planFeatureMuted}>No analytics</li>
            </ul>
          </div>

          <p className={styles.hintText}>
            Cancel anytime. If a renewal payment fails, you keep Premium features for a 3-day grace period with reminders before reverting to Free — your data is never locked either way.
          </p>

          {(currentShop?.subscriptionStatus === 'active' || currentShop?.subscriptionStatus === 'trialing') && (
            <button type="button" className={styles.cancelPlanLink} onClick={openCancelFlow}>
              {currentShop.subscriptionStatus === 'trialing' ? 'Cancel trial' : 'Cancel subscription'}
            </button>
          )}
        </>
      )}

      {cancelStep === 'why-stay' && (
        <>
          <p className={styles.hintText}>
            Here&apos;s what moving to Free changes for {currentShop?.name || 'your studio'}:
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
            <li>Analytics &amp; insights go away</li>
            <li>The &quot;Powered by MyStitchBook&quot; badge returns to your public pages</li>
          </ul>
          <p className={styles.hintText}>
            None of this happens right away — you keep Premium until your current billing period ends, and your data is never deleted or locked either way.
          </p>
          <div className={styles.cancelActions}>
            <Button variant="secondary" fullWidth onClick={() => setCancelStep('plans')}>Never mind, keep my plan</Button>
            <Button variant="ghost" fullWidth onClick={() => setCancelStep('why-leave')}>Continue to cancel</Button>
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
