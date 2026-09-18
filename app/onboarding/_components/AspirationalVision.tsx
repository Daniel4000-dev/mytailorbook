'use client';

import { motion } from 'framer-motion';
import PortfolioTemplate from '@/components/studio/PortfolioView/PortfolioTemplate';
import styles from './AspirationalVision.module.css';

const PREMIUM_MOCKS = [
  {
    id: 'mock-1',
    title: 'The Modern Agbada',
    category: 'Traditional',
    startingPrice: 350,
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
        transition={{ delay: 1, duration: 1.5 }}
      >
        <div className={styles.messageBox}>
          <h2 className={styles.title}>Your Digital Storefront Awaits.</h2>
          <p className={styles.subtitle}>
            Every order you complete automatically builds a world-class portfolio right here. 
            Clear your board today to start building your legacy.
          </p>
          <button className={styles.finishBtn} onClick={onFinish}>
            Enter Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
