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
    icon: 'straighten',
    kicker: 'Client & Measurement Vault',
    title: 'Permanent measurement records that never get lost, torn, or misread',
    text: 'Capture 30+ standard male and female body landmarks or create your own custom style templates. Search any returning customer by name or phone number in two seconds, compare past measurements, and attach posture or style reference notes.',
    bullets: [
      '30+ structured male & female body points plus custom style templates',
      'One-tap phonebook contact import & instant search',
      'Unlimited customer records on every plan forever',
    ],
    image: '/images/marketing/measuring-hands.jpg',
    premium: false,
  },
  {
    icon: 'view_kanban',
    kicker: 'Bespoke Production & Fabrics Table',
    title: 'Production board, fabric intake & digital cutting slips',
    text: 'Log every customer fabric on arrival, track uncut vs. cut bolts and beading stages, generate digital cutting slips for your cutters, and move orders across Documented, Cutting, Sewing, Fitting, Ready, and Delivered.',
    bullets: [
      'Dedicated Fabrics Table & digital cutting slips',
      'Fitting calendar with verdict & alteration notes',
      'Aso-Ebi & bridal group batch order management',
    ],
    image: '/images/marketing/sewing-machine-hands.jpg',
    premium: false,
  },
  {
    icon: 'storefront',
    kicker: 'Ready-to-Wear & POS',
    title: 'Run your Ready-to-Wear showroom alongside bespoke couture',
    text: 'Manage multi-size garment racks (XS to 3XL), rack locations, low-stock alerts, and counter POS sales with instant discounts and WhatsApp e-Receipts — all inside the same workshop app.',
    bullets: [
      'Multi-size inventory matrix (XS–3XL) & rack locations',
      'Counter POS cart with discount & client attribution',
      'Automated low-stock alerts & instant e-Receipts',
    ],
    image: '/images/marketing/home-final-cta-stitching.jpg',
    premium: false,
  },
  {
    icon: 'cloud_off',
    kicker: 'Offline-First Reliability',
    title: 'Works without internet — auto-syncs when data returns',
    text: 'Unstable network should never stop a fitting or consultation. Take measurements, create orders, and update production stages offline; our smart outbox syncs everything seamlessly once you are back online.',
    bullets: [
      'Offline measurement & order capture',
      'Smart conflict-free background outbox sync',
      'Installable on Android, iOS & Desktop',
    ],
    image: '/images/marketing/features-tracking-link.jpg',
    premium: false,
  },
  {
    icon: 'share',
    kicker: 'Client Experience & Lookbooks',
    title: 'Live WhatsApp tracking timelines, public portfolio & seasonal catalogues',
    text: 'Send a private tracking link over WhatsApp so clients watch their garment progress as a photo timeline without calling to ask "any update?". Plus, publish your auto-generated portfolio and curated seasonal lookbooks.',
    bullets: [
      'Public, no-login WhatsApp order tracking timeline',
      'Modern, Editorial & Heritage portfolio templates',
      'Lookbook catalogues with smart WhatsApp client outreach',
    ],
    image: '/images/marketing/atelier-review.jpg',
    premium: false,
  },
  {
    icon: 'receipt_long',
    kicker: 'Finances & Debt Recovery',
    title: 'Debtors ledger, formal quotes, receipts & financial reconciliation',
    text: 'See every unpaid balance across your workshop in one calm Debtors Ledger, send courteous one-tap WhatsApp payment reminders, issue formal quotes and digital receipts, and reconcile shop expenses.',
    bullets: [
      'Dedicated Debtors Ledger with one-tap WhatsApp reminders',
      'Unlimited digital receipts, invoices & quotes',
      'Expense tracking & net profit reconciliation',
    ],
    image: '/images/marketing/tablet-indigo-fabric.jpg',
    premium: false,
  },
  {
    icon: 'group',
    kicker: 'Multi-Branch, Craft Roles & The Tailors Circle',
    title: 'Specialized craft roles, multi-branch switching & the 90-Day Championship',
    text: 'Assign dedicated logins for Cutters, Tailors, Beaders, QC, Branch Managers, and Accountants across multiple shop branches — while building daily workshop streaks and competing in the 90-Day Industrial Sewing Machine Championship.',
    bullets: [
      'Specialized roles (Cutter, Tailor, Beader, QC, Manager, Accountant)',
      'Multi-branch shop switcher & full activity audit logs',
      'The Tailors Circle guild, scarce badges & 90-Day Championship',
    ],
    image: '/images/marketing/features-staff-team.jpg',
    premium: true,
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
          <span className={styles.heroEyebrow}>Everything in one place</span>
          <h1 className={styles.heroHeadline}>Master every stitch. Command your studio.</h1>
          <p className={styles.heroSubhead}>
            From the first measurement to the final delivery — and everything your customer sees along the way.
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
          <h2 className={styles.finalCtaTitle}>See what fits your shop.</h2>
          <p className={styles.finalCtaBody}>
            Every feature above except staff accounts is free, forever, with no card required to start.
          </p>
          <div className={styles.finalCtaActions}>
            <Link href={ROUTES.signup} className={styles.ctaPrimary}>
              Start Free — No Card Required
              <Symbol name="arrow_forward" size={18} />
            </Link>
            <Link href={ROUTES.pricing} className={styles.ctaSecondary}>
              Compare Plans
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
