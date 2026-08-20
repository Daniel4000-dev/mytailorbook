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
    kicker: 'Workflow',
    title: 'A production board built for tailoring',
    text: 'Move every order through your own stages — Documented, Cutting, Sewing, Ready, Completed — and see exactly where each garment stands at a glance. Nothing slips through the cracks when your whole workshop is visualized in one board.',
    bullets: ['Customizable stages', 'Deadline tracking', 'Priority flags for rush orders'],
    image: '/images/marketing/sewing-machine-hands.jpg',
    premium: false,
  },
  {
    icon: 'straighten',
    kicker: 'Management',
    title: 'Digital client profiles, done properly',
    text: 'Full measurement sets, preferred styles, and fabric notes for every customer — searchable, organized, and shared with your team. Unlimited customers, forever, on every plan.',
    bullets: ['Unlimited customer records', 'Per-style measurement templates', 'Order history at a glance'],
    image: '/images/marketing/measuring-hands.jpg',
    premium: false,
  },
  {
    icon: 'checkroom',
    kicker: 'Customization',
    title: 'Custom styles that match how you actually work',
    text: 'Set up your own style templates — Agbada, Kaftan, Senator, or anything you design — with the exact measurement fields each one needs. Unlimited, free, forever.',
    bullets: ['Unlimited custom styles', 'Per-style measurement fields', 'Reused instantly on new orders'],
    image: '/images/marketing/home-final-cta-stitching.jpg',
    premium: false,
  },
  {
    icon: 'share',
    kicker: 'Customer Experience',
    title: 'A tracking link your customers actually want',
    text: 'Send a link over WhatsApp and let your customer follow their order as a photo timeline — no login, no app to download, no more "any update?" texts interrupting your day.',
    bullets: ['Public, no-login tracking page', 'Photo updates at every stage', 'You control what gets shared'],
    image: '/images/marketing/features-tracking-link.jpg',
    premium: false,
  },
  {
    icon: 'photo_library',
    kicker: 'Showcase',
    title: 'A public portfolio, generated automatically',
    text: 'Every shop gets a free public portfolio page built from your finished work — no separate website needed. Choose from three templates: Modern, Editorial, or Heritage.',
    bullets: ['Three template styles to choose from', 'Auto-updates from your finished orders', 'Shareable link for social/WhatsApp'],
    image: '/images/marketing/atelier-review.jpg',
    premium: false,
  },
  {
    icon: 'receipt_long',
    kicker: 'Paperwork',
    title: 'Receipts and invoices, without the spreadsheet',
    text: "Generate a clean, professional receipt or invoice the moment payment comes in — unlimited, on every plan. It's part of running your business properly, not something we hold back for later.",
    bullets: ['Unlimited receipts & invoices', 'Deposit and balance tracking', 'Shareable link for your customer'],
    image: '/images/marketing/tablet-indigo-fabric.jpg',
    premium: false,
  },
  {
    icon: 'group',
    kicker: 'Growing Teams',
    title: 'Staff accounts, when your team grows',
    text: "Bring on team members with their own logins, track who's handling each order, and keep everyone working from the same production board. This is where a shop that's genuinely grown pays for the software that got it there.",
    bullets: ['Individual staff logins', 'Role-based access (Staff, Branch Manager, Accountant)', 'Full activity visibility'],
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
