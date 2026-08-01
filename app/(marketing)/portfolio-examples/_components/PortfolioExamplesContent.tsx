'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
import styles from './PortfolioExamplesContent.module.css';

const PROOF_POINTS = [
  { icon: 'auto_awesome', text: 'Generated automatically from your finished orders' },
  { icon: 'toggle_on', text: 'Free on every plan, forever' },
  { icon: 'tune', text: 'Switch templates anytime in Settings' },
];

export default function PortfolioExamplesContent() {
  const reveal = useReveal();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image src="/images/marketing/product-portfolio-showcase-phone.jpg" alt="" fill sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroScrim} />
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.heroEyebrow}>Showcase</span>
          <h1 className={styles.heroHeadline}>Your work deserves a stage.</h1>
          <p className={styles.heroSubhead}>
            Every shop gets a free public portfolio page — a beautiful, shareable showcase of your finished work.
            Pick the template that fits how you present your craft.
          </p>
          <Link href="/signup" className={styles.ctaPrimary}>
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>

      <motion.section className={styles.proofStrip} {...reveal()}>
        {PROOF_POINTS.map((p) => (
          <div key={p.text} className={styles.proofItem}>
            <Symbol name={p.icon} size={20} />
            <span>{p.text}</span>
          </div>
        ))}
      </motion.section>

      <section className={styles.bentoGrid}>
        <motion.article className={`${styles.templateCard} ${styles.templateCardHero}`} {...reveal()}>
          <div className={styles.templateImageWrap}>
            <Image src="/images/marketing/atelier-review.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.templateImage} />
            <span className={styles.templateTag}>Clean &amp; Modern</span>
          </div>
          <div className={styles.templateBody}>
            <h2 className={styles.templateName}>Modern</h2>
            <p className={styles.templateDesc}>
              A clean, grid-based showcase built for everyday bespoke work — ideal for tailors with a steady
              stream of finished pieces who want a straightforward, professional gallery.
            </p>
            <Link href="/signup" className={styles.templateCta}>
              Preview Modern
              <Symbol name="arrow_forward" size={16} />
            </Link>
          </div>
        </motion.article>

        <motion.article className={`${styles.templateCard} ${styles.templateCardSide}`} {...reveal(0.08)}>
          <div className={styles.templateImageWrap}>
            <Image src="/images/marketing/hero-tailor-tablet.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.templateImage} />
            <span className={styles.templateTag}>Bold &amp; Editorial</span>
          </div>
          <div className={styles.templateBody}>
            <h2 className={styles.templateName}>Editorial</h2>
            <p className={styles.templateDesc}>
              Magazine-style layout with bold typography — perfect for high-fashion designers who want their
              portfolio to feel like a lookbook, not a catalog.
            </p>
            <Link href="/signup" className={styles.templateCta}>
              Preview Editorial
              <Symbol name="arrow_forward" size={16} />
            </Link>
          </div>
        </motion.article>

        <motion.article className={`${styles.templateCard} ${styles.templateCardWide}`} {...reveal(0.16)}>
          <div className={styles.templateImageWrap}>
            <Image src="/images/marketing/moodboard.jpg" alt="" fill sizes="100vw" className={styles.templateImage} />
            <span className={styles.templateTag}>Warm &amp; Story-Driven</span>
          </div>
          <div className={styles.templateBody}>
            <h2 className={styles.templateName}>Heritage</h2>
            <p className={styles.templateDesc}>
              A warm, story-driven layout with room for your founding year and your shop&apos;s story — built for
              legacy family studios and tailors whose craft is part of a longer tradition.
            </p>
            <Link href="/signup" className={styles.templateCtaOutline}>
              Preview Heritage
              <Symbol name="arrow_forward" size={16} />
            </Link>
          </div>
        </motion.article>
      </section>

      <section className={styles.finalCta}>
        <Image src="/images/marketing/product-home-phone.jpg" alt="" fill sizes="100vw" className={styles.finalCtaBg} />
        <div className={styles.finalCtaScrim} />
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Ready to build yours?</h2>
          <p className={styles.finalCtaBody}>
            Your portfolio fills itself in as you complete orders — no separate website needed.
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
