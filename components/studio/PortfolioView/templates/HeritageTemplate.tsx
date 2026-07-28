'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa6';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { PublicPortfolio } from '@/app/public-actions';
import styles from './HeritageTemplate.module.css';

// Same wording as the other templates (see ModernTemplate.tsx's
// PROCESS_STEPS) — the journey is described consistently everywhere.
const JOURNEY_STEPS = [
  { title: 'Measured', text: 'Taken in person, kept safely on file for every future order.' },
  { title: 'Fabric Cut', text: 'Cut to your exact numbers, never a generic size.' },
  { title: 'Sewn by Hand', text: 'Finished and checked twice before it ever leaves the shop.' },
  { title: 'Delivered', text: 'Tracked live from our hands to yours.' },
];

function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
}

export default function HeritageTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop, photos, testimonials } = portfolio;
  const reduceMotion = useReducedMotion();

  const heroPhoto = photos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const galleryPhotos = photos.slice(0, 3);

  const fadeUp = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className={styles.page} data-accent={shop.portfolioAccent}>
      {/* 1. Hero + identity */}
      <section className={styles.hero}>
        {heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroPhoto.url} alt="" />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />
      </section>

      <div className={styles.intro}>
        <div className={styles.crest}>
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logoUrl} alt="" />
          ) : (
            shop.name[0]?.toUpperCase()
          )}
        </div>
        <h1 className={styles.name}>{shop.name}</h1>
        {(shop.foundedYear || city) && (
          <span className={styles.est}>
            {shop.foundedYear ? `Est. ${shop.foundedYear}` : ''}
            {shop.foundedYear && city ? ' · ' : ''}
            {city || ''}
          </span>
        )}
        {shop.tagline && <p className={styles.tagline}>{shop.tagline}</p>}
      </div>

      {/* 2. The Journey of Your Garment — the template's signature motion */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Journey of Your Garment</h2>
        <p className={styles.sectionSub}>Every piece follows the same steps — nothing rushed, nothing skipped.</p>
        <div className={styles.timeline}>
          <div className={styles.timelineRail} aria-hidden="true" />
          {JOURNEY_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className={styles.node}
              initial={reduceMotion ? undefined : { opacity: 0, x: -10 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.12 }}
            >
              <span className={styles.nodeDot} />
              <span className={styles.nodeTitle}>{step.title}</span>
              <span className={styles.nodeText}>{step.text}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Recent work gallery, with per-photo captions */}
      {galleryPhotos.length > 0 && (
        <motion.section className={styles.section} style={{ paddingTop: 0 }} {...fadeUp}>
          <h2 className={styles.sectionTitle}>Recent Work</h2>
          <div className={styles.gallery}>
            {galleryPhotos.map((p, i) => (
              <div key={`${p.url}-${i}`} className={`${styles.galleryItem} ${i === 0 ? styles.tall : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.garment} />
                <span className={styles.galleryCap}>{p.caption || `${p.garment} · ${monthOf(p.takenAt)}`}</span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* 4. Founder quote — only when there's a real bio to draw from */}
      {shop.bio && (
        <motion.section className={styles.section} style={{ paddingTop: 0 }} {...fadeUp}>
          <div className={styles.founderCard}>
            <div>
              <p className={styles.founderQuote}>&ldquo;{shop.bio}&rdquo;</p>
              <span className={styles.founderName}>— Founder, {shop.name}</span>
            </div>
          </div>
        </motion.section>
      )}

      {/* 5. Real customer testimonials — the trust-closer */}
      {testimonials.length > 0 && (
        <motion.section className={styles.section} style={{ paddingTop: 0 }} {...fadeUp}>
          <h2 className={styles.sectionTitle}>Voices of Our Customers</h2>
          <p className={styles.sectionSub}>Every review comes from a completed, verified order.</p>
          {testimonials.map((t, i) => (
            <div key={i} className={styles.reviewCard}>
              <span className={styles.reviewStars}>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
              {t.comment && <p className={styles.reviewQuote}>&ldquo;{t.comment}&rdquo;</p>}
              <span className={styles.reviewAttrib}><b>{t.customerName}</b></span>
            </div>
          ))}
        </motion.section>
      )}

      {/* 6. Closing CTA */}
      {whatsappHref && (
        <motion.section {...fadeUp}>
          <div className={styles.cta}>
            <h2>Ready to sew something?</h2>
            <p>Send a reference photo{city ? ` or visit us in ${city}` : ''} — every order is measured to you and tracked live.</p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaBtn}>
              <FaWhatsapp size={20} /> Start a Conversation
            </a>
            <span className={styles.guarantee}>Not right the first time? We re-fit for free within 7 days.</span>
            {shop.address && <span className={styles.ctaAddress}>{shop.address}</span>}
          </div>
        </motion.section>
      )}

      <footer className={styles.footer}>
        <p>
          Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
        </p>
      </footer>
    </div>
  );
}
