'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { initializeSubscription, startFreeTrial } from '@/app/actions/payments';
import {
  PREMIUM_MONTHLY_PRICE_NGN,
  PREMIUM_YEARLY_PRICE_NGN,
} from '@/lib/subscription';
import { formatCurrency } from '@/lib/formatters';
import styles from './UpgradeModal.module.css';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason?: string;
  returnPath?: string;
  onBeforeRedirect?: () => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  title = 'Unlock Unlimited Orders',
  reason = "You have reached your free plan's monthly order limit. Upgrade your workshop to keep creating bespoke orders without interruption.",
  returnPath = '/orders/new?payment=success',
  onBeforeRedirect,
}: UpgradeModalProps) {
  const { currentShop } = useData();
  const { showToast } = useToast();

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState(false);

  const trialEligible = currentShop?.subscriptionStatus === 'free' && !currentShop?.trialUsedAt;

  const handleUpgrade = async () => {
    setUpgrading(true);
    if (onBeforeRedirect) {
      try {
        onBeforeRedirect();
      } catch (err) {
        console.error('onBeforeRedirect failed', err);
      }
    }

    try {
      if (trialEligible) {
        const { authorizationUrl } = await startFreeTrial(billingInterval, returnPath);
        window.location.href = authorizationUrl;
      } else {
        const { authorizationUrl } = await initializeSubscription(billingInterval, returnPath);
        window.location.href = authorizationUrl;
      }
    } catch (err: any) {
      showToast(err?.message || 'Upgrade initialization failed', 'error');
      setUpgrading(false);
    }
  };

  const priceAmount = billingInterval === 'yearly' ? PREMIUM_YEARLY_PRICE_NGN : PREMIUM_MONTHLY_PRICE_NGN;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContent}>
        <div className={styles.heroHeader}>
          <div className={styles.iconBadge}>
            <Symbol name="workspace_premium" size={28} />
          </div>
          <h3 className={styles.modalTitle}>{title}</h3>
          <p className={styles.modalSub}>{reason}</p>
        </div>

        {/* Interval Selector */}
        <div className={styles.intervalToggle}>
          <button
            type="button"
            className={`${styles.intervalBtn} ${billingInterval === 'monthly' ? styles.intervalBtnActive : ''}`}
            onClick={() => setBillingInterval('monthly')}
          >
            <span>Monthly</span>
          </button>
          <button
            type="button"
            className={`${styles.intervalBtn} ${billingInterval === 'yearly' ? styles.intervalBtnActive : ''}`}
            onClick={() => setBillingInterval('yearly')}
          >
            <span>Yearly</span>
            <span className={styles.discountBadge}>Save 20%</span>
          </button>
        </div>

        {/* Pricing & Features Card */}
        <div className={styles.pricingCard}>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Premium Workshop</span>
            <div style={{ textAlign: 'right' }}>
              <span className={styles.priceAmount}>{formatCurrency(priceAmount, 'NGN')}</span>
              <span className={styles.pricePeriod}>
                {billingInterval === 'yearly' ? ' / yr' : ' / mo'}
              </span>
            </div>
          </div>

          <ul className={styles.benefitsList}>
            <li className={styles.benefitItem}>
              <Symbol name="check_circle" size={16} className={styles.checkIcon} />
              <span>Unlimited bespoke orders & multi-outfit intake</span>
            </li>
            <li className={styles.benefitItem}>
              <Symbol name="check_circle" size={16} className={styles.checkIcon} />
              <span>Cutting table shears queue with bolt yardage tracking</span>
            </li>
            <li className={styles.benefitItem}>
              <Symbol name="check_circle" size={16} className={styles.checkIcon} />
              <span>Live customer order tracking portal with WhatsApp updates</span>
            </li>
            <li className={styles.benefitItem}>
              <Symbol name="check_circle" size={16} className={styles.checkIcon} />
              <span>Complete client measurement snapshots & fitting verdicts</span>
            </li>
          </ul>

          {trialEligible && (
            <div className={styles.trialCallout}>
              <Symbol name="verified" size={16} />
              <span>Includes 30-day free trial. ₦0 today, cancel anytime.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.upgradeBtn}
            disabled={upgrading}
            onClick={handleUpgrade}
          >
            {upgrading ? (
              <span>Connecting to Secure Checkout…</span>
            ) : trialEligible ? (
              <>
                <span>Start 30-Day Free Trial</span>
                <Symbol name="arrow_forward" size={16} />
              </>
            ) : (
              <>
                <span>Upgrade to Premium</span>
                <Symbol name="arrow_forward" size={16} />
              </>
            )}
          </button>

          <button type="button" className={styles.dismissBtn} onClick={onClose} disabled={upgrading}>
            I will upgrade later (keep draft)
          </button>
        </div>
      </div>
    </Modal>
  );
}
