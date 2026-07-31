'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import styles from './HomePageContent.module.css';

const PAIN_POINTS = [
  {
    icon: 'sticky_note_2',
    title: 'Lost Paper Trails',
    text: 'Stop digging through notebooks. Digital client profiles keep measurements safe, searchable, and organized forever.',
  },
  {
    icon: 'notification_important',
    title: 'The "Any Update?" Call',
    text: 'Cut the phone calls. Give clients a public link to track their own order status in real time, no app download needed.',
  },
  {
    icon: 'event_busy',
    title: 'Missed Delivery Dates',
    text: 'Your workshop, visualized. A production board keeps every order moving so nothing slips through the cracks.',
  },
];

const FEATURES = [
  {
    icon: 'view_kanban',
    kicker: 'Workflow',
    title: 'A production board built for tailoring',
    text: 'Move every order through your own stages — Documented, Cutting, Sewing, Ready, Completed — and see exactly where each garment stands at a glance.',
    image: '/images/marketing/sewing-machine-hands.jpg',
  },
  {
    icon: 'straighten',
    kicker: 'Management',
    title: 'Digital client profiles, done properly',
    text: 'Full measurement sets, preferred styles, and fabric notes for every customer — unlimited customers, forever, on every plan.',
    image: '/images/marketing/measuring-hands.jpg',
  },
  {
    icon: 'share',
    kicker: 'Customer Experience',
    title: 'A tracking link your customers actually want',
    text: 'Send a link over WhatsApp and let your customer follow their order as a photo timeline — no login, no app, no more "any update?" texts.',
    image: '/images/marketing/hands-dark-fabric.jpg',
  },
];

export default function HomePageContent() {
  const reveal = useReveal();

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <motion.div
            className={styles.heroText}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className={styles.heroHeadline}>
              Precision. <span className={styles.heroHeadlineAccent}>Elegance.</span> Flow.
            </h1>
            <p className={styles.heroSubhead}>
              The business and customer-relationship platform built for tailors and fashion designers across
              Nigeria and Africa — run your production, keep every measurement on file, and give your own
              customers a premium experience, all in one place.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.ctaPrimary}>
                Start Free — No Card Required
                <Symbol name="arrow_forward" size={18} />
              </Link>
              <Link href="/portfolio-examples" className={styles.ctaSecondary}>
                <Symbol name="visibility" size={18} />
                See a Live Portfolio Example
              </Link>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroImageWrap}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/marketing/hero-tailor-tablet.jpg"
              alt="A tailor reviewing their production board on a tablet in front of indigo fabric swatches"
              className={styles.heroImage}
            />
          </motion.div>
        </div>
      </section>

      {/* Pain points */}
      <section className={styles.painSection}>
        <motion.span className={styles.eyebrow} {...reveal()}>
          The struggle is real
        </motion.span>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
          Stop losing measurements to a notebook.
        </motion.h2>
        <div className={styles.painGrid}>
          {PAIN_POINTS.map((point, i) => (
            <motion.div key={point.title} className={styles.painCard} {...reveal(0.1 + i * 0.08)}>
              <Symbol name={point.icon} size={28} className={styles.painIcon} />
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className={styles.featuresSection}>
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            className={`${styles.featureRow} ${i % 2 === 1 ? styles.featureRowReverse : ''}`}
            {...reveal()}
          >
            <div className={styles.featureText}>
              <span className={styles.eyebrow}>{feature.kicker}</span>
              <h2 className={styles.featureTitle}>{feature.title}</h2>
              <p className={styles.featureBody}>{feature.text}</p>
            </div>
            <div className={styles.featureImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feature.image} alt="" className={styles.featureImage} />
            </div>
          </motion.div>
        ))}
        <motion.div className={styles.featureLinkRow} {...reveal()}>
          <Link href="/features" className={styles.featureLink}>
            See every feature
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Portfolio teaser */}
      <section className={styles.portfolioSection}>
        <motion.div className={styles.portfolioInner} {...reveal()}>
          <span className={styles.eyebrow}>Showcase</span>
          <h2 className={styles.sectionTitle}>Your work deserves a stage.</h2>
          <p className={styles.portfolioBody}>
            Every shop gets a free public portfolio page — a beautiful, shareable showcase of your finished work,
            built automatically from the orders you complete. Choose from three templates and make it yours.
          </p>
          <Link href="/portfolio-examples" className={styles.ctaSecondaryDark}>
            View Portfolio Templates
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Pricing teaser */}
      <section className={styles.pricingTeaser}>
        <motion.span className={styles.eyebrow} {...reveal()}>
          Simple, honest pricing
        </motion.span>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
          A plan for every atelier.
        </motion.h2>
        <motion.p className={styles.pricingTeaserBody} {...reveal(0.08)}>
          Unlimited customers and unlimited custom styles, on every plan, forever. Free gets you{' '}
          {FREE_MONTHLY_ORDER_LIMIT} orders a month — upgrade only once your shop has genuinely outgrown that.
        </motion.p>
        <motion.div className={styles.pricingCards} {...reveal(0.12)}>
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
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Ready to elevate your craft?</h2>
          <p className={styles.finalCtaBody}>
            It takes less than two minutes to set up your shop. No card required for the free plan.
          </p>
          <Link href="/signup" className={styles.ctaPrimaryLight}>
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
