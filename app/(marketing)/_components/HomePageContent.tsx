import Link from 'next/link';
import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import RevealLeaf from '@/components/marketing/RevealLeaf';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import { ROUTES } from '@/lib/routes';
import { HOMEPAGE_FAQS } from './homepageFaqs';
import styles from './HomePageContent.module.css';

const STRUGGLES = [
  {
    icon: 'auto_stories',
    title: 'Torn or lost measurement jotters',
    text: 'A returning VIP client says “use my last fit” and your notebook page is water-damaged, torn, or misplaced.',
  },
  {
    icon: 'texture',
    title: 'Untagged fabrics on the shelf',
    text: 'Three black cashmeres or emerald laces sit on your cutting table, and nobody is certain whose is whose.',
  },
  {
    icon: 'content_cut',
    title: 'Costly cutting table mistakes',
    text: 'A hurried handwritten 32 gets read as 37 by your cutter, wasting expensive client yardage from your own pocket.',
  },
  {
    icon: 'payments',
    title: 'Awkward balance collection',
    text: '“I will transfer the balance when I get home” turns into weeks of silent calls and uncollected earnings.',
  },
  {
    icon: 'event',
    title: 'Thursday night delivery shocks',
    text: 'Realizing late on Thursday evening that four bespoke outfits were promised for Friday morning church or event.',
  },
];

const HOW_IT_WORKS = [
  {
    icon: 'straighten',
    step: 'Step 1',
    title: 'Save measurements once',
    text: 'Permanent cloud backup, ready in 2 seconds, even offline.',
  },
  {
    icon: 'content_cut',
    step: 'Step 2',
    title: 'Tag cloth & cutting slip',
    text: 'Snap fabric on arrival. Give cutters clear, legible specs.',
  },
  {
    icon: 'view_kanban',
    step: 'Step 3',
    title: 'Track shop progress',
    text: 'See cutting, sewing, and fitting without shouting across the floor.',
  },
  {
    icon: 'share',
    step: 'Step 4',
    title: 'Live WhatsApp updates',
    text: 'Clients track progress live, ending repetitive “is it ready?” calls.',
  },
  {
    icon: 'account_balance_wallet',
    step: 'Step 5',
    title: 'Collect balances calmly',
    text: 'One-tap digital receipts and WhatsApp balance reminders that work.',
  },
];

const FEATURES = [
  {
    icon: 'view_kanban',
    kicker: 'Production & Fabrics Table',
    title: 'Every Friday deadline under control before Thursday night arrives',
    text: 'Snap and tag every customer’s fabric on arrival, generate clean digital cutting slips for your cutters, and see every garment moving smoothly through Documented, Cutting, Sewing, Fitting, and Ready.',
    image: '/images/marketing/sewing-machine-hands.jpg',
  },
  {
    icon: 'straighten',
    kicker: 'Client & Measurement Vault',
    title: 'Command instant respect every time a customer returns',
    text: 'Pull up any returning client’s complete fit history in two seconds. Store custom templates for Senator, Agbada, Kaftan, Corset, or Bridal wear. Even if your phone is lost, every client record remains safe forever.',
    image: '/images/marketing/measuring-hands.jpg',
  },
  {
    icon: 'share',
    kicker: 'Debtors Ledger & WhatsApp Tracking',
    title: 'Collect what you earned without chasing, begging, or awkwardness',
    text: 'Delight clients with a private, no-login WhatsApp link to watch their outfit take shape. When it’s ready, send one-tap balance reminders with digital receipts that make timely payments effortless.',
    image: '/images/marketing/hands-dark-fabric.jpg',
  },
];

const BENEFITS = [
  {
    icon: 'cloud_off',
    title: 'Works 100% Offline',
    text: 'No data? Weak signal? Record measurements and advance orders without pause. Everything syncs silently when your phone reconnects.',
  },
  {
    icon: 'storefront',
    title: 'Bespoke + Ready-to-Wear',
    text: 'Manage bespoke custom orders alongside rack sizes (XS–3XL) and counter POS in the same clean, unified workshop flow.',
  },
  {
    icon: 'groups',
    title: 'Protect Your Shop Secrets',
    text: 'Give Cutters and Tailors the cutting slips and style photos they need to sew, while keeping client contacts and revenue private.',
  },
  {
    icon: 'photo_library',
    title: 'Command Luxury Pricing',
    text: 'An automatic public portfolio website and WhatsApp lookbook catalogues showcase your work like a high-end fashion house.',
  },
];

const MOBILE_SHOWCASE = [
  {
    roleClass: styles.deviceWrapperLeft,
    src: '/images/marketing/mobile-measurement-vault.jpg',
    label: 'Client Measurement Vault',
    kicker: 'Permanent & Offline',
    alt: 'Permanent client measurement profile showing upper body bespoke landmarks',
    delay: 0.1,
  },
  {
    roleClass: styles.deviceWrapperCenter,
    src: '/images/marketing/mobile-production-board.jpg',
    label: 'Bespoke Production Board',
    kicker: 'Cutting to Delivery',
    alt: 'Bespoke production board with burgundy jacquard Agbada ready for try-on',
    delay: 0.2,
  },
  {
    roleClass: styles.deviceWrapperRight,
    src: '/images/marketing/mobile-order-tracking.jpg',
    label: 'Live WhatsApp Tracker',
    kicker: 'Zero Login Needed',
    alt: 'Customer live WhatsApp tracking link with real-time status and digital receipt',
    delay: 0.3,
  },
];

/**
 * HomePageContent is a pure React Server Component (RSC).
 *
 * It ships zero component JavaScript for all static typography, struggle cards,
 * feature showcases, and pricing tiers. Client hydration and motion observers are
 * isolated into lightweight leaf components (<RevealLeaf>).
 */
export default function HomePageContent() {
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
        <RevealLeaf className={styles.heroContent} animateOnMount>
          <span className={styles.heroEyebrow}>
            For Bespoke Tailors &amp; Ready-to-Wear Fashion Houses
          </span>
          <h1 className={styles.heroHeadline}>
            Your sewing is already great.{' '}
            <span className={styles.heroHeadlineAccent}>Now your shop runs like it.</span>
          </h1>
          <p className={styles.heroSubhead}>
            Never lose a client’s measurement. Never mix up fabrics on the cutting table. Never chase
            awkward balances in the dark. Run your fashion business with calm, unmistakable control — even without internet.
          </p>
          <div className={styles.heroActions}>
            <Link href={ROUTES.signup} className={styles.ctaPrimary}>
              Start Free
              <Symbol name="arrow_forward" size={18} />
            </Link>
            <Link href={ROUTES.features} className={styles.ctaSecondaryOnPhoto}>
              See How Your Shop Transforms
            </Link>
          </div>
        </RevealLeaf>
      </section>

      {/* Proof stage — 3-Device Beveled iPhone Showcase */}
      <section className={styles.proofStage} aria-label="MyStitchBook Mobile Interface Showcase">
        {MOBILE_SHOWCASE.map((device) => (
          <RevealLeaf
            key={device.src}
            className={`${styles.deviceWrapper} ${device.roleClass}`}
            animateOnMount
            delay={device.delay}
          >
            <div className={styles.phoneFrame}>
              <div className={styles.phoneScreen}>
                <Image
                  src={device.src}
                  alt={device.alt}
                  width={473}
                  height={1024}
                  priority
                  className={styles.phoneImage}
                />
                <div className={styles.phoneGlare} />
              </div>
            </div>
            <div className={styles.deviceBadge}>
              <span className={styles.deviceBadgeKicker}>{device.kicker}</span>
              <span>{device.label}</span>
            </div>
          </RevealLeaf>
        ))}
      </section>

      {/* SECTION 1: Relatable Everyday Shop Struggles */}
      <section className={styles.painSection}>
        <RevealLeaf as="span" className={styles.eyebrow} delay={0.03}>
          The daily friction in the workshop
        </RevealLeaf>
        <RevealLeaf as="h2" className={styles.sectionTitle} delay={0.05}>
          Every master tailor has lived through these moments.
        </RevealLeaf>
        <RevealLeaf as="p" className={styles.sectionSubhead} delay={0.07}>
          Your hands create beauty every day. Paper chaos shouldn’t steal your peace of mind.
        </RevealLeaf>
        <div
          className={styles.painGrid}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {STRUGGLES.map((point, i) => (
            <RevealLeaf
              key={point.title}
              className={styles.painCard}
              variant="popIn"
              delay={0.08 + i * 0.08}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '1rem', color: 'var(--sf-accent-rose)' }}>
                <Symbol name={point.icon} size={34} className={styles.painIcon} />
              </div>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </RevealLeaf>
          ))}
        </div>
      </section>

      {/* SECTION 2: How Your Workshop Runs */}
      <section
        className={styles.featuresSection}
        style={{ padding: '6rem 2rem', background: 'var(--sf-bg-surface-elevated)', maxWidth: 'none' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
          <RevealLeaf as="span" className={styles.eyebrow} delay={0.03}>
            Your new daily standard
          </RevealLeaf>
          <RevealLeaf as="h2" className={styles.sectionTitle} delay={0.05} style={{ marginBottom: '0.75rem' }}>
            How your workshop runs from tomorrow.
          </RevealLeaf>
          <RevealLeaf as="p" className={styles.sectionSubhead} delay={0.07}>
            Five calm steps that replace notebooks, scrap paper, and phone calls.
          </RevealLeaf>
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
            <RevealLeaf
              key={step.step}
              className={styles.painCard}
              variant="popIn"
              delay={0.08 + i * 0.08}
              style={{ textAlign: 'center', padding: '2rem 1.5rem' }}
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{step.title}</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.45, color: 'var(--sf-text-secondary)', margin: 0 }}>
                {step.text}
              </p>
            </RevealLeaf>
          ))}
        </div>
      </section>

      {/* SECTION 3: Visual Feature Highlights */}
      <section className={styles.featuresSection} style={{ paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <RevealLeaf as="span" className={styles.eyebrow} delay={0.05} style={{ textAlign: 'center' }}>
            Built for the craft, not a cubicle
          </RevealLeaf>
          <RevealLeaf as="h2" className={styles.sectionTitle} delay={0.08}>
            The calm and confidence your work deserves.
          </RevealLeaf>
        </div>
        {FEATURES.map((feature, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={feature.title}
              className={`${styles.featureRow} ${reversed ? styles.featureRowReverse : ''}`}
            >
              <RevealLeaf
                className={styles.featureText}
                variant={reversed ? 'slideInRight' : 'slideInLeft'}
              >
                <span className={styles.eyebrow}>{feature.kicker}</span>
                <h2 className={styles.featureTitle}>{feature.title}</h2>
                <p className={styles.featureBody}>{feature.text}</p>
              </RevealLeaf>
              <RevealLeaf
                className={styles.featureImageWrap}
                delay={0.1}
                variant={reversed ? 'slideInLeft' : 'slideInRight'}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={800}
                  height={600}
                  className={styles.featureImage}
                />
              </RevealLeaf>
            </div>
          );
        })}
        <RevealLeaf className={styles.featureLinkRow}>
          <Link href={ROUTES.features} className={styles.featureLink}>
            See every feature
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </RevealLeaf>
      </section>

      {/* SECTION 4: Benefits */}
      <section
        className={styles.painSection}
        style={{ padding: '5rem 2rem', background: 'var(--sf-bg-surface-elevated)', maxWidth: 'none' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <RevealLeaf as="span" className={styles.eyebrow} delay={0.03}>
            Why generic software fails tailors
          </RevealLeaf>
          <RevealLeaf
            as="h2"
            className={styles.sectionTitle}
            delay={0.05}
            style={{ textAlign: 'center', marginBottom: '0.75rem' }}
          >
            Engineered for workshop reality, not an office desk.
          </RevealLeaf>
          <RevealLeaf as="p" className={styles.sectionSubhead} delay={0.07}>
            Spreadsheets get deleted, foreign apps demand high-speed Wi-Fi, and jotters tear. We built this from the ground up for how African fashion houses thrive.
          </RevealLeaf>
          <div
            className={styles.painGrid}
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {BENEFITS.map((benefit, i) => (
              <RevealLeaf
                key={benefit.title}
                className={styles.painCard}
                variant="popIn"
                delay={0.08 + i * 0.08}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
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
                    marginTop: '2px',
                  }}
                >
                  <Symbol name={benefit.icon} size={26} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--sf-text-primary)' }}>
                    {benefit.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', fontWeight: 400, lineHeight: 1.5, margin: 0, color: 'var(--sf-text-secondary)' }}>
                    {benefit.text}
                  </p>
                </div>
              </RevealLeaf>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className={styles.pricingTeaser}>
        <RevealLeaf as="span" className={styles.eyebrow}>
          Simple, honest pricing
        </RevealLeaf>
        <RevealLeaf as="h2" className={styles.sectionTitle} delay={0.05}>
          A plan for every workshop.
        </RevealLeaf>
        <RevealLeaf className={styles.pricingTeaserBody} delay={0.08}>
          Unlimited customers and unlimited custom styles, on every plan, forever. Free gets you{' '}
          {FREE_MONTHLY_ORDER_LIMIT} orders a month — upgrade only once your shop has genuinely
          outgrown that.
        </RevealLeaf>
        <RevealLeaf className={styles.pricingCards} variant="popIn" delay={0.12}>
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
        </RevealLeaf>
        <RevealLeaf delay={0.16}>
          <Link href={ROUTES.pricing} className={styles.featureLink}>
            See full pricing details
            <Symbol name="arrow_forward" size={16} />
          </Link>
        </RevealLeaf>
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
        <RevealLeaf className={styles.finalCtaInner} variant="popIn">
          <h2 className={styles.finalCtaTitle}>Stop running on panic. Start running like a fashion house.</h2>
          <p className={styles.finalCtaBody}>
            It takes less than two minutes to set up your workshop. Unlimited customers, permanent measurements, and 10 orders each month free forever.
          </p>
          <Link href={ROUTES.signup} className={styles.ctaPrimaryLight}>
            Start Free
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </RevealLeaf>
      </section>
    </div>
  );
}
