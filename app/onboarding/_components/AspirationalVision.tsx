'use client';

import { motion } from 'framer-motion';
import PortfolioTemplate from '@/components/studio/PortfolioView/PortfolioTemplate';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './AspirationalVision.module.css';

function getMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const PREMIUM_MOCKS = [
  {
    id: 'mock-1',
    title: 'The Modern Agbada',
    category: 'Traditional',
    startingPrice: 350,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/premium_1.jpg', angle: 'front' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  },
  {
    id: 'mock-2',
    title: 'Executive Bespoke Suit',
    category: 'Suits',
    startingPrice: 500,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/premium_2.jpg', angle: 'front' as any }],
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
    displayPhotos: [{ url: '/images/mock/premium_3.jpg', angle: 'detail' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  },
  {
    id: 'mock-4',
    title: 'Evening Gown',
    category: 'Dresses',
    startingPrice: 400,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/premium_4.jpg', angle: 'front' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  },
  {
    id: 'mock-5',
    title: 'Wedding Reception',
    category: 'Bridal',
    startingPrice: 800,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/premium_5.jpg', angle: 'front' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  },
  {
    id: 'mock-6',
    title: 'Casual Linen',
    category: 'Casual',
    startingPrice: 200,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayPhotos: [{ url: '/images/mock/premium_6.jpg', angle: 'front' as any }],
    storyModeEnabled: false,
    storyCaption: null,
    storyPhotos: [],
  }
];

export default function AspirationalVision({ shopName, onFinish }: { shopName: string, onFinish: () => void }) {
  const mockPortfolio = {
    shop: {
      id: 'mock',
      name: shopName || 'Your Studio',
      slug: 'mock',
      orgId: 'mock',
      currency: 'NGN',
      themeAccent: 'indigo',
      onboardingCompleted: true,
      defaultTrackingLinkEnabled: true,
      streakCurrent: 0,
      streakBest: 0,
      streakLastCountedAt: null,
      portfolioTemplate: 'modern',
      portfolioAccent: 'indigo',
      bio: 'Started in a single room, we have spent the last decade mastering the art of bespoke tailoring. Every stitch is a testament to our dedication to the craft, and every garment is a narrative woven for the wearer.',
      isPrimary: true,
      ownerUid: 'mock',
      createdAt: new Date().toISOString(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptionStatus: 'active' as any,
    },
    outfits: PREMIUM_MOCKS,
    stats: {
      completed: 120,
      onTimePercent: 100,
      stylesCount: 6,
      outfitCount: 6,
      testimonialCount: 0
    },
    testimonials: [],
    photos: [],
    ratingSummary: null,
    isPremium: true
  };

  return (
    <div className={styles.visionContainer}>
      <div className={styles.portfolioWrapper}>
        <PortfolioTemplate portfolio={mockPortfolio} />
      </div>
      
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className={styles.messageBox}>
          <div className={styles.monogram}>{getMonogram(shopName)}</div>
          <div className={styles.xpPill}>
            <Symbol name="workspace_premium" size={15} />
            <span>+50 Craft XP Unlocked · Master Tailor</span>
          </div>
          <h2 className={styles.title}>Your Shop is Ready</h2>
          <p className={styles.subtitle}>
            Welcome to <strong>{shopName || 'Your Shop'}</strong>. Every order and measurement you record automatically builds your shop portfolio, keeps cutting tables organized, and sends live tracking to your clients.
          </p>
          <button className={styles.finishBtn} onClick={onFinish}>
            <span>Enter Dashboard</span>
            <Symbol name="arrow_forward" size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
