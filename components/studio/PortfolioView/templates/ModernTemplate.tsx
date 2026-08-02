'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa6';
import Symbol from '@/components/ui/Symbol/Symbol';
import { GARMENT_STYLES } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { PublicPortfolio } from '@/app/public-actions';
import styles from './ModernTemplate.module.css';

const PROCESS_STEPS = [
  { icon: 'straighten', title: 'Measured', text: 'Taken in person, kept on file' },
  { icon: 'content_cut', title: 'Fabric Cut', text: 'Cut to your exact numbers' },
  { icon: 'apparel', title: 'Sewn with Care', text: 'Finished by hand, checked twice' },
  { icon: 'radar', title: 'Track it Live', text: 'Follow every stage from your phone' },
];

/** Curated accent palette — a tailor picks one of these in Settings, never
 *  a raw hex. 'indigo' matches this template's original, unchanged look
 *  (and is the column's DB default), so existing shops see no visual
 *  change until they actively pick something else. */
const ACCENTS: Record<string, { accent: string; accentDark: string; accentLight: string }> = {
  indigo: { accent: '#4338CA', accentDark: '#312E81', accentLight: '#6366F1' },
  coral: { accent: '#E8532A', accentDark: '#B8401F', accentLight: '#FF8A5C' },
  emerald: { accent: '#0F9960', accentDark: '#0B7A4D', accentLight: '#3FBE8A' },
  amber: { accent: '#B8860B', accentDark: '#8F6A08', accentLight: '#D9A62E' },
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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ModernTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop, photos, stats, testimonials } = portfolio;
  const palette = ACCENTS[shop.portfolioAccent] || ACCENTS.indigo;
  const reduceMotion = useReducedMotion();

  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const [filter, setFilter] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shared, setShared] = useState(false);

  const heroPhoto = photos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const hasStory = Boolean(shop.tagline || shop.bio || shop.foundedYear);

  const presentStyles = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => {
      const s = styleOf(p.garment);
      if (s) set.add(s);
    });
    return [...set];
  }, [photos]);

  const filteredPhotos = useMemo(
    () => (filter === 'All' ? photos : photos.filter((p) => styleOf(p.garment) === filter)),
    [photos, filter]
  );

  /* Sticky mini header past the hero */
  useEffect(() => {
    const onScroll = () => setShowMiniHeader(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Lightbox keyboard nav */
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? null : Math.min(filteredPhotos.length - 1, i + 1)));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filteredPhotos.length]);

  const handleShare = async () => {
    // Always the canonical production domain — this view can also render
    // inside the authenticated app (a different route) or a preview
    // deployment, where window.location.origin would leak an in-app path
    // or the wrong domain that a visitor couldn't open/wouldn't recognize.
    const url = `${APP_CONFIG.baseUrl}/studio/${shop.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${shop.name} — Bespoke Tailoring`, url });
        return;
      }
    } catch {
      /* user dismissed the share sheet */
      return;
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : { initial: 'hidden', whileInView: 'shown', viewport: { once: true, margin: '-60px' }, variants: fadeUp, transition: { delay } };

  return (
    <div
      className={styles.page}
      data-accent={shop.portfolioAccent}
      style={{
        ['--m-accent' as string]: palette.accent,
        ['--m-accent-dark' as string]: palette.accentDark,
        ['--m-accent-light' as string]: palette.accentLight,
      }}
    >
      {/* Sticky mini header, revealed past the hero */}
      <header className={`${styles.miniHeader} ${showMiniHeader ? styles.miniHeaderShown : ''}`}>
        <span className={styles.miniName}>{shop.name}</span>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.miniCta}>
            <FaWhatsapp size={18} /> WhatsApp
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
            transition={reduceMotion ? undefined : { duration: 24, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />
        <motion.div
          className={styles.heroContent}
          initial={reduceMotion ? undefined : { opacity: 0, y: 26 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.avatar}>
            {shop.logoUrl ? <Image src={shop.logoUrl} alt="" width={88} height={88} /> : shop.name[0]?.toUpperCase()}
          </div>
          <span className={styles.eyebrow}>Bespoke Tailoring{city ? ` · ${city}` : ''}</span>
          <h1 className={styles.heroName}>{shop.name}</h1>
          {shop.tagline && <p className={styles.heroTagline}>{shop.tagline}</p>}
          <div className={styles.heroCtas}>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaPrimary}>
                <FaWhatsapp size={20} /> Chat on WhatsApp
              </a>
            )}
            <button type="button" className={styles.ctaGlass} onClick={handleShare}>
              <Symbol name={shared ? 'check' : 'ios_share'} size={20} />
              {shared ? 'Link Copied' : 'Share Portfolio'}
            </button>
          </div>
        </motion.div>
      </section>

      {/* 2. Our Craft — story block, omitted entirely if nothing set */}
      {hasStory && (
        <motion.section className={styles.storySection} {...reveal()}>
          {shop.foundedYear && <span className={styles.storyEyebrow}>Founded {shop.foundedYear}</span>}
          {shop.bio && <p className={styles.storyBody}>{shop.bio}</p>}
        </motion.section>
      )}

      {/* 3. Proof strip */}
      {stats.completed > 0 && (
        <motion.section className={styles.proofStrip} {...reveal()}>
          <div className={styles.proofItem}>
            <span className={styles.proofNum}>
              {stats.completed}
              <em>+</em>
            </span>
            <span className={styles.proofLabel}>Finished</span>
            {shop.foundedYear && <span className={styles.proofSub}>since {shop.foundedYear}</span>}
          </div>
          {stats.onTimePercent !== null && (
            <div className={styles.proofItem}>
              <span className={styles.proofNum}>
                {stats.onTimePercent}
                <em>%</em>
              </span>
              <span className={styles.proofLabel}>On-time</span>
              <span className={styles.proofSub}>of completed orders</span>
            </div>
          )}
          {stats.stylesCount > 0 && (
            <div className={styles.proofItem}>
              <span className={styles.proofNum}>{stats.stylesCount}</span>
              <span className={styles.proofLabel}>Styles</span>
            </div>
          )}
        </motion.section>
      )}

      {/* 4. Gallery */}
      {photos.length > 0 && (
        <section className={styles.gallerySection}>
          <motion.h2 className={styles.sectionTitle} {...reveal()}>Recent Work</motion.h2>
          {presentStyles.length > 1 && (
            <div className={styles.filterRow}>
              {['All', ...presentStyles].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.filterPill} ${filter === s ? styles.filterPillActive : ''}`}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className={styles.bento}>
            {filteredPhotos.map((p, i) => (
              <motion.button
                key={`${p.url}-${i}`}
                type="button"
                className={`${styles.bentoItem} ${i % 5 === 0 ? styles.bentoLarge : ''}`}
                onClick={() => setLightboxIndex(i)}
                aria-label={`View ${p.garment}`}
                {...reveal((i % 6) * 0.06)}
              >
                <Image src={p.url} alt={p.garment} fill sizes="(max-width: 768px) 50vw, 400px" loading={i > 3 ? 'lazy' : undefined} />
                <span className={styles.bentoCaption}>
                  <b>{p.caption || styleOf(p.garment) || p.garment}</b>
                  <small>{monthOf(p.takenAt)}</small>
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* 5. Process strip */}
      <section className={styles.processSection}>
        <motion.h2 className={styles.sectionTitle} {...reveal()}>How Your Order Will Go</motion.h2>
        <div className={styles.processGrid}>
          {PROCESS_STEPS.map((step, i) => (
            <motion.div key={step.title} className={styles.processStep} {...reveal(i * 0.09)}>
              <span className={styles.processIcon} style={{ background: `color-mix(in srgb, var(--m-accent) ${8 + i * 6}%, transparent)` }}>
                <Symbol name={step.icon} size={28} fill={i === PROCESS_STEPS.length - 1} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. Specialties */}
      {presentStyles.length > 0 && (
        <motion.section className={styles.chipsSection} {...reveal()}>
          {presentStyles.map((s) => (
            <span key={s} className={styles.specialtyChip}>{s}</span>
          ))}
        </motion.section>
      )}

      {/* 7. Real reviews — tied to completed, verified orders, not typed by the shop */}
      {testimonials.length > 0 && (
        <section className={styles.reviewsSection}>
          <motion.h2 className={styles.sectionTitle} {...reveal()}>Real Reviews</motion.h2>
          <p className={styles.reviewsSub}>Tied to completed, verified orders — not typed by us.</p>
          <div className={styles.reviewsRow}>
            {testimonials.map((t, i) => (
              <div key={i} className={styles.reviewCard}>
                <span className={styles.reviewStars}>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
                {t.comment && <p className={styles.reviewQuote}>&ldquo;{t.comment}&rdquo;</p>}
                <span className={styles.reviewAttrib}>{t.customerName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Final CTA — only when there's actually a way to act on it */}
      {whatsappHref && (
        <section className={styles.ctaSection}>
          <motion.div className={styles.ctaCard} {...reveal()}>
            <h2>Ready to sew something?</h2>
            <p>Send a reference photo{city ? ` or visit us in ${city}` : ''} — every order is measured to you and tracked live.</p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaCardBtn}>
              <FaWhatsapp size={20} /> Start a Conversation
            </a>
            <ul className={styles.guaranteeList}>
              <li>Doesn&apos;t match your measurements — free re-fit within 7 days</li>
              <li>Fabric shown is the fabric used, always</li>
              <li>Deposit only due once your order is logged in the system</li>
            </ul>
            {shop.address && <span className={styles.ctaAddress}>{shop.address}</span>}
          </motion.div>
        </section>
      )}

      {!portfolio.isPremium && (
        <footer className={styles.footer}>
          <p>
            Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
          </p>
        </footer>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className={styles.lightbox} role="dialog" aria-label="Photo viewer" onClick={() => setLightboxIndex(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightboxIndex(null)}>
            <Symbol name="close" size={24} />
          </button>
          <Image
            src={filteredPhotos[lightboxIndex].url}
            alt={filteredPhotos[lightboxIndex].garment}
            width={1200}
            height={900}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'auto', height: 'auto' }}
          />
          <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
            {filteredPhotos[lightboxIndex].caption || filteredPhotos[lightboxIndex].garment} · {monthOf(filteredPhotos[lightboxIndex].takenAt)}
          </p>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <Symbol name="chevron_left" size={28} />
            </button>
          )}
          {lightboxIndex < filteredPhotos.length - 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <Symbol name="chevron_right" size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
