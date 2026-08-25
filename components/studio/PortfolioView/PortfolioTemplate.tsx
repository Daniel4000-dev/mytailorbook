'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import type { PublicPortfolio, PortfolioOutfit } from '@/app/public-actions';
import styles from './PortfolioTemplate.module.css';

/** Mirrors the real order stages a customer sees on their own tracking page
 *  (see app/track/[orderId]/_components/TimelineStage.tsx) — same names,
 *  icons, and voice, so the promise made here is the product a buyer
 *  actually gets, not a separate marketing story. */
const PROCESS_STEPS = [
  { icon: 'assignment', title: 'Documented', text: 'Every measurement logged the day you order — nothing left to memory' },
  { icon: 'content_cut', title: 'Cutting', text: 'Patterns drafted, fabric cut to your exact numbers' },
  { icon: 'apparel', title: 'Sewing', text: 'Stitched seam by seam, checked as it goes' },
  { icon: 'inventory_2', title: 'Delivered', text: 'Pressed, packaged, and tracked live to your phone' },
];

/** Curated accent palette — a tailor picks one of these in Settings, never
 *  a raw hex. 'indigo' is the DB default, so a shop that's never touched
 *  this setting sees this exact look. */
const ACCENTS: Record<string, { accent: string; accentDark: string; accentLight: string }> = {
  indigo: { accent: '#4338CA', accentDark: '#312E81', accentLight: '#6366F1' },
  coral: { accent: '#E8532A', accentDark: '#B8401F', accentLight: '#FF8A5C' },
  emerald: { accent: '#0F9960', accentDark: '#0B7A4D', accentLight: '#3FBE8A' },
  amber: { accent: '#B8860B', accentDark: '#8F6A08', accentLight: '#D9A62E' },
  brass: { accent: '#9C7A3C', accentDark: '#6E5527', accentLight: '#C9A55C' },
  olive: { accent: '#6B7A3A', accentDark: '#4A5527', accentLight: '#8FA05C' },
  oxblood: { accent: '#7A2E2E', accentDark: '#541F1F', accentLight: '#A64444' },
  slate: { accent: '#3F4A5A', accentDark: '#2A323D', accentLight: '#5C6B80' },
  terracotta: { accent: '#B85C38', accentDark: '#8A4327', accentLight: '#D4835F' },
  sage: { accent: '#7C9070', accentDark: '#5A6B50', accentLight: '#9DB294' },
  umber: { accent: '#6E5240', accentDark: '#4A362A', accentLight: '#94725C' },
  plum: { accent: '#6B3F5C', accentDark: '#4A2B40', accentLight: '#8F5A7C' },
};

function monthOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

interface LightboxState {
  outfitIndex: number;
  photoIndex: number;
}

export default function PortfolioTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop, outfits, stats, testimonials } = portfolio;
  const palette = ACCENTS[shop.portfolioAccent] || ACCENTS.indigo;
  const reduceMotion = useReducedMotion();

  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [storyOutfit, setStoryOutfit] = useState<PortfolioOutfit | null>(null);
  const [shared, setShared] = useState(false);

  const heroPhoto = outfits[0]?.displayPhotos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const hasStory = Boolean(shop.tagline || shop.bio || shop.foundedYear);

  const lightboxPhoto = lightbox ? outfits[lightbox.outfitIndex]?.displayPhotos[lightbox.photoIndex] : null;
  const lightboxOutfit = lightbox ? outfits[lightbox.outfitIndex] : null;

  /* Lightbox keyboard nav — cycles through the open outfit's own photos */
  useEffect(() => {
    if (!lightbox || !lightboxOutfit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((s) => (s ? { ...s, photoIndex: Math.min(lightboxOutfit.displayPhotos.length - 1, s.photoIndex + 1) } : null));
      if (e.key === 'ArrowLeft') setLightbox((s) => (s ? { ...s, photoIndex: Math.max(0, s.photoIndex - 1) } : null));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, lightboxOutfit]);

  const presentAngles = useMemo(() => {
    if (!lightboxOutfit) return [];
    return lightboxOutfit.displayPhotos.map((p) => p.angle);
  }, [lightboxOutfit]);

  const handleShare = async () => {
    // Always the canonical production domain — this view can also render
    // inside the authenticated app (a different route) or a preview
    // deployment, where window.location.origin would leak an in-app path
    // or the wrong domain that a visitor couldn't open/wouldn't recognize.
    const url = `${APP_CONFIG.baseUrl}${ROUTES.studio(shop.slug)}`;
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

  const ctaCard = (
    <div className={styles.ctaRailCard}>
      <h3 className={styles.ctaRailTitle}>Start Your Order</h3>
      <p className={styles.ctaRailHint}>Share your vision and get measured — every order tracked live from cut to delivery.</p>
      {whatsappHref ? (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaRailBtn}>
          <WhatsappIcon size={20} /> Chat on WhatsApp
        </a>
      ) : (
        <p className={styles.ctaRailHint}>{shop.name} hasn&apos;t added a contact number yet.</p>
      )}
      <ul className={styles.ctaRailList}>
        <li>Doesn&apos;t match your measurements — free re-fit within 7 days</li>
        <li>Fabric shown is the fabric used, always</li>
        <li>Deposit only due once your order is logged in the system</li>
      </ul>
      {shop.address && <span className={styles.ctaRailAddress}>{shop.address}</span>}
      <button type="button" className={styles.ctaRailShare} onClick={handleShare}>
        <Symbol name={shared ? 'check' : 'ios_share'} size={16} />
        {shared ? 'Link Copied' : 'Share Portfolio'}
      </button>
    </div>
  );

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
      {/* 1. Hero — full width, above the two-column split */}
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
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`${styles.ctaPrimary} ${styles.heroMobileOnly}`}>
              <WhatsappIcon size={20} /> Chat on WhatsApp
            </a>
          )}
        </motion.div>
      </section>

      {/* Below the hero: single column on mobile, main+sticky-rail on desktop */}
      <div className={styles.layout}>
        <div className={styles.mainCol}>
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

          {/* 4. Gallery — one tile per published outfit, not one per photo.
              A brand-new shop with nothing published yet still gets a
              branded section here, not a silent gap in the page. */}
          {outfits.length === 0 ? (
            <motion.section className={styles.galleryEmpty} {...reveal()}>
              <Symbol name="checkroom" size={36} className={styles.galleryEmptyIcon} />
              <h2 className={styles.galleryEmptyTitle}>Work In Progress</h2>
              <p className={styles.galleryEmptyBody}>
                {shop.name} is still building their gallery here — finished pieces get added as orders are completed. Reach out below to be one of the first shown.
              </p>
            </motion.section>
          ) : (
            <section className={styles.gallerySection}>
              <motion.h2 className={styles.sectionTitle} {...reveal()}>Our Work</motion.h2>
              <div className={styles.bento}>
                {outfits.map((o, i) => (
                  <motion.div key={o.id} className={styles.outfitTile} {...reveal((i % 6) * 0.06)}>
                    <button
                      type="button"
                      className={styles.outfitTileBtn}
                      onClick={() => setLightbox({ outfitIndex: i, photoIndex: 0 })}
                      aria-label={`View ${o.title || 'outfit'}`}
                    >
                      <Image src={o.displayPhotos[0].url} alt="" fill sizes="(max-width: 768px) 50vw, 400px" className={styles.outfitTileImg} loading={i > 3 ? 'lazy' : undefined} />
                      {o.displayPhotos.length > 1 && (
                        <span className={styles.photoCountBadge}>
                          <Symbol name="photo_library" size={14} /> {o.displayPhotos.length}
                        </span>
                      )}
                      {o.title && <span className={styles.outfitTileCaption}>{o.title}</span>}
                    </button>
                    {o.storyModeEnabled && o.storyPhotos.length > 0 && (
                      <button type="button" className={styles.storyBtn} onClick={() => setStoryOutfit(o)}>
                        <Symbol name="auto_stories" size={15} /> The Story
                      </button>
                    )}
                  </motion.div>
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

          {/* 6. Real reviews — tied to completed, verified orders, not typed by the shop */}
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

          {!portfolio.isPremium && (
            <footer className={styles.footer}>
              <p>
                Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
              </p>
            </footer>
          )}
        </div>

        {/* Desktop-only sticky rail — hidden on mobile via CSS, replaced by the fixed bottom bar below */}
        <aside className={styles.ctaRail}>{ctaCard}</aside>
      </div>

      {/* Mobile-only persistent bottom bar — visible from load, not scroll-triggered */}
      {whatsappHref && (
        <div className={styles.mobileBar}>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.mobileBarBtn}>
            <WhatsappIcon size={20} /> Chat on WhatsApp
          </a>
        </div>
      )}

      {/* Photo lightbox — cycles the open outfit's display photos */}
      {lightbox && lightboxPhoto && lightboxOutfit && (
        <div className={styles.lightbox} role="dialog" aria-label="Photo viewer" onClick={() => setLightbox(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightbox(null)}>
            <Symbol name="close" size={24} />
          </button>
          <Image
            src={lightboxPhoto.url}
            alt={lightboxOutfit.title || ''}
            width={1200}
            height={900}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'auto', height: 'auto' }}
          />
          <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
            {lightboxOutfit.title || 'Outfit'}
            {lightboxPhoto.angle ? ` · ${lightboxPhoto.angle}` : ''}
            {presentAngles.length > 1 ? ` (${lightbox.photoIndex + 1}/${lightboxOutfit.displayPhotos.length})` : ''}
          </p>
          {lightbox.photoIndex > 0 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, photoIndex: lightbox.photoIndex - 1 }); }}
            >
              <Symbol name="chevron_left" size={28} />
            </button>
          )}
          {lightbox.photoIndex < lightboxOutfit.displayPhotos.length - 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, photoIndex: lightbox.photoIndex + 1 }); }}
            >
              <Symbol name="chevron_right" size={28} />
            </button>
          )}
        </div>
      )}

      {/* Story viewer — a visitor has to deliberately open this; it's
          never shown alongside the main gallery by default. */}
      {storyOutfit && (
        <div className={styles.storyOverlay} role="dialog" aria-label="Creation story" onClick={() => setStoryOutfit(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setStoryOutfit(null)}>
            <Symbol name="close" size={24} />
          </button>
          <div className={styles.storyPanel} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.storyPanelTitle}>{storyOutfit.title || 'The Story'}</h3>
            {storyOutfit.storyCaption && <p className={styles.storyPanelCaption}>{storyOutfit.storyCaption}</p>}
            <div className={styles.storySequence}>
              {storyOutfit.storyPhotos.map((url, i) => (
                <div key={i} className={styles.storyFrame}>
                  <Image src={url} alt="" fill sizes="(max-width: 768px) 90vw, 480px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
