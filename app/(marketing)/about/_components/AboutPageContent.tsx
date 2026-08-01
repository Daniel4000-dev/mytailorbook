'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import { useReveal } from '@/lib/marketingMotion';
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
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.eyebrow}>Our Story</span>
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
        <motion.div className={styles.bentoCard} {...reveal(0.08)}>
          <Symbol name="auto_stories" size={26} className={styles.bentoIcon} />
          <h2>The Origin</h2>
          <p>
            Built by Adekunle Daniel, out of a simple observation: the software available to Nigerian tailors
            either locked away the data that mattered most, or never took the business seriously enough to
            charge for it.
          </p>
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
        <motion.div className={styles.finalCtaInner} {...reveal()}>
          <h2 className={styles.finalCtaTitle}>Come build with us.</h2>
          <p className={styles.finalCtaBody}>
            Set up your shop in under two minutes — free, forever, no card required.
          </p>
          <Link href="/signup" className={styles.ctaPrimary}>
            Start Free — No Card Required
            <Symbol name="arrow_forward" size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
