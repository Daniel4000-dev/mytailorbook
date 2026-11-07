'use client';

import { useState } from 'react';
import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import type { OrderPhoto } from '@/lib/types';
import styles from '../page.module.css';

interface SelectedDesignCardProps {
  inspirationImages?: string[];
  fabrics?: OrderPhoto[];
}

export default function SelectedDesignCard({ inspirationImages = [], fabrics = [] }: SelectedDesignCardProps) {
  const [lightbox, setLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);

  const hasInspo = inspirationImages.length > 0;
  const hasFabrics = fabrics.length > 0;

  if (!hasInspo && !hasFabrics) return null;

  const handleOpen = (url: string, el: HTMLElement) => {
    setLightbox({ src: url, rect: el.getBoundingClientRect() });
  };

  return (
    <>
      <section className={styles.card}>
        <div className={styles.referenceHeader}>
          <div className={styles.referenceTitleGroup}>
            <Symbol name="checkroom" size={20} className={styles.referenceIcon} />
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
              Your Selected Design & Fabric
            </h3>
          </div>
          <span className={styles.referenceBadge}>Confirmed</span>
        </div>
        <p className={styles.referenceSub}>
          Reference styling and fabric swatches confirmed for your bespoke garment.
        </p>

        <div className={styles.referenceGrid}>
          {inspirationImages.map((url, idx) => (
            <div
              key={`inspo-${idx}`}
              className={styles.referenceThumbCard}
              onClick={(e) => handleOpen(url, e.currentTarget)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen(url, e.currentTarget);
                }
              }}
              aria-label={`View design reference photo ${idx + 1}`}
            >
              <div className={styles.referenceImageWrap}>
                <Image
                  src={url}
                  alt={`Design reference ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 220px"
                  className={styles.referenceImg}
                />
                <span className={styles.referenceTag}>Style Reference</span>
              </div>
            </div>
          ))}

          {fabrics.map((fabric, idx) => (
            <div
              key={`fabric-${idx}`}
              className={styles.referenceThumbCard}
              onClick={(e) => handleOpen(fabric.url, e.currentTarget)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen(fabric.url, e.currentTarget);
                }
              }}
              aria-label={`View fabric swatch photo ${idx + 1}`}
            >
              <div className={styles.referenceImageWrap}>
                <Image
                  src={fabric.url}
                  alt={`Fabric swatch ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 220px"
                  className={styles.referenceImg}
                />
                <span className={styles.referenceTag}>Fabric Swatch</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {lightbox && (
        <PhotoLightbox
          src={lightbox.src}
          originRect={lightbox.rect}
          alt="Selected design and fabric"
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

