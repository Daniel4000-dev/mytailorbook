'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { APP_CONFIG } from '@/lib/config';
import styles from './AspirationalVision.module.css';

function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'your-brand'
  );
}

const SAMPLE_SHOWCASE_ITEMS = [
  {
    id: 'sample-1',
    title: 'Executive Bespoke Suit',
    category: 'Suits & Blazers',
    startingPrice: '₦85,000',
    image: '/images/garments/suit-male.jpg',
    tag: 'Bespoke Tailoring',
  },
  {
    id: 'sample-2',
    title: 'Grand Ceremonial Agbada',
    category: 'Traditional & Bridal',
    startingPrice: '₦120,000',
    image: '/images/garments/agbada-male.jpg',
    tag: 'Signature Craft',
  },
  {
    id: 'sample-3',
    title: 'Executive Textured Two-Piece',
    category: 'Matching Sets',
    startingPrice: '₦55,000',
    image: '/images/garments/two-piece-male.jpg',
    tag: 'Everyday Luxury',
  },
];

export default function AspirationalVision({
  shopName,
  businessMode = 'bespoke',
  onFinish,
}: {
  shopName: string;
  businessMode?: 'bespoke' | 'rtw' | 'hybrid';
  onFinish: () => void;
}) {
  const isRtw = businessMode === 'rtw';
  const isHybrid = businessMode === 'hybrid';
  const slug = slugify(shopName);
  const monogram = getMonogram(shopName);
  const studioUrl = `${APP_CONFIG.domain}/studio/${slug}`;

  return (
    <div className={styles.visionContainer}>
      <div className={styles.ambientGlow} />
      <div className={styles.ambientGlowSecondary} />

      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Top Floating Context Header */}
        <div className={styles.contextHeader}>
          <div className={styles.previewIndicatorPill}>
            <Symbol name="auto_awesome" size={14} className={styles.sparkleIcon} />
            <span>Interactive Storefront Preview • What Your Clients Will Experience</span>
          </div>
          <p className={styles.contextSub}>
            This is a preview of your live brand showcase. None of this sample data is saved to your account — your workshop starts 100% clean and ready for your real creations.
          </p>
        </div>

        {/* The Live Luxury Storefront Device Frame */}
        <div className={styles.storefrontDevice}>
          {/* Studio Browser Header */}
          <div className={styles.deviceUrlBar}>
            <span className={styles.urlLockIcon}>
              <Symbol name="lock" size={12} />
            </span>
            <span className={styles.urlText}>{studioUrl}</span>
            <span className={styles.liveIndicator}>Live Preview</span>
          </div>

          {/* Storefront Hero */}
          <div className={styles.storefrontHero}>
            <div className={styles.monogramCrest}>{monogram}</div>
            <div className={styles.storefrontMeta}>
              <div className={styles.nameRow}>
                <h3 className={styles.storefrontName}>{shopName || 'Your Workshop'}</h3>
                <span className={styles.verifiedCheck} title="Verified Tailoring House">
                  <Symbol name="verified" size={15} />
                </span>
              </div>
              <p className={styles.storefrontTagline}>
                {isRtw
                  ? 'Luxury Ready-to-Wear Showroom & Curated Ensembles'
                  : isHybrid
                    ? 'Bespoke Made-to-Measure & Ready-to-Wear Collections'
                    : 'Master Bespoke Tailoring & Traditional Wear'}
              </p>
              <div className={styles.ratingStrip}>
                <div className={styles.starsRow}>
                  <Symbol name="star" size={13} className={styles.goldStar} />
                  <Symbol name="star" size={13} className={styles.goldStar} />
                  <Symbol name="star" size={13} className={styles.goldStar} />
                  <Symbol name="star" size={13} className={styles.goldStar} />
                  <Symbol name="star" size={13} className={styles.goldStar} />
                  <span className={styles.ratingScore}>5.0</span>
                </div>
                <span className={styles.bulletDot}>·</span>
                <span className={styles.reviewCount}>Verified Master Tailor</span>
              </div>
            </div>

            <div className={styles.directOrderBtn}>
              <WhatsappIcon size={14} />
              <span>WhatsApp Order</span>
            </div>
          </div>

          {/* Sample Collection Section */}
          <div className={styles.collectionSection}>
            <div className={styles.sectionHeaderRow}>
              <span className={styles.collectionTitle}>Signature Collections</span>
              <span className={styles.sampleSlotBadge}>Sample Inspiration</span>
            </div>

            <div className={styles.showcaseGrid}>
              {SAMPLE_SHOWCASE_ITEMS.map((item) => (
                <div key={item.id} className={styles.showcaseCard}>
                  <div className={styles.cardImageFrame}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={320}
                      height={400}
                      className={styles.cardImg}
                    />
                    <div className={styles.cardTagPill}>{item.tag}</div>
                    <div className={styles.sampleWatermark}>Sample Showcase</div>
                  </div>
                  <div className={styles.cardDetails}>
                    <h4 className={styles.itemTitle}>{item.title}</h4>
                    <div className={styles.priceRow}>
                      <span className={styles.categoryName}>{item.category}</span>
                      <span className={styles.priceTag}>From {item.startingPrice}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Future Slot Hint */}
          <div className={styles.futureSlotNotice}>
            <div className={styles.futureSlotIcon}>
              <Symbol name="add_photo_alternate" size={20} />
            </div>
            <div className={styles.futureSlotText}>
              <p className={styles.futureSlotTitle}>Your First Slot is Reserved</p>
              <p className={styles.futureSlotSub}>
                When you complete your first garment on your cutting board, you can publish its photos directly into this public gallery with 1 tap.
              </p>
            </div>
          </div>
        </div>

        {/* Floating Launch Action Bar */}
        <div className={styles.bottomLaunchBar}>
          <div className={styles.launchSummary}>
            <span className={styles.launchHint}>Your URL is active:</span>
            <span className={styles.launchUrl}>{studioUrl}</span>
          </div>
          <button type="button" className={styles.launchBtn} onClick={onFinish}>
            <span>Launch Clean Workshop &amp; Add First Order</span>
            <Symbol name="arrow_forward" size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
