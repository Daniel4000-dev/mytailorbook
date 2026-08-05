'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal, slideInLeft, slideInRight, popIn } from '@/lib/marketingMotion';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import styles from './HomePageContent.module.css';

const STRUGGLES = [
  { icon: 'auto_stories', text: 'Notebook' },
  { icon: 'event_busy', text: 'Missed delivery dates' },
  { icon: 'call', text: 'Excess phone calls' },
  { icon: 'receipt_long', text: 'Untracked balances' },
  { icon: 'straighten', text: 'Lost customer measurements' },
  { icon: 'bar_chart', text: 'Have trouble pricing customers' },
  { icon: 'warning', text: 'Send my money back o' },
];

const HOW_IT_WORKS = [
  { icon: 'person_add', step: 'Step 1', title: 'Add your customer' },
  { icon: 'straighten', step: 'Step 2', title: 'Save measurements once' },
  { icon: 'add_circle', step: 'Step 3', title: 'Create an order' },
  { icon: 'view_kanban', step: 'Step 4', title: 'Track progress' },
  { icon: 'notification_important', step: 'Step 5', title: 'Customer gets updates automatically' },
];

const BENEFITS = [
  {
    icon: 'verified_user',
    text: 'Avoid customer frustration and embarrassment.',
  },
  {
    icon: 'cloud_sync',
    text: "Never lose a customer's measurement again.",
  },
  {
    icon: 'event',
    text: 'Know exactly which outfits are due today.',
  },
  {
    icon: 'workspace_premium',
    text: 'Look more professional and get paid faster.',
  },
];

export default function HomePageContent() {
  const reveal = useReveal();

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <Image
          src="/images/marketing/hero-tailor-tablet.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroBg}
        />
        <div className={styles.heroScrim} />
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className={styles.heroHeadline}>
            All-in-one business App for tailors.
          </h1>
          <p className={styles.heroSubhead}>
            Manage customers, store measurements, track orders, send invoices, and keep clients updated - all in one simple app.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.ctaPrimary}>
              Start Free
              <Symbol name="arrow_forward" size={18} />
            </Link>
            <Link href="/portfolio-examples" className={styles.ctaSecondaryOnPhoto}>
              <Symbol name="visibility" size={18} />
              Watch Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Proof strip */}
      <section className={styles.proofStrip}>
        {[
          { src: '/images/marketing/proof-production-board.jpg', label: 'Production board' },
          { src: '/images/marketing/proof-client-profiles.jpg', label: 'Client profiles' },
          { src: '/images/marketing/proof-public-portfolio.jpg', label: 'Public portfolio' },
        ].map((shot, i) => (
          <motion.div
            key={shot.src}
            className={styles.proofCard}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.1 }}
          >
            <Image src={shot.src} alt="" width={640} height={420} className={styles.proofImage} />
            <span className={styles.proofLabel}>{shot.label}</span>
          </motion.div>
        ))}
      </section>

      {/* SECTION 1: Still running your business like this? */}
      <section className={styles.painSection}>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          Still running your business like this?
        </motion.h2>
        <div className={styles.painGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {STRUGGLES.map((point, i) => (
            <motion.div key={point.text} className={styles.painCard} {...reveal(0.1 + i * 0.1, popIn)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--sf-accent-rose)' }}>
                <Symbol name={point.icon} size={36} className={styles.painIcon} />
              </div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{point.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 2: How MyStitchBook Works */}
      <section className={styles.featuresSection} style={{ padding: '6rem 2rem', background: 'var(--sf-surface-elevated)' }}>
        <div className={styles.portfolioInner} style={{ textAlign: 'center', marginBottom: '4rem', width: '100%' }}>
          <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
            How MyStitchBook Works
          </motion.h2>
        </div>
        
        <div className={styles.painGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div key={step.step} className={styles.painCard} {...reveal(0.1 + i * 0.1, popIn)} style={{ textAlign: 'center', background: 'var(--sf-surface-main)', padding: '2rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sf-accent-emerald)', color: 'white', width: 56, height: 56, borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Symbol name={step.icon} size={28} />
              </div>
              <span className={styles.eyebrow} style={{ marginBottom: '0.75rem', display: 'block' }}>{step.step}</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{step.title}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 3: Benefits */}
      <section className={styles.painSection} style={{ padding: '6rem 2rem' }}>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)} style={{ textAlign: 'center', marginBottom: '4rem' }}>
          Benefits
        </motion.h2>
        <div className={styles.painGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {BENEFITS.map((benefit, i) => (
            <motion.div key={benefit.text} className={styles.painCard} {...reveal(0.1 + i * 0.1, popIn)} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'left', padding: '2rem' }}>
              <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--sf-accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Symbol name={benefit.icon} size={28} />
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.4, margin: 0 }}>{benefit.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 4: Trust */}
      <section className={styles.portfolioSection} style={{ background: '#f8fafc', padding: '8rem 2rem', textAlign: 'center' }}>
        <motion.div {...reveal(0, popIn)} style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: '4rem', lineHeight: 1.1 }}>
            Built for Nigerian Tailors <span style={{ fontSize: '1.2em', verticalAlign: 'middle' }}>🇳🇬</span>
          </h2>
          
          <div style={{ background: 'white', padding: '3.5rem', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '4px', color: '#fbbf24' }}>
                {[1,2,3,4,5].map(star => <Symbol key={star} name="star" size={28} />)}
              </div>
            </div>
            <p style={{ fontSize: '1.75rem', fontStyle: 'italic', color: '#1e293b', lineHeight: 1.5, marginBottom: '3rem', fontWeight: 500 }}>
              "MyStitchBook has completely transformed how I run my tailoring workshop. I no longer lose customer measurements or miss delivery dates. My customers are so impressed with the automatic updates they get!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sf-accent-emerald-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sf-accent-emerald)', fontWeight: 'bold', fontSize: '1.5rem' }}>
                AO
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>Adebayo O.</div>
                <div style={{ color: '#64748b', fontSize: '1rem' }}>Creative Director, Adebayo Stitches</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pricing teaser */}
      <section className={styles.pricingTeaser}>
        <motion.span className={styles.eyebrow} {...reveal()}>
          Simple, honest pricing
        </motion.span>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
          A plan for every workshop.
        </motion.h2>
        <motion.p className={styles.pricingTeaserBody} {...reveal(0.08)}>
          Unlimited customers and unlimited custom styles, on every plan, forever. Free gets you{' '}
          {FREE_MONTHLY_ORDER_LIMIT} orders a month — upgrade only once your shop has genuinely outgrown that.
        </motion.p>
        <motion.div className={styles.pricingCards} {...reveal(0.12, popIn)}>
          <div className={styles.pricingCard}>
            <span className={styles.pricingCardName}>Free</span>
            <span className={styles.pricingCardPrice}>₦0</span>
            <ul>
              <li>Unlimited customers &amp; styles</li>
              <li>{FREE_MONTHLY_ORDER_LIMIT} orders / month</li>
              <li>WhatsApp, tracking &amp; portfolio</li>
            </ul>
          </div>
          <div className={`${styles.pricingCard} ${styles.pricingCardHighlight}`}>
            <span className={styles.pricingBadge}>Recommended</span>
            <span className={styles.pricingCardName}>Premium</span>
            <span className={styles.pricingCardPrice}>
              ₦{PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}
              <span className={styles.pricingCardUnit}>/mo</span>
            </span>
            <ul>
              <li>Unlimited orders</li>
              <li>Staff accounts</li>
              <li>Business insights</li>
            </ul>
          </div>
        </motion.div>
        <motion.div {...reveal(0.16)}>
          <Link href="/pricing" className={styles.featureLink}>
            See full pricing details
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <Image
          src="/images/marketing/home-final-cta-stitching.jpg"
          alt=""
          fill
          sizes="100vw"
          className={styles.finalCtaBg}
        />
        <div className={styles.finalCtaScrim} />
        <motion.div className={styles.finalCtaInner} {...reveal(0, popIn)}>
          <h2 className={styles.finalCtaTitle}>Ready to elevate your craft?</h2>
          <p className={styles.finalCtaBody}>
            It takes less than two minutes to set up your shop. No card required for the free plan.
          </p>
          <Link href="/signup" className={styles.ctaPrimaryLight}>
            Start Free
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
