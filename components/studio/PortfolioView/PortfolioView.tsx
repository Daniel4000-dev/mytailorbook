'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import Symbol from '@/components/ui/Symbol/Symbol';
import { GARMENT_STYLES } from '@/lib/constants';
import { getWhatsAppLink } from '@/lib/formatters';
import { APP_CONFIG } from '@/lib/config';
import type { PublicPortfolio, PortfolioPhoto } from '@/app/public-actions';
import styles from './PortfolioView.module.css';

const PROCESS_STEPS = [
  { icon: 'straighten', title: 'Measured', text: 'Taken in person, kept on file' },
  { icon: 'content_cut', title: 'Fabric Cut', text: 'Cut to your exact numbers' },
  { icon: 'apparel', title: 'Sewn with Care', text: 'Finished by hand, checked twice' },
  { icon: 'radar', title: 'Track it Live', text: 'Follow every stage from your phone' },
];

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

export default function PortfolioView({ portfolio }: { portfolio: PublicPortfolio }) {
  const { shop, photos, stats } = portfolio;
  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const [filter, setFilter] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const revealRoot = useRef<HTMLDivElement | null>(null);

  const heroPhoto = photos[0];
  const city = shop.address ? shop.address.split(',').pop()?.trim() : null;
  const whatsappHref = shop.phone ? getWhatsAppLink(shop.phone) : null;

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

  /* Staggered scroll reveals */
  useEffect(() => {
    const root = revealRoot.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelectorAll(`.${styles.reveal}`).forEach((el) => el.classList.add(styles.revealed));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealed);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll(`.${styles.reveal}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filter]);

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
    // Always the canonical public URL — this view can also render inside
    // the authenticated app (a different route), where window.location.href
    // would leak an in-app path a visitor couldn't open.
    const url = `${window.location.origin}/studio/${shop.id}`;
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

  return (
    <div className={styles.page} ref={revealRoot}>
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
          <div className={styles.heroPhoto} style={{ backgroundImage: `url(${heroPhoto.url})` }} />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.avatar}>{shop.name[0]?.toUpperCase()}</div>
          <span className={styles.eyebrow}>Bespoke Tailoring{city ? ` · ${city}` : ''}</span>
          <h1 className={styles.heroName}>{shop.name}</h1>
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
        </div>
      </section>

      {/* 2. Proof strip */}
      {stats.completed > 0 && (
        <section className={`${styles.proofStrip} ${styles.reveal}`}>
          <div className={styles.proofItem}>
            <span className={styles.proofNum}>
              {stats.completed}
              <em>+</em>
            </span>
            <span className={styles.proofLabel}>Finished</span>
          </div>
          {stats.onTimePercent !== null && (
            <div className={styles.proofItem}>
              <span className={styles.proofNum}>
                {stats.onTimePercent}
                <em>%</em>
              </span>
              <span className={styles.proofLabel}>On-time</span>
            </div>
          )}
          {stats.stylesCount > 0 && (
            <div className={styles.proofItem}>
              <span className={styles.proofNum}>{stats.stylesCount}</span>
              <span className={styles.proofLabel}>Styles</span>
            </div>
          )}
        </section>
      )}

      {/* 3. Gallery */}
      {photos.length > 0 && (
        <section className={styles.gallerySection}>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>Recent Work</h2>
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
              <button
                key={`${p.url}-${i}`}
                type="button"
                className={`${styles.bentoItem} ${i % 5 === 0 ? styles.bentoLarge : ''} ${styles.reveal}`}
                style={{ transitionDelay: `${(i % 6) * 60}ms` }}
                onClick={() => setLightboxIndex(i)}
                aria-label={`View ${p.garment}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.garment} loading={i > 3 ? 'lazy' : undefined} />
                <span className={styles.bentoCaption}>
                  <b>{styleOf(p.garment) || p.garment}</b>
                  <small>{monthOf(p.takenAt)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. Process strip */}
      <section className={styles.processSection}>
        <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>How Your Order Will Go</h2>
        <div className={styles.processGrid}>
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.title} className={`${styles.processStep} ${styles.reveal}`} style={{ transitionDelay: `${i * 90}ms` }}>
              <span className={styles.processIcon} style={{ background: `rgba(67, 56, 202, ${0.08 + i * 0.06})` }}>
                <Symbol name={step.icon} size={28} fill={i === PROCESS_STEPS.length - 1} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Specialties */}
      {presentStyles.length > 0 && (
        <section className={`${styles.chipsSection} ${styles.reveal}`}>
          {presentStyles.map((s) => (
            <span key={s} className={styles.specialtyChip}>{s}</span>
          ))}
        </section>
      )}

      {/* 6. Final CTA — only when there's actually a way to act on it */}
      {whatsappHref && (
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaCard} ${styles.reveal}`}>
          <div className={styles.ctaOrb} aria-hidden="true" />
          <h2>Ready to sew something?</h2>
          <p>Send a reference photo{city ? ` or visit us in ${city}` : ''} — every order is measured to you and tracked live.</p>
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ctaCardBtn}>
              <FaWhatsapp size={20} /> Start a Conversation
            </a>
          )}
          {shop.address && <span className={styles.ctaAddress}>{shop.address}</span>}
        </div>
      </section>
      )}

      <footer className={styles.footer}>
        <p>
          Powered by <span className={styles.footerBrand}>{APP_CONFIG.name}</span>
        </p>
      </footer>

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className={styles.lightbox} role="dialog" aria-label="Photo viewer" onClick={() => setLightboxIndex(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightboxIndex(null)}>
            <Symbol name="close" size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={filteredPhotos[lightboxIndex].url}
            alt={filteredPhotos[lightboxIndex].garment}
            onClick={(e) => e.stopPropagation()}
          />
          <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
            {filteredPhotos[lightboxIndex].garment} · {monthOf(filteredPhotos[lightboxIndex].takenAt)}
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
