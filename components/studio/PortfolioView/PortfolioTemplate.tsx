'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getWhatsAppLink, formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import type { PublicPortfolio, PortfolioOutfit } from '@/app/public-actions';
import { DEFAULT_MOCK_PORTFOLIO } from '@/lib/mockPortfolio';
import styles from './PortfolioTemplate.module.css';

const EDITORIAL_EXPERIENCE = [
  {
    num: '01',
    title: 'The Consultation',
    text: 'An intimate conversation about your vision, lifestyle, and how you want to feel. We measure not just for fit, but for character.',
  },
  {
    num: '02',
    title: 'The Cut',
    text: 'Patterns drafted from scratch. Fabric cut with precision. Every line engineered to drape flawlessly over your unique frame.',
  },
  {
    num: '03',
    title: 'The Commission',
    text: 'Hand-finished, pressed, and presented. A garment built to endure, delivered with uncompromising quality.',
  },
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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.starRow} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Symbol
          key={star}
          name="star"
          size={16}
          className={star <= rating ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </div>
  );
}

export default function PortfolioTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const realShop = portfolio.shop;
  const shop = {
    ...realShop,
    phone: realShop.phone || '+2348030000000',
    bio:
      realShop.bio ||
      DEFAULT_MOCK_PORTFOLIO.shop.bio,
    tagline: realShop.tagline || DEFAULT_MOCK_PORTFOLIO.shop.tagline,
  };

  const outfits = portfolio.outfits ?? DEFAULT_MOCK_PORTFOLIO.outfits;
  const stats = portfolio.stats ?? DEFAULT_MOCK_PORTFOLIO.stats;
  const testimonials =
    portfolio.testimonials && portfolio.testimonials.length > 0
      ? portfolio.testimonials
      : DEFAULT_MOCK_PORTFOLIO.testimonials;
  const ratingSummary = portfolio.ratingSummary ?? DEFAULT_MOCK_PORTFOLIO.ratingSummary;

  const palette = ACCENTS[shop.portfolioAccent] || ACCENTS.indigo;
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], ['0%', '40%']);

  const [storyOutfit, setStoryOutfit] = useState<PortfolioOutfit | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(outfits.map((o) => o.category).filter(Boolean) as string[]))],
    [outfits]
  );

  const filteredOutfits = useMemo(() => {
    if (activeCategory === 'All') return outfits;
    return outfits.filter((o) => o.category === activeCategory);
  }, [activeCategory, outfits]);

  const heroPhoto = outfits[0]?.displayPhotos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const hasStory = Boolean(shop.tagline || shop.bio || shop.foundedYear);

  const currentIndex = storyOutfit ? filteredOutfits.findIndex((o) => o.id === storyOutfit.id) : -1;
  const hasNext = currentIndex !== -1 && currentIndex < filteredOutfits.length - 1;
  const hasPrev = currentIndex > 0;

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
        initial: 'hidden',
        whileInView: 'shown',
        viewport: { once: true, margin: '-60px' },
        variants: fadeUp,
        transition: { delay },
      };

  useEffect(() => {
    if (storyOutfit) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setStoryOutfit(null);
        if (e.key === 'ArrowRight' && hasNext) setStoryOutfit(filteredOutfits[currentIndex + 1]);
        if (e.key === 'ArrowLeft' && hasPrev) setStoryOutfit(filteredOutfits[currentIndex - 1]);
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [storyOutfit, hasNext, hasPrev, currentIndex, filteredOutfits]);

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
      {/* 1. Hero — Full screen editorial presentation */}
      <section className={styles.hero}>
        {heroPhoto ? (
          <motion.div
            className={styles.heroPhoto}
            style={{ backgroundImage: `url(${heroPhoto.url})`, y: heroY }}
            animate={reduceMotion ? undefined : { scale: [1, 1.05] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }
            }
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
            {shop.logoUrl ? (
              <Image src={shop.logoUrl} alt="" width={88} height={88} />
            ) : (
              shop.name[0]?.toUpperCase()
            )}
          </div>
          <span className={styles.eyebrow}>Bespoke Tailoring{city ? ` · ${city}` : ''}</span>
          <h1 className={styles.heroName}>{shop.name}</h1>
          {shop.tagline && <p className={styles.heroTagline}>{shop.tagline}</p>}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.ctaPrimary} ${styles.heroMobileOnly}`}
            >
              <WhatsappIcon size={20} /> Chat on WhatsApp
            </a>
          )}
        </motion.div>
      </section>

      {/* 2. Apple Liquid Glass Trust Bar */}
      <div className={styles.mainCol}>
        <motion.section className={styles.trustBar} {...reveal()}>
          <div className={styles.trustMetric}>
            <div className={styles.trustMetricIcon}>
              <Symbol name="checkroom" size={22} />
            </div>
            <div className={styles.trustMetricContent}>
              <span className={styles.trustMetricValue}>
                {stats.completed > 0 ? `${stats.completed}+` : '100+'}
              </span>
              <span className={styles.trustMetricLabel}>Garments Completed</span>
            </div>
          </div>
          <div className={styles.trustMetric}>
            <div className={styles.trustMetricIcon}>
              <Symbol name="verified" size={22} />
            </div>
            <div className={styles.trustMetricContent}>
              <span className={styles.trustMetricValue}>
                {stats.onTimePercent ? `${stats.onTimePercent}%` : '99%'}
              </span>
              <span className={styles.trustMetricLabel}>On-Time Completion</span>
            </div>
          </div>
          <div className={styles.trustMetric}>
            <div className={styles.trustMetricIcon}>
              <Symbol name="star" size={22} />
            </div>
            <div className={styles.trustMetricContent}>
              <span className={styles.trustMetricValue}>
                {ratingSummary ? `${ratingSummary.average.toFixed(1)} / 5.0` : '4.9 / 5.0'}
              </span>
              <span className={styles.trustMetricLabel}>
                Client Satisfaction {ratingSummary?.count ? `(${ratingSummary.count})` : ''}
              </span>
            </div>
          </div>
          <div className={styles.trustMetric}>
            <div className={styles.trustMetricIcon}>
              <Symbol name="straighten" size={22} />
            </div>
            <div className={styles.trustMetricContent}>
              <span className={styles.trustMetricValue}>1-on-1</span>
              <span className={styles.trustMetricLabel}>Bespoke Pattern Drafting</span>
            </div>
          </div>
        </motion.section>

        {/* 3. Atelier Philosophy / Story */}
        {hasStory && (
          <motion.section className={styles.storySection} {...reveal(0.05)}>
            <span className={styles.storyEyebrow}>Our Philosophy</span>
            <p className={styles.storyBody}>{shop.bio}</p>
          </motion.section>
        )}

        {/* 4. Lookbook Gallery (Pinterest Masonry) */}
        {outfits.length === 0 ? (
          <motion.section className={styles.galleryEmpty} {...reveal()}>
            <Symbol name="checkroom" size={36} className={styles.galleryEmptyIcon} />
            <h2 className={styles.galleryEmptyTitle}>Work In Progress</h2>
            <p className={styles.galleryEmptyBody}>
              {shop.name} is still curating this bespoke lookbook — finished commissions will appear
              here as they are completed.
            </p>
          </motion.section>
        ) : (
          <section className={styles.gallerySection}>
            <div className={styles.galleryHeader}>
              <motion.div className={styles.categoryFilters} {...reveal(0.1)}>
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.categoryFilterBtn} ${activeCategory === cat ? styles.categoryFilterBtnActive : ''
                      }`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </motion.div>
            </div>
            <div className={styles.lookbookGrid}>
              {filteredOutfits.map((o, i) => (
                <motion.div key={o.id} className={styles.outfitTile} {...reveal((i % 4) * 0.08)}>
                  <motion.button
                    type="button"
                    className={styles.outfitTileBtn}
                    onClick={() => setStoryOutfit(o)}
                    aria-label={`View bespoke commission: ${o.title || 'outfit'}`}
                    layoutId={`outfit-container-${o.id}`}
                  >
                    <motion.div
                      layoutId={`outfit-image-${o.id}-0`}
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <Image
                          src={o.displayPhotos[0]?.url || '/images/blog/agbada-ceremonial-amurode.jpg'}
                          alt={o.title || ''}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className={styles.outfitTileImg}
                          loading={i > 3 ? 'lazy' : undefined}
                        />
                      </div>
                    </motion.div>
                    {(o.storyModeEnabled || (o.storyPhotos && o.storyPhotos.length > 0)) && (
                      <span className={styles.storyBadge}>
                        <Symbol name="auto_awesome" size={12} />
                        <span>Commission Story</span>
                      </span>
                    )}
                  </motion.button>
                  <div className={styles.outfitTileMeta}>
                    <div>
                      {o.category && <span className={styles.outfitTileCategory}>{o.category}</span>}
                      {o.title && <h3 className={styles.outfitTileTitle}>{o.title}</h3>}
                    </div>
                    {o.startingPrice && (
                      <span className={styles.outfitTilePrice}>
                        From {formatCurrency(o.startingPrice, 'NGN')}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* 5. The 3-Step Bespoke Journey (Editorial Experience) */}
        <motion.section className={styles.experienceSection} {...reveal(0.1)}>
          <div className={styles.experienceGrid}>
            {EDITORIAL_EXPERIENCE.map((step) => (
              <div key={step.num} className={styles.experienceStep}>
                <span className={styles.experienceNum}>{step.num}</span>
                <h3 className={styles.experienceTitle}>{step.title}</h3>
                <p className={styles.experienceText}>{step.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 6. Verified Client Reviews */}
        {testimonials.length > 0 && (
          <motion.section className={styles.reviewsSection} {...reveal(0.1)}>
            <h2 className={styles.sectionTitle}>Client Experiences</h2>
            <p className={styles.reviewsSub}>
              Reflections from esteemed clients on completed commissions.
            </p>
            <div className={styles.reviewsRow}>
              {testimonials.map((t, i) => (
                <div key={`${t.customerName}-${i}`} className={styles.reviewCard}>
                  <StarRating rating={t.rating} />
                  {t.comment && <p className={styles.reviewQuote}>&ldquo;{t.comment}&rdquo;</p>}
                  <span className={styles.reviewAttrib}>{t.customerName}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 7. Direct Bespoke Commission / WhatsApp consultation */}
        <motion.section className={styles.commissionSection} {...reveal(0.1)}>
          <div className={styles.commissionCard}>
            <h2 className={styles.commissionTitle}>Commission Your Bespoke Piece</h2>
            <p className={styles.commissionSubtitle}>
              Every bespoke garment begins with a personal conversation. Reach out directly to
              discuss fabrics, timings, and measurements.
            </p>
            {whatsappHref && (
              <div className={styles.commissionDirect}>
                <a
                  href={`${whatsappHref}&text=${encodeURIComponent(
                    `Hello ${shop.name}, I would like to inquire about commissioning a bespoke garment.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ctaPrimary}
                >
                  <WhatsappIcon size={20} /> Start Commission on WhatsApp
                </a>
              </div>
            )}
          </div>
        </motion.section>

        {!portfolio.isPremium && (
          <footer className={styles.footer}>
            <p>
              Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
            </p>
          </footer>
        )}
      </div>

      {/* Floating Action Button (WhatsApp) */}
      {whatsappHref && (
        <FixedBottomPortal>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappFab}
            aria-label="Chat on WhatsApp"
            style={{
              ['--m-accent' as string]: palette.accent,
              ['--m-accent-fg' as string]: '#ffffff',
            }}
          >
            <WhatsappIcon size={28} />
          </a>
        </FixedBottomPortal>
      )}

      {/* Story viewer — Bespoke Case Study Modal */}
      {storyOutfit && (
        <div
          className={styles.storyOverlay}
          role="dialog"
          aria-label="Creation story"
          onClick={() => setStoryOutfit(null)}
        >
          <button
            type="button"
            className={styles.storyClose}
            aria-label="Close"
            onClick={() => setStoryOutfit(null)}
          >
            <Symbol name="close" size={28} />
          </button>

          <div className={styles.caseStudyContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.caseStudyLeft}>
              <motion.div
                layoutId={`outfit-image-${storyOutfit.id}-0`}
                className={styles.caseStudyHero}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image
                    src={
                      storyOutfit.displayPhotos[0]?.url ||
                      '/images/blog/agbada-ceremonial-amurode.jpg'
                    }
                    alt={storyOutfit.title || 'Bespoke garment detail'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>

                {hasPrev && (
                  <button
                    type="button"
                    className={`${styles.galleryNavBtn} ${styles.galleryNavPrev}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryOutfit(filteredOutfits[currentIndex - 1]);
                    }}
                    aria-label="Previous Outfit"
                  >
                    <Symbol name="chevron_left" size={24} />
                  </button>
                )}
                {hasNext && (
                  <button
                    type="button"
                    className={`${styles.galleryNavBtn} ${styles.galleryNavNext}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryOutfit(filteredOutfits[currentIndex + 1]);
                    }}
                    aria-label="Next Outfit"
                  >
                    <Symbol name="chevron_right" size={24} />
                  </button>
                )}
              </motion.div>
            </div>

            <div className={styles.caseStudyRight}>
              <div
                className={`${styles.caseStudyContent} ${(!storyOutfit.storyPhotos || storyOutfit.storyPhotos.length === 0) &&
                    !storyOutfit.storyCaption
                    ? styles.caseStudyContentEmpty
                    : ''
                  }`}
              >
                <span className={styles.caseStudyShopName}>{shop.name}</span>
                <h3 className={styles.caseStudyTitle}>{storyOutfit.title || 'Bespoke Commission'}</h3>

                {storyOutfit.materials && (
                  <div className={styles.caseStudyMaterials}>
                    <span className={styles.caseStudyMetaLabel}>Fabric & Materials</span>
                    <p className={styles.caseStudyMetaValue}>{storyOutfit.materials}</p>
                  </div>
                )}

                {storyOutfit.startingPrice && (
                  <div className={styles.caseStudyMaterials}>
                    <span className={styles.caseStudyMetaLabel}>Starting Commission</span>
                    <p className={styles.caseStudyMetaValue}>
                      {formatCurrency(storyOutfit.startingPrice, 'NGN')}
                    </p>
                  </div>
                )}

                {storyOutfit.storyCaption && (
                  <p className={styles.caseStudyNarrative}>{storyOutfit.storyCaption}</p>
                )}

                {whatsappHref && (
                  <a
                    href={`${whatsappHref}&text=${encodeURIComponent(
                      `Hello ${shop.name}, I'm interested in commissioning something similar to '${storyOutfit.title}'.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.caseStudyCta}
                  >
                    <WhatsappIcon size={18} /> Inquire about this piece
                  </a>
                )}

                {storyOutfit.storyPhotos && storyOutfit.storyPhotos.length > 0 && (
                  <div className={styles.caseStudyProcess}>
                    {storyOutfit.storyPhotos.map((url: string, i: number) => (
                      <div key={i} className={styles.caseStudyStep}>
                        <img
                          src={url}
                          alt={`Making process ${i + 1}`}
                          loading="lazy"
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {whatsappHref &&
                  ((storyOutfit.storyPhotos && storyOutfit.storyPhotos.length > 0) ||
                    storyOutfit.storyCaption) && (
                    <a
                      href={`${whatsappHref}&text=${encodeURIComponent(
                        `Hello ${shop.name}, I'm interested in commissioning something similar to '${storyOutfit.title}'.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.caseStudyCta} ${styles.caseStudyCtaBottom}`}
                    >
                      <WhatsappIcon size={18} /> Inquire about this piece
                    </a>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}