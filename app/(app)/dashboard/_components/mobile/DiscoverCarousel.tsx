'use client';

import { useState, type UIEvent } from 'react';
import Image from 'next/image';
import { DISCOVER_CARDS } from '../discoverCards';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

// ============================================================
// Discover Carousel — a swipeable pointer to features that add real
// value but aren't sitting on the bottom nav (public tracking, the
// portfolio link, WhatsApp wording, the style measurement guides).
// Each card's CTA lands on the exact screen that does the thing.
// ============================================================

export default function DiscoverCarousel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardWidth = el.firstElementChild?.clientWidth || 1;
    const gap = 16;
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + gap)));
  };

  return (
    <div className={styles.discoverSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Discover</span>
      </div>
      <div className={styles.discoverScroll} onScroll={handleScroll}>
        {DISCOVER_CARDS.map((card) => (
          <button
            key={card.title}
            type="button"
            className={`${styles.discoverCard} ${card.image ? styles.discoverCardWithImage : ''}`}
            onClick={() => onNavigate(card.href)}
          >
            <div className={styles.discoverText}>
              {!card.image && <div className={styles.discoverIcon}>{card.icon}</div>}
              <span className={styles.discoverTitle}>{card.title}</span>
              <span className={styles.discoverDesc}>{card.description}</span>
              <span className={styles.discoverCta}>
                {card.cta} <Symbol name="chevron_right" />
              </span>
            </div>
            {card.image && (
              <div className={styles.discoverImageWrap}>
                <Image src={card.image} alt="" width={322} height={662} className={styles.discoverImage} />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className={styles.discoverDots}>
        {DISCOVER_CARDS.map((card, i) => (
          <span key={card.title} className={i === activeIndex ? styles.dotActive : styles.dot} />
        ))}
      </div>
    </div>
  );
}
