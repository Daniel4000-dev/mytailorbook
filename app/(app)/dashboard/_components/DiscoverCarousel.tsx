'use client';

import { useState, type UIEvent } from 'react';
import Image from 'next/image';
import { FaShareFromSquare, FaLocationDot, FaWhatsapp, FaRulerCombined, FaChevronRight } from 'react-icons/fa6';
import styles from '../page.module.css';

// ============================================================
// Discover Carousel — a swipeable pointer to features that add real
// value but aren't sitting on the bottom nav (public tracking, the
// portfolio link, WhatsApp wording, the style measurement guides).
// Each card's CTA lands on the exact screen that does the thing.
// ============================================================

const DISCOVER_CARDS = [
  {
    icon: <FaShareFromSquare />,
    image: '/images/discover/portfolio.png',
    title: 'Share your portfolio',
    description: 'A public page with your best work — send the link to new customers.',
    cta: 'Set it up',
    href: '/settings/portfolio',
  },
  {
    icon: <FaLocationDot />,
    image: '/images/discover/tracking.png',
    title: 'Customers can track their own order',
    description: 'Every order gets a live photo-story link — no app for them to install.',
    cta: 'See it in action',
    href: '/production',
  },
  {
    icon: <FaWhatsapp />,
    image: '/images/discover/whatsapp.png',
    title: 'Automatic WhatsApp updates',
    description: 'Ready-to-send stage updates, worded the way your shop actually talks.',
    cta: 'Customize wording',
    href: '/settings/messages',
  },
  {
    icon: <FaRulerCombined />,
    image: '/images/discover/measurement-builder.png',
    title: 'Build your own measurement sheet',
    description: "For anything off-catalog — name the fields you measure, once, and reuse them every time.",
    cta: 'Set up a style',
    href: '/settings/styles',
  },
];

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
                {card.cta} <FaChevronRight />
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
