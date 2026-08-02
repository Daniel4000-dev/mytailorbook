'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** Small glyph icon — mutually exclusive with `image` below (an
   *  illustration replaces the icon slot entirely, it doesn't sit beside
   *  it). Optional only because `image` can stand in for it. */
  icon?: ReactNode;
  /** A larger illustration (e.g. one of the 3D-stylized empty-state pieces
   *  in public/images/empty-states/) instead of a small icon glyph, for
   *  the handful of genuinely-empty (not just filtered-to-nothing) states
   *  where the extra visual weight is worth it. */
  image?: { src: string; width: number; height: number };
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, image, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      {image ? (
        <Image src={image.src} alt="" width={image.width} height={image.height} className={styles.image} />
      ) : (
        <div className={styles.icon}>{icon}</div>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
