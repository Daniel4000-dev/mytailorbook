'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
import { ROUTES } from '@/lib/routes';
import styles from './AboutPageContent.module.css';

const VALUES = [
  {
    icon: 'lock_open',
    title: 'Data Ownership',
    text: 'Your customer records, measurements, and order history belong to you. We hold the vault, you hold the keys — export your data anytime, on any plan.',
  },
  {
    icon: 'handshake',
    title: 'Radical Transparency',
    text: 'No hidden fees, no invented limits, no fine print. Our pricing page says exactly what is free and exactly what is not.',
  },
  {
    icon: 'palette',
    title: 'Respect for Craft',
    text: 'We design with restraint and generous whitespace, so your colorful, detailed craftwork stays the centerpiece — not our interface.',
  },
];

export default function AboutPageContent() {
  const reveal = useReveal();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image src="/images/marketing/about-hero-community.jpg" alt="" fill sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroScrim} />
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.heroEyebrow}>Our Story</span>
          <h1 className={styles.heroHeadline}>Elevating the craft of tailoring through technology.</h1>
          <p className={styles.heroSubhead}>
            MyStitchBook merges the tactile heritage of textile arts with the precision of modern software — a
            calm, considered workspace for creators who take their craft seriously.
          </p>
        </motion.div>
      </section>

      <section className={styles.bento}>
        <motion.div className={`${styles.bentoCard} ${styles.bentoCardLarge}`} {...reveal()}>
          <Symbol name="visibility" size={26} className={styles.bentoIcon} />
          <h2>Our Mission</h2>
          <p>
            To give tailors and fashion creators a digital workspace that respects the tactile nature of their
            craft while offering real organizational power — technology that enhances the creative process,
            never overshadows it.
          </p>
        </motion.div>
      </section>

      <section className={styles.originSection}>
        <motion.div className={styles.originInner} {...reveal()}>
          <span className={styles.eyebrow}>How We Started</span>
          <h2 className={styles.sectionTitle}>It started with a shirt.</h2>
          <div className={styles.originBody}>
            <p>
              One of us placed a simple order, with a simple deadline. Days passed. Then a week. No update, no
              message — just silence. When the piece finally arrived, it wasn&apos;t quite right, and by then,
              neither was our trust.
            </p>
            <p>
              A month later, we ran into the same tailor by chance. The explanation was honest: days of power
              outages, orders piling up, no time left to keep anyone updated.
            </p>
            <p>
              That&apos;s when it clicked — this wasn&apos;t a bad tailor. This was a good tailor carrying too much,
              with nowhere to put it down. Every order, every promise, every measurement, living in one
              overworked memory instead of somewhere safe.
            </p>
            <p className={styles.originPullQuote}>
              The silence wasn&apos;t rudeness. It was a system missing.
            </p>
            <p>
              When we shared the story with the rest of our team, everyone had their own version of it — some
              from the customer&apos;s side, wondering; some from the tailor&apos;s side, drowning quietly while
              doing their best. This wasn&apos;t one bad shop having a bad day. It was happening everywhere, on
              both sides of the counter.
            </p>
            <p>
              So we built MyStitchBook — a simple place to keep every order, every customer, and every promise
              somewhere everyone can actually see. Not because tailors need to be told how to sew. Because
              everyone, on both sides, deserves to stop wondering.
            </p>
          </div>
        </motion.div>
      </section>

      <section className={styles.valuesSection}>
        <motion.span className={styles.eyebrow} {...reveal()}>
          Core Values
        </motion.span>
        <motion.h2 className={styles.sectionTitle} {...reveal(0.05)}>
          The principles that guide what we build.
        </motion.h2>
        <div className={styles.valuesGrid}>
          {VALUES.map((v, i) => (
            <motion.div key={v.title} className={styles.valueCard} {...reveal(0.1 + i * 0.08)}>
              <Symbol name={v.icon} size={26} className={styles.bentoIcon} />
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className={styles.heritageSection}>
        <motion.div className={styles.heritageInner} {...reveal()}>
          <div className={styles.heritageImageWrap}>
            <Image src="/images/marketing/adire-indigo-dyeing.jpg" alt="" width={512} height={512} className={styles.heritageImage} />
          </div>
          <div className={styles.heritageText}>
            <span className={styles.heritageEyebrow}>Why Adire Indigo</span>
            <h2 className={styles.heritageTitle}>The Adire Indigo heritage.</h2>
            <p className={styles.heritageBody}>
              Our signature color is named after Adire — a resist-dyed indigo cloth produced for centuries by
              Yoruba women in southwestern Nigeria, most famously in Abeokuta. Each pattern was hand-drawn or
              stitched before dyeing, carrying meaning through fabric long before anyone called it &ldquo;design.&rdquo;
            </p>
            <p className={styles.heritageBody}>
              We chose this hue deliberately, not decoratively. It is a visual anchor — a calm, deep canvas that
              honors a real textile tradition while giving today&apos;s creators a modern place to work.
            </p>
          </div>
        </motion.div>
      </section>

      <section className={styles.finalCta}>
        <Image src="/images/marketing/about-final-cta-team.jpg" alt="" fill sizes="100vw" className={styles.finalCtaBg} />
        <div className={styles.finalCtaScrim} />
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Come build with us.</h2>
          <p className={styles.finalCtaBody}>
            Set up your shop in under two minutes — free, forever, no card required.
          </p>
          <Link href={ROUTES.signup} className={styles.ctaPrimary}>
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
