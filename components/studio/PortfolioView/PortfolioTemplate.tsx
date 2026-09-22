'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import Symbol from '@/components/ui/Symbol/Symbol';
import { getWhatsAppLink, formatCurrency } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import type { PublicPortfolio, PortfolioOutfit } from '@/app/public-actions';
import styles from './PortfolioTemplate.module.css';

const EDITORIAL_EXPERIENCE = [
  { num: '01', title: 'The Consultation', text: 'An intimate conversation about your vision, lifestyle, and how you want to feel. We measure not just for fit, but for character.' },
  { num: '02', title: 'The Cut', text: 'Patterns drafted from scratch. Fabric cut with precision. Every line engineered to drape flawlessly over your unique frame.' },
  { num: '03', title: 'The Commission', text: 'Hand-finished, pressed, and presented. A garment built to endure, delivered with uncompromising quality.' },
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

const MOCK_OUTFITS = [
  {
    id: 'mock-1',
    title: 'The Modern Agbada',
    category: 'Agbada',
    startingPrice: 350,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/mock_agbada_1789589437748.jpg', angle: 'front' as any }],
    storyModeEnabled: true,
    storyCaption: 'Crafted for a groom who wanted a balance between deep traditional roots and a razor-sharp modern silhouette. We spent three days perfecting the hand-embroidery on the chest, ensuring the heavy thread sat perfectly flat against the raw silk.',
    storyPhotos: [
      '/images/mock/mock_process_chalk_1789591170047.jpg',
      '/images/mock/mock_process_sewing_1789591187626.jpg'
    ],
    materials: '100% Raw Silk & Gold Thread',
  },
  {
    id: 'mock-2',
    title: 'Executive Bespoke Suit',
    category: 'Suits',
    startingPrice: 500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/mock_suit_nigerian_1789589547408.jpg', angle: 'front' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  },
  {
    id: 'mock-3',
    title: 'Bespoke Lapel Detail',
    category: 'Detail',
    startingPrice: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/mock_detail_nigerian_1789589583459.jpg', angle: 'detail' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  }
];

export default function PortfolioTemplate({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop: realShop, stats, testimonials } = portfolio;
  
  // MOCK DATA INJECTION
  const shop = {
    ...realShop,
    phone: realShop.phone || '08000000000', // Ensure WhatsApp button always renders
    bio: realShop.bio || "Started in a single room in Surulere, we have spent the last decade mastering the art of bespoke tailoring. Every stitch is a testament to our dedication to the craft, and every garment is a narrative woven for the wearer."
  };
  const outfits = portfolio.outfits && portfolio.outfits.length > 0 ? portfolio.outfits : MOCK_OUTFITS;
  const mockFont = 'Playfair Display'; // Mock font selection
  
  const palette = ACCENTS[shop.portfolioAccent] || ACCENTS.indigo;
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], ['0%', '40%']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [storyOutfit, setStoryOutfit] = useState<any | null>(null);
  const [shared, setShared] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [leadForm, setLeadForm] = useState({ name: '', email: '', message: '', submitted: false });

  const categories = useMemo(() => ['All', ...Array.from(new Set(outfits.map(o => o.category).filter(Boolean) as string[]))], [outfits]);
  
  const filteredOutfits = useMemo(() => {
    if (activeCategory === 'All') return outfits;
    return outfits.filter(o => o.category === activeCategory);
  }, [activeCategory, outfits]);

  const heroPhoto = outfits[0]?.displayPhotos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;
  const hasStory = Boolean(shop.tagline || shop.bio || shop.foundedYear);

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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadForm(prev => ({ ...prev, submitted: true }));
    setTimeout(() => setLeadForm({ name: '', email: '', message: '', submitted: false }), 4000);
  };

  const currentIndex = storyOutfit ? filteredOutfits.findIndex(o => o.id === storyOutfit.id) : -1;
  const hasNext = currentIndex !== -1 && currentIndex < filteredOutfits.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    if (storyOutfit) {
      document.body.style.overflow = 'hidden';
      // Fallback for iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;

      const scrollY = window.scrollY;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setStoryOutfit(null);
        if (e.key === 'ArrowRight' && hasNext) setStoryOutfit(filteredOutfits[currentIndex + 1]);
        if (e.key === 'ArrowLeft' && hasPrev) setStoryOutfit(filteredOutfits[currentIndex - 1]);
      };
      window.addEventListener('keydown', handleKeyDown);
      
      const timer = setTimeout(() => {
        const closeBtn = document.querySelector(`.${styles.storyClose}`) as HTMLButtonElement;
        if (closeBtn) closeBtn.focus();
      }, 100);

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
        window.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [storyOutfit, hasNext, hasPrev, currentIndex, filteredOutfits]);

  return (
    <div
      className={styles.page}
      data-accent={shop.portfolioAccent}
      style={{
        ['--m-accent' as string]: palette.accent,
        ['--m-accent-dark' as string]: palette.accentDark,
        ['--m-accent-light' as string]: palette.accentLight,
        fontFamily: `"${mockFont}", ${shop.portfolioAccent === 'classic' ? 'serif' : 'sans-serif'}`
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');
      `}</style>
      
      {/* 1. Hero — Full screen editorial presentation */}
      <section className={styles.hero}>
        {heroPhoto ? (
          <motion.div
            className={styles.heroPhoto}
            style={{ backgroundImage: `url(${heroPhoto.url})`, y: heroY }}
            animate={reduceMotion ? undefined : { scale: [1, 1.05] }}
            transition={reduceMotion ? undefined : { duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
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

      {/* Below the hero: single flowing editorial column */}
      <div className={styles.mainCol}>

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
              <div className={styles.galleryHeader}>
                <motion.div className={styles.categoryFilters} {...reveal(0.1)}>
                  {categories.map((cat, idx) => (
                    <button 
                      key={idx}
                      className={`${styles.categoryFilterBtn} ${activeCategory === cat ? styles.categoryFilterBtnActive : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </motion.div>
              </div>
              <div className={styles.lookbookGrid}>
                {filteredOutfits.map((o, i) => (
                  <motion.div 
                    key={o.id} 
                    className={styles.outfitTile}
                    {...reveal((i % 4) * 0.08)}
                  >
                    <motion.button
                      type="button"
                      className={styles.outfitTileBtn}
                      onClick={() => setStoryOutfit(o)}
                      aria-label={`View ${o.title || 'outfit'}`}
                      layoutId={`outfit-container-${o.id}`}
                    >
                      <motion.div layoutId={`outfit-image-${o.id}-0`} style={{ position: 'absolute', inset: 0 }}>
                        <div style={{ position: 'absolute', inset: 0 }}>
                          <Image src={o.displayPhotos[0].url} alt="" fill sizes="(max-width: 768px) 50vw, 400px" className={styles.outfitTileImg} loading={i > 3 ? 'lazy' : undefined} />
                        </div>
                      </motion.div>
                      {o.storyModeEnabled && (
                        <span className={styles.storyBadge}>
                          View Commission
                        </span>
                      )}
                    </motion.button>
                    <div className={styles.outfitTileMeta}>
                      {o.category && <span className={styles.outfitTileCategory}>{o.category}</span>}
                      {o.title && <h3 className={styles.outfitTileTitle}>{o.title}</h3>}
                      {o.startingPrice && <span className={styles.outfitTilePrice}>From {formatCurrency(o.startingPrice, 'NGN')}</span>}
                    </div>
                  </motion.div>
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
              ['--m-accent-fg' as string]: '#ffffff'
            }}
          >
            <WhatsappIcon size={28} />
          </a>
        </FixedBottomPortal>
      )}

      {/* Story viewer — Bespoke Case Study Modal */}
      {storyOutfit && (
        <div className={styles.storyOverlay} role="dialog" aria-label="Creation story" onClick={() => setStoryOutfit(null)}>
          <button type="button" className={styles.storyClose} aria-label="Close" onClick={() => setStoryOutfit(null)}>
            <Symbol name="close" size={28} />
          </button>
          
          <div className={styles.caseStudyContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.caseStudyLeft}>
              <motion.div 
                layoutId={`outfit-image-${storyOutfit.id}-0`}
                className={styles.caseStudyHero}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset }) => {
                  if (offset.x < -50 && hasNext) {
                    setStoryOutfit(filteredOutfits[currentIndex + 1]);
                  } else if (offset.x > 50 && hasPrev) {
                    setStoryOutfit(filteredOutfits[currentIndex - 1]);
                  }
                }}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image
                    src={storyOutfit.displayPhotos[0].url}
                    alt={storyOutfit.title || 'Bespoke garment detail'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                
                {hasPrev && (
                  <button type="button" className={`${styles.galleryNavBtn} ${styles.galleryNavPrev}`} onClick={(e) => { e.stopPropagation(); setStoryOutfit(filteredOutfits[currentIndex - 1]); }} aria-label="Previous Outfit">
                    <Symbol name="chevron_left" size={24} />
                  </button>
                )}
                {hasNext && (
                  <button type="button" className={`${styles.galleryNavBtn} ${styles.galleryNavNext}`} onClick={(e) => { e.stopPropagation(); setStoryOutfit(filteredOutfits[currentIndex + 1]); }} aria-label="Next Outfit">
                    <Symbol name="chevron_right" size={24} />
                  </button>
                )}
              </motion.div>
            </div>
            
            <div className={styles.caseStudyRight}>
              <div className={`${styles.caseStudyContent} ${storyOutfit.storyPhotos.length === 0 && !storyOutfit.storyCaption ? styles.caseStudyContentEmpty : ''}`}>
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
                    <p className={styles.caseStudyMetaValue}>{formatCurrency(storyOutfit.startingPrice, 'NGN')}</p>
                  </div>
                )}
                
                {storyOutfit.storyCaption && (
                  <p className={styles.caseStudyNarrative}>{storyOutfit.storyCaption}</p>
                )}
                
                {whatsappHref && (
                  <a 
                    href={`${whatsappHref}&text=${encodeURIComponent(`Hello, I'm interested in commissioning something similar to '${storyOutfit.title}'.`)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.caseStudyCta}
                  >
                    <WhatsappIcon size={18} /> Inquire about this piece
                  </a>
                )}
                
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
                
                {whatsappHref && (storyOutfit.storyPhotos.length > 0 || storyOutfit.storyCaption) && (
                  <a 
                    href={`${whatsappHref}&text=${encodeURIComponent(`Hello, I'm interested in commissioning something similar to '${storyOutfit.title}'.`)}`} 
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
          
          {/* Focus Trap Guard */}
          <div tabIndex={0} aria-hidden="true" onFocus={() => {
            const closeBtn = document.querySelector(`.${styles.storyClose}`) as HTMLButtonElement;
            if (closeBtn) closeBtn.focus();
          }} />
        </div>
      )}
    </div>
  );
}
