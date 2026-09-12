'use client';

import type { ReactNode } from 'react';

import styles from './FAB.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
  /** Lets a caller (e.g. AppTour) find this exact FAB instance on the page
   *  via `[data-tour-id="..."]` — this component has a single call site
   *  today, but the prop keeps that an app/(app)/layout.tsx decision
   *  rather than something hardcoded in here. */
  tourId?: string;
}

export default function FAB({ onClick, icon, label = 'Create new', tourId }: FABProps) {
  return (
    <button className={styles.fab} onClick={onClick} aria-label={label} data-tour-id={tourId}>
      {icon || <Symbol name="add" />}
    </button>
  );
}
