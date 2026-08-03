'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal, slideInLeft, slideInRight, popIn } from '@/lib/marketingMotion';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import styles from './HomePageContent.module.css';

const PAIN_POINTS = [
  {
    icon: 'sticky_note_2',
    title: 'The "Measure Twice" Fatigue',
    text: 'Stop re-measuring customers you already know. Digital client profiles save every measurement once, safe and searchable forever.',
  },
  {
    icon: 'notification_important',
    title: 'The "Any Update?" Call',
    text: "Zero visibility breeds distrust. Give clients a public link to track their own order in real time — no more calls asking if it's ready.",
  },
  {
    icon: 'payments',
    title: 'Balances You Lose Track Of',
    text: "Untracked payments cap what a workshop can grow into. Every order remembers what's owed, so nothing gets forgotten or shorted.",
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
      {/* Hero — full-bleed editorial photo, headline overlaid directly on it */}
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
          <span className={styles.heroEyebrow}>Bespoke Workshop Software</span>
          <h1 className={styles.heroHeadline}>
            Manage orders, <span className={styles.heroHeadlineAccent}>measurements</span>, and clients.
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
            <Link href="/portfolio-examples" className={styles.ctaSecondaryOnPhoto}>
              <Symbol name="visibility" size={18} />
              See a Live Portfolio Example
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Proof strip — real product screenshots, not mockups, floating just
          below the hero photo the way the reference templates showcase
          actual UI instead of describing it in prose. */}
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
            <motion.div key={point.title} className={styles.painCard} {...reveal(0.1 + i * 0.1, popIn)}>
              <Symbol name={point.icon} size={28} className={styles.painIcon} />
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className={styles.featuresSection}>
        {FEATURES.map((feature, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={feature.title}
              className={`${styles.featureRow} ${reversed ? styles.featureRowReverse : ''}`}
            >
              <motion.div className={styles.featureText} {...reveal(0, reversed ? slideInRight : slideInLeft)}>
                <span className={styles.eyebrow}>{feature.kicker}</span>
                <h2 className={styles.featureTitle}>{feature.title}</h2>
                <p className={styles.featureBody}>{feature.text}</p>
              </motion.div>
              <motion.div
                className={styles.featureImageWrap}
                {...reveal(0.1, reversed ? slideInLeft : slideInRight)}
              >
                <Image src={feature.image} alt="" width={800} height={600} className={styles.featureImage} />
              </motion.div>
            </div>
          );
        })}
        <motion.div className={styles.featureLinkRow} {...reveal()}>
          <Link href="/features" className={styles.featureLink}>
            See every feature
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Portfolio teaser — real screenshot, not just a text-on-color band */}
      <section className={styles.portfolioSection}>
        <div className={styles.portfolioInner}>
          <motion.div {...reveal(0, slideInLeft)}>
            <span className={styles.eyebrow}>Showcase</span>
            <h2 className={styles.sectionTitle}>Your work deserves a stage.</h2>
            <p className={styles.portfolioBody}>
              Every shop gets a free public portfolio page — a beautiful, shareable showcase of your finished
              work, built automatically from the orders you complete. Choose from three templates and make it
              yours.
            </p>
            <Link href="/portfolio-examples" className={styles.ctaSecondaryDark}>
              View Portfolio Templates
              <Symbol name="arrow_forward" size={18} />
            </Link>
          </motion.div>
          <motion.div className={styles.portfolioShotWrap} {...reveal(0.1, slideInRight)}>
            <Image
              src="/images/marketing/proof-public-portfolio.jpg"
              alt=""
              width={480}
              height={600}
              className={styles.portfolioShot}
            />
          </motion.div>
        </div>
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

      {/* Final CTA — photo-backed close, bookending the hero's opening treatment */}
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
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
