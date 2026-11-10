'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal, slideInLeft, slideInRight, popIn } from '@/lib/marketingMotion';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import { HOMEPAGE_FAQS } from './homepageFaqs';
import styles from './HomePageContent.module.css';

const STRUGGLES = [
  {
    icon: 'auto_stories',
    title: 'Missing measurement pages',
    text: 'A returning customer says “use my last measurement” and you cannot find their page.',
  },
  {
    icon: 'texture',
    title: 'Untagged cloth on the shelf',
    text: 'Three black cashmeres or white laces sit on the shelf and nobody remembers whose is whose.',
  },
  {
    icon: 'content_cut',
    title: 'Misread numbers when cutting',
    text: 'A handwritten 42 gets read as 47 at the cutting table, costing you your own money.',
  },
  {
    icon: 'payments',
    title: 'Uncollected customer balances',
    text: '“I will transfer the balance when I get home” turns into weeks of awkward follow-ups.',
  },
  {
    icon: 'event',
    title: 'Thursday night deadline surprises',
    text: 'Realizing late on Thursday that four different outfits are promised for Friday morning.',
  },
];

const HOW_IT_WORKS = [
  { icon: 'straighten', step: 'Step 1', title: 'Save measurements once (even offline)' },
  { icon: 'content_cut', step: 'Step 2', title: 'Tag customer cloth & print cutting slip' },
  { icon: 'view_kanban', step: 'Step 3', title: 'Move orders across your production board' },
  { icon: 'share', step: 'Step 4', title: 'Send a live WhatsApp progress link' },
  { icon: 'account_balance_wallet', step: 'Step 5', title: 'Collect balances & sell Ready-to-Wear' },
];

const FEATURES = [
  {
    icon: 'view_kanban',
    kicker: 'Production & Fabrics Table',
    title: 'See every uncut cloth, sewing job, and Friday deadline at a glance',
    text: 'Snap and tag every customer’s fabric on arrival, generate clean digital cutting slips for your cutters, and move orders through Documented, Cutting, Sewing, Fitting, and Ready.',
    image: '/images/marketing/sewing-machine-hands.jpg',
  },
  {
    icon: 'straighten',
    kicker: 'Client & Measurement Vault',
    title: 'Save every customer’s measurements forever — even offline',
    text: 'Pull up any returning client in two seconds, create custom style templates for Senator, Agbada, Corset Gown, or Bridal, and keep every record backed up safely if your phone is ever lost.',
    image: '/images/marketing/measuring-hands.jpg',
  },
  {
    icon: 'share',
    kicker: 'WhatsApp Tracking, Debtors & POS',
    title: 'Give clients a live tracking link and collect every balance faster',
    text: 'Share a no-login WhatsApp progress timeline, send one-tap balance reminders from your Debtors Ledger, and sell off-the-rack Ready-to-Wear pieces from the same workshop app.',
    image: '/images/marketing/hands-dark-fabric.jpg',
  },
];

const BENEFITS = [
  {
    icon: 'cloud_off',
    text: 'Works offline without data and syncs automatically when connection returns.',
  },
  {
    icon: 'storefront',
    text: 'Manage Ready-to-Wear rack stock (XS–3XL) and counter POS alongside bespoke sewing.',
  },
  {
    icon: 'groups',
    text: 'Add Cutters, Tailors, and Managers without exposing client phone numbers or shop revenue.',
  },
  {
    icon: 'photo_library',
    text: 'Get a free public portfolio website and WhatsApp lookbooks to win repeat orders.',
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
          alt="Tailor using MyStitchBook in the workshop"
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
          <span className={styles.heroEyebrow}>
            For Bespoke Tailors &amp; Ready-to-Wear Fashion Houses
          </span>
          <h1 className={styles.heroHeadline}>
            Your sewing is already great.{' '}
            <span className={styles.heroHeadlineAccent}>Now your shop runs like it.</span>
          </h1>
          <p className={styles.heroSubhead}>
            Save every customer’s measurement forever, tag every cloth that enters your shop, know
            which outfits are due this week, and collect every unpaid balance — even without internet.
          </p>
          <div className={styles.heroActions}>
            <Link href={ROUTES.signup} className={styles.ctaPrimary}>
              Start Free
              <Symbol name="arrow_forward" size={18} />
            </Link>
            <Link href={ROUTES.features} className={styles.ctaSecondaryOnPhoto}>
              See All Features
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Proof strip */}
      <section className={styles.proofStrip}>
        {[
          {
            src: '/images/marketing/proof-dashboard-home.jpg',
            darkSrc: '/images/marketing/proof-dashboard-home-dark.jpg',
            label: 'Dashboard overview',
          },
          {
            src: '/images/marketing/proof-production-board.jpg',
            darkSrc: '/images/marketing/proof-production-board-dark.jpg',
            label: 'Production board',
          },
          {
            src: '/images/marketing/proof-client-profiles.jpg',
            darkSrc: '/images/marketing/proof-client-profiles-dark.jpg',
            label: 'Client profiles',
          },
        ].map((shot, i) => (
          <motion.div
            key={shot.src}
            className={styles.proofCard}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.1 }}
          >
            <Image
              src={shot.src}
              alt={shot.label}
              width={960}
              height={540}
              className={`${styles.proofImage} ${styles.proofImageLight}`}
            />
            <Image
              src={shot.darkSrc}
              alt={shot.label}
              width={960}
              height={540}
              className={`${styles.proofImage} ${styles.proofImageDark}`}
            />
          </motion.div>
        ))}
      </section>

      {/* SECTION 1: Relatable Everyday Shop Struggles */}
      <section className={styles.painSection}>
        <motion.span className={styles.eyebrow} {...reveal(0.03)}>
          Why tailors leave paper jotters behind
        </motion.span>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
          Every tailor has faced these moments.
        </motion.h2>
        <div
          className={styles.painGrid}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {STRUGGLES.map((point, i) => (
            <motion.div
              key={point.title}
              className={styles.painCard}
              {...reveal(0.08 + i * 0.08, popIn)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '1rem', color: 'var(--sf-accent-rose)' }}>
                <Symbol name={point.icon} size={34} className={styles.painIcon} />
              </div>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 2: How MyStitchBook Works */}
      <section
        className={styles.featuresSection}
        style={{ padding: '6rem 2rem', background: 'var(--sf-bg-surface-elevated)', maxWidth: 'none' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1rem', width: '100%' }}>
          <motion.span className={styles.eyebrow} {...reveal(0.03)}>
            Simple daily workflow
          </motion.span>
          <motion.h2 className={styles.sectionTitle} {...reveal(0.05)} style={{ marginBottom: 0 }}>
            How MyStitchBook Works
          </motion.h2>
        </div>

        <div
          className={styles.painGrid}
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              className={styles.painCard}
              {...reveal(0.08 + i * 0.08, popIn)}
              style={{ textAlign: 'center', padding: '2rem' }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--sf-accent-emerald)',
                  color: 'white',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  marginBottom: '1.25rem',
                }}
              >
                <Symbol name={step.icon} size={26} />
              </div>
              <span className={styles.eyebrow} style={{ marginBottom: '0.5rem', display: 'block' }}>
                {step.step}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>{step.title}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 3: Visual Feature Highlights */}
      <section className={styles.featuresSection} style={{ paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <motion.span className={styles.eyebrow} {...reveal(0.05)} style={{ textAlign: 'center' }}>
            Inside the app
          </motion.span>
          <motion.h2 className={styles.sectionTitle} {...reveal(0.08)}>
            Everything you need, built in.
          </motion.h2>
        </div>
        {FEATURES.map((feature, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={feature.title}
              className={`${styles.featureRow} ${reversed ? styles.featureRowReverse : ''}`}
            >
              <motion.div
                className={styles.featureText}
                {...reveal(0, reversed ? slideInRight : slideInLeft)}
              >
                <span className={styles.eyebrow}>{feature.kicker}</span>
                <h2 className={styles.featureTitle}>{feature.title}</h2>
                <p className={styles.featureBody}>{feature.text}</p>
              </motion.div>
              <motion.div
                className={styles.featureImageWrap}
                {...reveal(0.1, reversed ? slideInLeft : slideInRight)}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={800}
                  height={600}
                  className={styles.featureImage}
                />
              </motion.div>
            </div>
          );
        })}
        <motion.div className={styles.featureLinkRow} {...reveal()}>
          <Link href={ROUTES.features} className={styles.featureLink}>
            See every feature
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </motion.div>
      </section>

      {/* SECTION 4: Benefits */}
      <section
        className={styles.painSection}
        style={{ padding: '5rem 2rem', background: 'var(--sf-bg-surface-elevated)', maxWidth: 'none' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.span className={styles.eyebrow} {...reveal(0.03)}>
            Built for solo tailors &amp; growing teams
          </motion.span>
          <motion.h2
            className={styles.sectionTitle}
            {...reveal(0.05)}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            Why workshops stay on MyStitchBook
          </motion.h2>
          <div
            className={styles.painGrid}
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit.text}
                className={styles.painCard}
                {...reveal(0.08 + i * 0.08, popIn)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  textAlign: 'left',
                  padding: '1.75rem',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--sf-accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Symbol name={benefit.icon} size={26} />
                </div>
                <p style={{ fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.45, margin: 0 }}>
                  {benefit.text}
                </p>
              </motion.div>
            ))}
          </div>
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
          {FREE_MONTHLY_ORDER_LIMIT} orders a month — upgrade only once your shop has genuinely
          outgrown that.
        </motion.p>
        <motion.div className={styles.pricingCards} {...reveal(0.12, popIn)}>
          <div className={styles.pricingCard}>
            <span className={styles.pricingCardName}>Free</span>
            <span className={styles.pricingCardPrice}>₦0</span>
            <ul>
              <li>Unlimited customers &amp; styles</li>
              <li>{FREE_MONTHLY_ORDER_LIMIT} orders / month</li>
              <li>Offline mode, receipts &amp; portfolio</li>
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
              <li>Staff &amp; multi-branch accounts</li>
              <li>Full financial insights</li>
            </ul>
          </div>
        </motion.div>
        <motion.div {...reveal(0.16)}>
          <Link href={ROUTES.pricing} className={styles.featureLink}>
            See full pricing details
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </motion.div>
      </section>

      {/* FAQ Accordion */}
      <section className={styles.faqSection} aria-labelledby="home-faq-heading">
        <div className={styles.faqHeader}>
          <span className={styles.eyebrow}>Questions tailors ask before joining</span>
          <h2 id="home-faq-heading" className={styles.sectionTitle}>
            Frequently Asked Questions
          </h2>
        </div>

        <div className={styles.faqList}>
          {HOMEPAGE_FAQS.map((item, idx) => (
            <details
              key={item.q}
              name="homepage-faq"
              className={styles.faqItem}
              open={idx === 0}
            >
              <summary className={styles.faqQuestion}>
                <span>{item.q}</span>
                <Symbol name="expand_more" size={20} className={styles.faqChevron} />
              </summary>
              <p className={styles.faqAnswer}>{item.a}</p>
            </details>
          ))}
        </div>
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
          <Link href={ROUTES.signup} className={styles.ctaPrimaryLight}>
            Start Free
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
