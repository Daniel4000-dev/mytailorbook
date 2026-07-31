'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa6';
import Symbol from '@/components/ui/Symbol/Symbol';
import { GARMENT_STYLES } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { PublicPortfolio } from '@/app/public-actions';
import styles from './EditorialTemplate.module.css';

/** Curated accent palette — a tailor picks one of these in Settings, never
 *  a raw hex, so the page can't land on an unreadable combination. */
const ACCENTS: Record<string, { accent: string; accentDark: string; scrim: string }> = {
  brass: { accent: '#8B6F47', accentDark: '#6E5738', scrim: 'rgba(15,12,9,.66)' },
  olive: { accent: '#6B7B5E', accentDark: '#54614A', scrim: 'rgba(12,15,9,.66)' },
  oxblood: { accent: '#8A4A4A', accentDark: '#6E3B3B', scrim: 'rgba(15,10,10,.66)' },
  slate: { accent: '#4A5C6B', accentDark: '#3B4A56', scrim: 'rgba(9,12,15,.66)' },
  indigo: { accent: '#4338CA', accentDark: '#312E81', scrim: 'rgba(10,9,15,.66)' },
};

function styleOf(garment: string): string | null {
  const text = garment.toLowerCase();
  for (const s of GARMENT_STYLES) {
    if (s.keywords.some((k) => text.includes(k))) return s.name;
  }
  return null;
}

function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
}

const fadeRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] } },
};

export default function EditorialTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop, photos, stats, testimonials } = portfolio;
  const palette = ACCENTS[shop.portfolioAccent] || ACCENTS.brass;
  const reduceMotion = useReducedMotion();

  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shared, setShared] = useState(false);

  const heroPhoto = photos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const hasStory = Boolean(shop.bio || shop.foundedYear);

  useEffect(() => {
    const onScroll = () => setShowMiniHeader(window.scrollY > 360);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? null : Math.min(photos.length - 1, i + 1)));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, photos.length]);

  const handleShare = async () => {
    // Always the canonical public URL — this view can also render inside
    // the authenticated app (a different route), where window.location.href
    // would leak an in-app path a visitor couldn't open.
    const url = `${window.location.origin}/studio/${shop.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${shop.name} — Bespoke Tailoring`, url });
        return;
      }
    } catch {
      return;
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: 'hidden',
          whileInView: 'shown',
          viewport: { once: true, margin: '-80px' },
          variants: fadeRise,
          transition: { delay },
        };

  return (
    <div
      className={styles.page}
      data-accent={shop.portfolioAccent}
      style={{ ['--e-accent' as string]: palette.accent, ['--e-accent-dark' as string]: palette.accentDark, ['--e-scrim' as string]: palette.scrim }}
    >
      <header className={`${styles.miniHeader} ${showMiniHeader ? styles.miniHeaderShown : ''}`}>
        <span className={styles.miniName}>{shop.name}</span>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.miniCta}>
            <FaWhatsapp size={16} /> WhatsApp
          </a>
        )}
      </header>

      {/* 1. Hero */}
      <section className={styles.hero}>
        {heroPhoto ? (
          <motion.div
            className={styles.heroPhoto}
            style={{ backgroundImage: `url(${heroPhoto.url})` }}
            animate={reduceMotion ? undefined : { scale: [1, 1.08] }}
            transition={reduceMotion ? undefined : { duration: 26, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />
        <motion.div
          className={styles.heroContent}
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.9, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
        >
          <span className={styles.eyebrow}>Bespoke Tailoring{city ? ` · ${city}` : ''}</span>
          <h1 className={styles.heroName}>{shop.name}</h1>
          {shop.tagline && <p className={styles.tagline}>{shop.tagline}</p>}
        </motion.div>
      </section>

      {/* 2. Our Craft — story block, omitted entirely if nothing set */}
      {hasStory && (
        <motion.section className={styles.section} {...reveal()}>
          <p className={styles.storyLabel}>Our Craft</p>
          <p className={styles.storyBody}>
            {shop.foundedYear && <strong>Founded in {shop.foundedYear}</strong>}
            {shop.foundedYear && shop.bio ? ' — ' : ''}
            {shop.bio}
          </p>
        </motion.section>
      )}

      {/* 3. Proof stats */}
      {stats.completed > 0 && (
        <motion.div className={styles.stats} {...reveal()}>
          <div>
            <span className={styles.statNum}>{stats.completed}<em>+</em></span>
            <span className={styles.statLabel}>Garments Finished</span>
          </div>
          {stats.onTimePercent !== null && (
            <div>
              <span className={styles.statNum}>{stats.onTimePercent}<em>%</em></span>
              <span className={styles.statLabel}>Delivered On Time</span>
            </div>
          )}
          {stats.stylesCount > 0 && (
            <div>
              <span className={styles.statNum}>{stats.stylesCount}</span>
              <span className={styles.statLabel}>Signature Styles</span>
            </div>
          )}
        </motion.div>
      )}

      {/* 4. Gallery */}
      {photos.length > 0 && (
        <section className={styles.gallery}>
          {photos.map((p, i) => (
            <motion.button
              key={`${p.url}-${i}`}
              type="button"
              className={styles.photo}
              onClick={() => setLightboxIndex(i)}
              aria-label={`View ${p.garment}`}
              {...reveal((i % 4) * 0.08)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.garment} loading={i > 2 ? 'lazy' : undefined} />
              <span className={styles.caption}>
                <b>{p.caption || styleOf(p.garment) || p.garment}</b>
                <small>{p.caption ? `${styleOf(p.garment) || p.garment} · ` : ''}{monthOf(p.takenAt)}</small>
              </span>
            </motion.button>
          ))}
        </section>
      )}

      {/* 5. Testimonials — the trust-closer, never a fake/empty section */}
      {testimonials.length > 0 && (
        <motion.section className={styles.section} {...reveal()}>
          <p className={styles.storyLabel}>In Their Words</p>
          <p className={styles.testimonialsSub}>Every review is tied to a completed, verified order.</p>
          {testimonials.map((t, i) => (
            <div key={i} className={i > 0 ? styles.testimonialDivider : undefined}>
              <span className={styles.stars} aria-label={`${t.rating} out of 5 stars`}>
                {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
              </span>
              {t.comment && <p className={styles.quote}>&ldquo;{t.comment}&rdquo;</p>}
              <span className={styles.attrib}><b>{t.customerName}</b></span>
            </div>
          ))}
        </motion.section>
      )}

      {/* 6. Closing CTA */}
      <motion.section className={styles.cta} {...reveal()}>
        <h2>Begin your piece</h2>
        <p>
          Send a reference photo{city ? ` or visit us in ${city}` : ''} — every order is measured to you and tracked live.
        </p>
        <div className={styles.ctaActions}>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaBtn}>
              <FaWhatsapp size={18} /> Start a Conversation
            </a>
          )}
          <button type="button" className={styles.shareBtn} onClick={handleShare}>
            <Symbol name={shared ? 'check' : 'ios_share'} size={18} />
            {shared ? 'Link Copied' : 'Share Portfolio'}
          </button>
        </div>
        <p className={styles.guarantee}>Not right the first time? We re-fit free within 7 days.</p>
      </motion.section>

      {!portfolio.isPremium && (
        <footer className={styles.footer}>
          <p>Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span></p>
        </footer>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className={styles.lightbox} role="dialog" aria-label="Photo viewer" onClick={() => setLightboxIndex(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightboxIndex(null)}>
            <Symbol name="close" size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[lightboxIndex].url} alt={photos[lightboxIndex].garment} onClick={(e) => e.stopPropagation()} />
          <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
            {photos[lightboxIndex].caption || photos[lightboxIndex].garment} · {monthOf(photos[lightboxIndex].takenAt)}
          </p>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <Symbol name="chevron_left" size={26} />
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <Symbol name="chevron_right" size={26} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
