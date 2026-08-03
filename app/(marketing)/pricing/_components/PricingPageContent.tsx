'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
import {
  FREE_MONTHLY_ORDER_LIMIT,
  PREMIUM_MONTHLY_PRICE_NGN,
  PREMIUM_YEARLY_PRICE_NGN,
} from '@/lib/subscription';
import styles from './PricingPageContent.module.css';

const FAQS = [
  {
    q: 'What happens if my payment fails?',
    a: `You keep every Premium feature for a 3-day grace period, with reminders along the way, so a temporary card issue never catches you off guard. If payment still hasn't gone through after that, your shop reverts to the Free plan — your data is never locked or deleted, paid or not.`,
  },
  {
    q: 'Is there really no limit on customers?',
    a: `Correct — unlimited customers and unlimited custom style templates, on the Free plan, forever. The only thing the Free plan limits is order volume, at ${FREE_MONTHLY_ORDER_LIMIT} orders a month, because that's the point where a shop has genuinely grown busy enough to justify the cost.`,
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There is no lock-in contract. If you cancel, your shop simply reverts to the Free plan at the end of your current billing period — your customer records, order history, and everything else stays exactly where it is.',
  },
  {
    q: 'What do I actually lose if I stay on Free forever?',
    a: `Nothing about running your day-to-day operations. Free includes unlimited customers, unlimited custom styles, receipts and invoices, your WhatsApp button, public order tracking, and your public portfolio page. Once you're past ${FREE_MONTHLY_ORDER_LIMIT} orders a month or need staff accounts, that's when Premium pays for itself.`,
  },
];

export default function PricingPageContent() {
  const reveal = useReveal();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image src="/images/marketing/pricing-hero-fabric.jpg" alt="" fill sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroScrim} />
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.heroEyebrow}>Simple, honest pricing</span>
          <h1 className={styles.heroHeadline}>A plan for every workshop.</h1>
          <p className={styles.heroSubhead}>
            Unlimited customers and unlimited custom styles, on every plan, forever. Upgrade only once your shop
            has genuinely outgrown the free tier.
          </p>
        </motion.div>
      </section>

      {/* Honest trust strip — real product policy, not fabricated numbers */}
      <motion.section className={styles.trustStrip} {...reveal()}>
        <div className={styles.trustItem}>
          <Symbol name="all_inclusive" size={22} />
          <span>Unlimited customers, on every plan, forever</span>
        </div>
        <div className={styles.trustItem}>
          <Symbol name="lock_open" size={22} />
          <span>Your data is never locked, paid or not</span>
        </div>
        <div className={styles.trustItem}>
          <Symbol name="credit_card_off" size={22} />
          <span>No card required to start free</span>
        </div>
      </motion.section>

      <section className={styles.pricingSection}>
        <motion.div className={styles.intervalToggle} role="tablist" aria-label="Billing interval" {...reveal()}>
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
        </motion.div>

        <motion.div className={styles.plansGrid} {...reveal(0.05)}>
          <div className={styles.planCard}>
            <span className={styles.planName}>Free</span>
            <span className={styles.planPrice}>₦0</span>
            <p className={styles.planTagline}>Run your whole operation, no card required.</p>
            <ul className={styles.planFeatures}>
              <li>Unlimited customers</li>
              <li>Unlimited custom styles</li>
              <li>{FREE_MONTHLY_ORDER_LIMIT} orders / month</li>
              <li>Receipts &amp; invoices</li>
              <li>WhatsApp button, tracking link &amp; portfolio</li>
              <li className={styles.planFeatureMuted}>&quot;Powered by MyStitchBook&quot; badge shown</li>
              <li className={styles.planFeatureMuted}>No staff accounts</li>
              <li className={styles.planFeatureMuted}>No analytics</li>
            </ul>
            <Link href="/signup" className={styles.ctaSecondary}>
              Start for Free
            </Link>
          </div>

          <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
            <span className={styles.planBadge}>Recommended</span>
            <span className={styles.planName}>Premium</span>
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
              <p className={styles.planPriceSubtext}>
                Pay for 10 months, get 12 — vs. ₦{(PREMIUM_MONTHLY_PRICE_NGN * 12).toLocaleString()}/year billed
                monthly.
              </p>
            )}
            <p className={styles.planTagline}>For shops that have outgrown the free tier.</p>
            <ul className={styles.planFeatures}>
              <li>Everything in Free</li>
              <li>
                <strong>Unlimited orders</strong>
              </li>
              <li>
                <strong>Staff accounts</strong>
              </li>
              <li>
                <strong>Business insights</strong>
              </li>
              <li>Badge removed from your public pages</li>
              <li>Priority support</li>
            </ul>
            <Link href="/signup" className={styles.ctaPrimary}>
              Go Premium
            </Link>
          </div>
        </motion.div>
      </section>

      <section className={styles.faqSection}>
        <motion.h2 className={styles.sectionTitle} {...reveal()}>
          Questions, answered honestly.
        </motion.h2>
        <div className={styles.faqList}>
          {FAQS.map((faq, i) => (
            <motion.div key={faq.q} className={styles.faqItem} {...reveal(0.05 + i * 0.05)}>
              <button
                type="button"
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                {faq.q}
                <Symbol name={openFaq === i ? 'remove' : 'add'} size={20} />
              </button>
              {openFaq === i && <p className={styles.faqAnswer}>{faq.a}</p>}
            </motion.div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <Image src="/images/marketing/pricing-final-cta.jpg" alt="" fill sizes="100vw" className={styles.finalCtaBg} />
        <div className={styles.finalCtaScrim} />
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Ready to elevate your craft?</h2>
          <p className={styles.finalCtaBody}>Set up your shop in under two minutes. No card required.</p>
          <Link href="/signup" className={styles.ctaPrimary}>
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
