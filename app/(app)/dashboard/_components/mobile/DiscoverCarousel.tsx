'use client';

import { useState, useRef, type UIEvent } from 'react';
import { useData } from '@/contexts/DataContext';
import Image from 'next/image';
import { DISCOVER_CARDS } from '../discoverCards';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

// ============================================================
// Discover Carousel — a calm, non-intrusive swipeable guide
// to powerful features (portfolio, tracking, WhatsApp wording, custom styles).
// Displays for the first 30 days of signup (top for first 10, then bottom).
// ============================================================

export default function DiscoverCarousel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { currentShop } = useData();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-hide completely after 30 days
  if (currentShop?.createdAt) {
    const createdAt = new Date(currentShop.createdAt);
    const now = new Date();
    const daysOld = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    if (daysOld > 30) {
      return null;
    }
  }

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardWidth = el.firstElementChild?.clientWidth || 1;
    const gap = 16;
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + gap)));
  };

  return (
    <div className={styles.discoverSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Studio Tips & Features</span>
      </div>
      <div ref={scrollRef} className={styles.discoverScroll} onScroll={handleScroll}>
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
                {card.cta} <Symbol name="chevron_right" size={14} />
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
