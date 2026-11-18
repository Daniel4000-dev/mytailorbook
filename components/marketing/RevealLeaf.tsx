'use client';

import React, { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, slideInLeft, slideInRight, popIn } from '@/lib/marketingMotion';

export type RevealVariant = 'fadeUp' | 'slideInLeft' | 'slideInRight' | 'popIn';

const VARIANTS: Record<RevealVariant, typeof fadeUp> = {
  fadeUp,
  slideInLeft,
  slideInRight,
  popIn,
};

interface RevealLeafProps {
  children: ReactNode;
  delay?: number;
  variant?: RevealVariant;
  as?: 'div' | 'span' | 'h2' | 'h1' | 'h3' | 'section' | 'p';
  animateOnMount?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * RevealLeaf — Client Island wrapper for scroll & entrance animations.
 *
 * Allows parent pages (e.g. HomePageContent) to remain pure React Server Components (RSC)
 * while delegating only the client-side motion observers and hydration to this lightweight leaf.
 */
export default function RevealLeaf({
  children,
  delay = 0,
  variant = 'fadeUp',
  as = 'div',
  animateOnMount = false,
  className,
  style,
}: RevealLeafProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] || motion.div;

  if (reduceMotion) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  if (animateOnMount) {
    return (
      <Component
        className={className}
        style={style}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={className}
      style={style}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-60px' }}
      variants={VARIANTS[variant]}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}

