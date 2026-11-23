'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
import { ROUTES } from '@/lib/routes';
import styles from './FeaturesPageContent.module.css';

const FEATURES = [
  {
    icon: 'view_kanban',
    kicker: 'The Cutting Table Transformation',
    title: 'Stop fabric mix-ups, ruined lace, and apprentice cutting mistakes',
    text: 'The minute a customer delivers their fabric, snap a photo and record yardage, fabric type (cashmere, jacquard, aso-oke, silk, lace), and design notes. Generate a clean digital cutting slip for your cutters so apprentices know the exact styling details, necklines, and pocket depths without guessing or cutting the wrong side of the cloth.',
    bullets: [
      'Fabric intake photo archive with yardage, bolt notes, and client tags',
      'Apprentice-proof cutting slips with exact allowances & styling sketches',
      'Clear status stages: Documented → Cutting → Sewing → Fitting → Ready',
    ],
    image: '/images/marketing/sewing-machine-hands.jpg',
    premium: false,
  },
  {
    icon: 'straighten',
    kicker: 'Measurement Vault & Anatomy Science',
    title: 'Permanent anatomical records that never get lost, torn, or misplaced',
    text: 'Paper notebooks get misread, torn, or misplaced when you travel. Store complete anatomical measurements for Senator wear, 3-Piece Agbada, Kaftan, Corsets, and Bridal wear. Track posture nuances (sloping shoulder, prominent stomach, swayback) and compare past measurements side-by-side to guarantee returning clients an effortless, perfect fit.',
    bullets: [
      '30+ precision anatomical landmarks + custom bespoke templates (Senator, Agbada, Kaftan, Bridal)',
      'Posture, body slope, and fitting nuance notes permanently attached to client records',
      'Compare past vs. new measurements side-by-side across visits',
    ],
    image: '/images/marketing/measuring-hands.jpg',
    premium: false,
  },
  {
    icon: 'straighten',
    kicker: 'Fitting Session & Alteration Mastery',
    title: 'Turn tense fitting sessions into confident, flawless second-try perfection',
    text: 'Schedule try-on sessions directly in your shop calendar. During the fitting, record verdicts (Perfect Fit, Minor Adjustment, Rework) with exact chalk-line reference photos and seamstress instructions. Never repeat the same alteration twice.',
    bullets: [
      'Fitting appointment calendar with automatic client WhatsApp reminders',
      'Visual alteration logs with photo annotations and seam adjustments',
      'Fitting history records so every subsequent outfit fits even better',
    ],
    image: '/images/marketing/features-tracking-link.jpg',
    premium: false,
  },
  {
    icon: 'share',
    kicker: 'Client Experience & Digital Prestige',
    title: 'End repetitive "is it ready?" phone calls while commanding luxury respect',
    text: 'Delight clients with a private, no-login WhatsApp link where their outfit\'s story unfolds. When their Agbada or evening gown is pressed, they see a live photo update of their finished piece. Plus, share your seasonal catalogues and public lookbook to attract high-paying clients.',
    bullets: [
      'Zero-friction live web link (no app download or login required for clients)',
      'Automated progress photos (Cutting, Assembling, Hand-beading, Final Pressing)',
      'Digital lookbooks and curated seasonal catalogues ready to share on WhatsApp',
    ],
    image: '/images/marketing/hands-dark-fabric.jpg',
    premium: false,
  },
  {
    icon: 'receipt_long',
    kicker: 'Financial Clarity & Debt Recovery',
    title: 'Collect every naira you earned without begging, chasing, or awkwardness',
    text: 'See every single outstanding balance across your entire workshop in one calm Debtors Ledger. Issue formal digital quotes, send instant PDF e-Receipts, and send courteous one-tap WhatsApp payment reminders formatted with your shop\'s bank account details.',
    bullets: [
      'Dedicated Debtors Ledger showing exact deposits vs. balances due across all orders',
      'Courteous, one-tap WhatsApp payment reminders formatted with your bank account',
      'Instant digital e-Receipts & professional branded quotes',
    ],
    image: '/images/marketing/tablet-indigo-fabric.jpg',
    premium: false,
  },
  {
    icon: 'group',
    kicker: 'Team Delegation & Trade Secret Protection',
    title: 'Empower your cutters and tailors without exposing client contacts or revenue',
    text: 'Protect your hard-earned client list and financial privacy. Give Cutters, Tailors, and Beaders access to only the cutting slips and garment photos they need to work. Keep client phone numbers and revenue ledgers strictly restricted to you and your branch manager.',
    bullets: [
      'Role-based permissions (Cutter, Tailor, Beader, QC, Manager, Accountant)',
      'Client contact numbers and revenue masked from workshop floor staff',
      'Multi-branch switcher with full activity audit trails across all locations',
    ],
    image: '/images/marketing/features-staff-team.jpg',
    premium: true,
  },
  {
    icon: 'storefront',
    kicker: 'Showroom & Retail Inventory',
    title: 'Sell ready-to-wear racks alongside custom bespoke orders',
    text: 'Expand your business beyond custom bespoke orders. Track ready-to-wear inventory across rack sizes (XS to 3XL), monitor low-stock thresholds, and ring up walk-in sales at the counter with instant discounts and WhatsApp receipts.',
    bullets: [
      'Multi-size inventory matrix (XS–3XL) with rack location tags',
      'Counter POS checkout with instant discounts and customer attribution',
      'Automatic low-stock warnings before popular styles run out',
    ],
    image: '/images/marketing/home-final-cta-stitching.jpg',
    premium: false,
  },
];

export default function FeaturesPageContent() {
  const reveal = useReveal();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image src="/images/marketing/moodboard.jpg" alt="" fill sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroScrim} />
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.heroEyebrow}>The Complete Workshop Transformation</span>
          <h1 className={styles.heroHeadline}>Your craft creates beauty. Now your shop runs with calm, undeniable control.</h1>
          <p className={styles.heroSubhead}>
            See how every frustrating bottleneck in your workshop — mixed-up fabrics, lost measurements, apprentice mistakes, and awkward debt calls — turns into a smooth, dignified workflow.
          </p>
        </motion.div>
      </section>

      <section className={styles.featuresSection}>
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            className={`${styles.featureRow} ${i % 2 === 1 ? styles.featureRowReverse : ''}`}
            {...reveal()}
          >
            <div className={styles.featureText}>
              <div className={styles.kickerRow}>
                <span className={styles.eyebrow}>{feature.kicker}</span>
                {feature.premium && <span className={styles.premiumBadge}>Premium</span>}
              </div>
              <h2 className={styles.featureTitle}>{feature.title}</h2>
              <p className={styles.featureBody}>{feature.text}</p>
              <ul className={styles.featureBullets}>
                {feature.bullets.map((b) => (
                  <li key={b}>
                    <Symbol name="check_circle" size={16} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.featureImageWrap}>
              <Image src={feature.image} alt="" width={800} height={600} className={styles.featureImage} />
            </div>
          </motion.div>
        ))}
      </section>

      <section className={styles.finalCta}>
        <Image src="/images/marketing/tablet-indigo-fabric.jpg" alt="" fill sizes="100vw" className={styles.finalCtaBg} />
        <div className={styles.finalCtaScrim} />
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Your craft is ready for this level of calm and control.</h2>
          <p className={styles.finalCtaBody}>
            Every bespoke tool above is free forever for solo tailors. No debit card required, no trial expiration, and works 100% offline.
          </p>
          <div className={styles.finalCtaActions}>
            <Link href={ROUTES.signup} className={styles.ctaPrimary}>
              Start Free — No Card Needed
              <Symbol name="arrow_forward" size={18} />
            </Link>
            <Link href={ROUTES.pricing} className={styles.ctaSecondary}>
              Compare Plans &amp; Pricing
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
