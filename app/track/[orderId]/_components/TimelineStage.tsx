'use client';

import { useState } from 'react';
import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import type { OrderStatus, OrderPhoto } from '@/lib/types';
import styles from '../page.module.css';

const STAGE_ICONS: Record<OrderStatus, string> = {
  Documented: 'verified',
  Cutting: 'content_cut',
  Sewing: 'apparel',
  Ready: 'checkroom',
  Delivered: 'check_circle',
};

export const CLIENT_STAGE_HEADLINES: Record<OrderStatus, string> = {
  Documented: 'Order Confirmed',
  Cutting: 'Fabric & Cutting',
  Sewing: 'Tailoring & Stitching',
  Ready: 'Ready for Try-On',
  Delivered: 'Completed & Received',
};

const STAGE_STORIES: Record<OrderStatus, string> = {
  Documented: 'Your order details, fabric choice, and bespoke measurements are safely confirmed.',
  Cutting: 'Patterns drafted and your fabric precision-cut to your exact measurements.',
  Sewing: 'On the workbench — every seam and detail stitched with care by your tailor.',
  Ready: 'Finished, pressed, and waiting for your try-on session or collection.',
  Delivered: 'Delivered and fitted. Thank you for trusting us with your bespoke style!',
};

const PENDING_NOTES: Record<OrderStatus, string> = {
  Documented: 'Order details confirmed and queued for crafting.',
  Cutting: 'Scheduled for pattern drafting and fabric cutting.',
  Sewing: 'Scheduled for tailoring and machine stitching.',
  Ready: 'Scheduled for final pressing and quality inspection.',
  Delivered: 'Scheduled for your try-on session or collection.',
};

function formatStageDate(d: Date): string {
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  if (sameDay) return 'Today';
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface TimelineStageProps {
  status: OrderStatus;
  isCompleted: boolean;
  isCurrent: boolean;
  isPending: boolean;
  date: Date | null;
  photos: OrderPhoto[];
  dueDate: string | null | undefined;
  assignedToName?: string;
}

export default function TimelineStage({
  status,
  isCompleted,
  isCurrent,
  isPending,
  date,
  photos,
  dueDate,
  assignedToName,
}: TimelineStageProps) {
  const [lightbox, setLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);
  const photo = photos[photos.length - 1];

  const handleOpenPhoto = (url: string, el: HTMLElement) => {
    setLightbox({ src: url, rect: el.getBoundingClientRect() });
  };

  return (
    <>
      <article className={`${styles.stage} ${isCurrent ? styles.stageCurrent : ''} ${isPending ? styles.stagePending : ''}`}>
        <div className={styles.stageMeta}>
          <div className={`${styles.stageNode} ${isCompleted ? styles.nodeDone : isCurrent ? styles.nodeNow : styles.nodeWait}`}>
            <Symbol
              name={isCompleted ? 'check' : STAGE_ICONS[status]}
              size={isCurrent ? 24 : 20}
              fill={isCompleted}
              className={isCurrent ? styles.nodePulse : undefined}
            />
          </div>
          <div className={styles.stageText}>
            <span className={styles.stageDate}>
              {isCurrent
                ? date ? formatStageDate(date) : 'Today'
                : isCompleted && date
                  ? formatStageDate(date)
                  : status === 'Ready' && dueDate
                    ? `Target ${new Date(dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                    : 'Up next'}
            </span>
            <h3 className={styles.stageTitle}>{CLIENT_STAGE_HEADLINES[status]}</h3>
            <span className={`${styles.stagePill} ${isCompleted ? styles.pillDone : isCurrent ? styles.pillNow : styles.pillWait}`}>
              {isCompleted ? (status === 'Delivered' ? 'Delivered' : 'Completed') : isCurrent ? 'In Crafting' : 'Upcoming'}
            </span>
          </div>
        </div>

        <div className={styles.stageBody}>
          {isPending ? (
            <div className={styles.pendingCard}>
              <Symbol name="schedule" size={26} className={styles.pendingIcon} />
              <p>{PENDING_NOTES[status]}</p>
            </div>
          ) : photo ? (
            <div className={`${styles.photoCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
              {isCurrent && (
                <span className={styles.liveTag}>
                  <span className={styles.liveTagDot} />
                  Live Update
                </span>
              )}
              <div
                className={styles.photoInteractiveWrap}
                onClick={(e) => handleOpenPhoto(photo.url, e.currentTarget)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenPhoto(photo.url, e.currentTarget);
                  }
                }}
                aria-label={`View full size photo of ${CLIENT_STAGE_HEADLINES[status]}`}
              >
                <Image src={photo.url} alt={`Your garment during ${CLIENT_STAGE_HEADLINES[status]}`} width={800} height={600} className={styles.stagePhoto} />
                <span className={styles.photoZoomBadge}>
                  <Symbol name="visibility" size={14} />
                  <span>Tap to expand</span>
                </span>
              </div>
              <div className={styles.photoCaption}>
                <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
                {isCurrent && assignedToName && (
                  <p className={styles.captionSub}>{assignedToName} is personally crafting your garment.</p>
                )}
              </div>
              {photos.length > 1 && (
                <div className={styles.photoStrip}>
                  {photos.slice(0, -1).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.photoStripThumb}
                      onClick={(e) => handleOpenPhoto(p.url, e.currentTarget)}
                      aria-label={`View earlier progress photo ${i + 1}`}
                    >
                      <Image src={p.url} alt={`${CLIENT_STAGE_HEADLINES[status]} progress ${i + 1}`} width={72} height={72} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={`${styles.storyCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
              {isCurrent && (
                <span className={styles.liveTag}>
                  <span className={styles.liveTagDot} />
                  Live Update
                </span>
              )}
              <Symbol name={STAGE_ICONS[status]} size={28} className={styles.storyIcon} />
              <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
              {isCurrent && assignedToName && (
                <p className={styles.captionSub}>{assignedToName} is personally crafting your garment.</p>
              )}
            </div>
          )}
        </div>
      </article>

      {lightbox && (
        <PhotoLightbox
          src={lightbox.src}
          originRect={lightbox.rect}
          alt={`Garment during ${CLIENT_STAGE_HEADLINES[status]}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
