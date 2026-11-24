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

const STAGE_BLUEPRINT_LABELS: Record<OrderStatus, string> = {
  Documented: 'Bespoke Fit & Specification Dossier',
  Cutting: 'Pattern Drafting & Cloth Layout',
  Sewing: 'Seam Construction & Tailoring',
  Ready: 'Final Pressing & Quality Inspection',
  Delivered: 'Commission Complete & Delivered',
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

const STAGE_STEP_NUM: Record<OrderStatus, string> = {
  Documented: '01',
  Cutting: '02',
  Sewing: '03',
  Ready: '04',
  Delivered: '05',
};

function formatStageDate(d: Date): string {
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Architectural SVG Blueprint Artwork for photo-less stages — gives every
 * stage an Apple-grade visual focal point even before the tailor takes a photo.
 */
function StageBlueprintArtwork({ status, isCurrent }: { status: OrderStatus; isCurrent: boolean }) {
  const strokeMain = isCurrent ? '#4338CA' : '#6366F1';
  const strokeSubtle = 'rgba(67, 56, 202, 0.24)';

  if (status === 'Documented') {
    return (
      <svg
        viewBox="0 0 360 116"
        className={styles.blueprintSvg}
        aria-hidden="true"
      >
        {/* Measurement Ruler & Proportion Frame */}
        <line x1="36" y1="58" x2="324" y2="58" stroke={strokeSubtle} strokeDasharray="3 3" />
        <line x1="180" y1="14" x2="180" y2="102" stroke={strokeSubtle} strokeDasharray="3 3" />
        {/* Torso / Garment Block Blueprint */}
        <path
          d="M148 24 L164 18 L196 18 L212 24 L226 44 L212 52 L204 38 L204 96 L156 96 L156 38 L148 52 L134 44 Z"
          fill="rgba(67, 56, 202, 0.06)"
          stroke={strokeMain}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Collar & Placket Detail */}
        <path
          d="M166 18 Q180 28 194 18 M180 24 L180 56"
          fill="none"
          stroke={strokeMain}
          strokeWidth="1.4"
        />
        {/* Dimension Callout Guides */}
        <line x1="120" y1="24" x2="120" y2="96" stroke={strokeMain} strokeWidth="1.1" />
        <line x1="116" y1="24" x2="124" y2="24" stroke={strokeMain} strokeWidth="1.1" />
        <line x1="116" y1="96" x2="124" y2="96" stroke={strokeMain} strokeWidth="1.1" />
        <circle cx="148" cy="24" r="3" fill={strokeMain} />
        <circle cx="212" cy="24" r="3" fill={strokeMain} />
        <circle cx="156" cy="96" r="2.5" fill={strokeMain} />
        <circle cx="204" cy="96" r="2.5" fill={strokeMain} />
      </svg>
    );
  }

  if (status === 'Cutting') {
    return (
      <svg
        viewBox="0 0 360 116"
        className={styles.blueprintSvg}
        aria-hidden="true"
      >
        {/* Pattern Drafting Chalk Lines & Seam Allowance */}
        <rect
          x="74"
          y="20"
          width="212"
          height="76"
          rx="8"
          fill="rgba(67, 56, 202, 0.04)"
          stroke={strokeSubtle}
          strokeWidth="1.2"
        />
        <path
          d="M92 34 L172 34 C188 34 196 46 212 46 L268 46 L268 82 L92 82 Z"
          fill="rgba(67, 56, 202, 0.07)"
          stroke={strokeMain}
          strokeWidth="1.6"
          strokeDasharray="6 3"
        />
        {/* Grainline Double Arrow */}
        <line x1="120" y1="58" x2="236" y2="58" stroke={strokeMain} strokeWidth="1.3" />
        <polyline points="126,53 118,58 126,63" fill="none" stroke={strokeMain} strokeWidth="1.3" />
        <polyline points="230,53 238,58 230,63" fill="none" stroke={strokeMain} strokeWidth="1.3" />
        {/* Corner Registration Marks */}
        <circle cx="92" cy="34" r="3" fill={strokeMain} />
        <circle cx="268" cy="46" r="3" fill={strokeMain} />
        <circle cx="268" cy="82" r="3" fill={strokeMain} />
        <circle cx="92" cy="82" r="3" fill={strokeMain} />
      </svg>
    );
  }

  if (status === 'Sewing') {
    return (
      <svg
        viewBox="0 0 360 116"
        className={styles.blueprintSvg}
        aria-hidden="true"
      >
        {/* Precision Lockstitch Wave & Seam Track */}
        <line x1="44" y1="58" x2="316" y2="58" stroke={strokeSubtle} strokeWidth="1.2" />
        <path
          d="M 52 58 Q 76 26, 100 58 T 148 58 T 196 58 T 244 58 T 292 58"
          fill="none"
          stroke={strokeMain}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 52 58 Q 76 90, 100 58 T 148 58 T 196 58 T 244 58 T 292 58"
          fill="none"
          stroke={strokeMain}
          strokeWidth="1.4"
          strokeDasharray="4 3"
          opacity="0.65"
        />
        {/* Stitch Nodes */}
        {[52, 100, 148, 196, 244, 292].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy="58"
            r="3.5"
            fill="#ffffff"
            stroke={strokeMain}
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  }

  // Ready or Delivered
  return (
    <svg
      viewBox="0 0 360 116"
      className={styles.blueprintSvg}
      aria-hidden="true"
    >
      {/* Sartorial Hanger & Finished Shoulder Drape */}
      <circle cx="180" cy="58" r="44" fill="rgba(67, 56, 202, 0.05)" stroke={strokeSubtle} strokeWidth="1.2" />
      <circle cx="180" cy="58" r="34" fill="none" stroke={strokeSubtle} strokeDasharray="3 3" />
      {/* Hanger Hook */}
      <path
        d="M180 34 C180 27 187 26 187 31 C187 35 180 37 180 41"
        fill="none"
        stroke={strokeMain}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {/* Hanger Shoulders */}
      <path
        d="M142 56 L180 41 L218 56 L210 60 L180 49 L150 60 Z"
        fill="rgba(67, 56, 202, 0.12)"
        stroke={strokeMain}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Finished Garment Lapel Lines */}
      <path
        d="M154 59 L154 84 L206 84 L206 59 M170 53 L180 68 L190 53"
        fill="none"
        stroke={strokeMain}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
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
      <article
        className={`${styles.stage} ${isCurrent ? styles.stageCurrent : ''} ${
          isPending ? styles.stagePending : ''
        }`}
      >
        <div className={styles.stageMeta}>
          <div
            className={`${styles.stageNode} ${
              isCompleted ? styles.nodeDone : isCurrent ? styles.nodeNow : styles.nodeWait
            }`}
          >
            <Symbol
              name={isCompleted ? 'check' : STAGE_ICONS[status]}
              size={isCurrent ? 22 : 18}
              fill={isCompleted}
              className={isCurrent ? styles.nodePulse : undefined}
            />
          </div>
          <div className={styles.stageText}>
            <span className={styles.stageDate}>
              {isCurrent
                ? date
                  ? formatStageDate(date)
                  : 'Active Stage'
                : isCompleted && date
                ? formatStageDate(date)
                : status === 'Ready' && dueDate
                ? `Target ${new Date(dueDate).toLocaleDateString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                  })}`
                : `Step ${STAGE_STEP_NUM[status]}`}
            </span>
            <h3 className={styles.stageTitle}>{CLIENT_STAGE_HEADLINES[status]}</h3>
            <span
              className={`${styles.stagePill} ${
                isCompleted ? styles.pillDone : isCurrent ? styles.pillNow : styles.pillWait
              }`}
            >
              {isCompleted
                ? status === 'Delivered'
                  ? 'Delivered'
                  : 'Completed'
                : isCurrent
                ? 'In Progress'
                : 'Upcoming'}
            </span>
          </div>
        </div>

        <div className={styles.stageBody}>
          {isPending ? (
            /* Sleek Apple-Style Compact Upcoming Milestone Row (No empty dashed box!) */
            <div className={styles.pendingMilestoneCard}>
              <div className={styles.pendingMilestoneLeft}>
                <span className={styles.pendingStepBadge}>Step {STAGE_STEP_NUM[status]}</span>
                <p className={styles.pendingMilestoneText}>{PENDING_NOTES[status]}</p>
              </div>
              <Symbol name="schedule" size={18} className={styles.pendingIcon} />
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
                <Image
                  src={photo.url}
                  alt={`Your garment during ${CLIENT_STAGE_HEADLINES[status]}`}
                  width={800}
                  height={600}
                  className={styles.stagePhoto}
                />
                <span className={styles.photoZoomBadge}>
                  <Symbol name="visibility" size={14} />
                  <span>Tap to expand</span>
                </span>
              </div>
              <div className={styles.photoCaption}>
                <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
                {isCurrent && assignedToName && (
                  <p className={styles.captionSub}>
                    {assignedToName} is personally crafting your garment.
                  </p>
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
                      <Image
                        src={p.url}
                        alt={`${CLIENT_STAGE_HEADLINES[status]} progress ${i + 1}`}
                        width={72}
                        height={72}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Rich Architectural Blueprint Card when no photo is uploaded yet */
            <div className={`${styles.blueprintCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
              <div className={styles.blueprintCanvas}>
                <div className={styles.blueprintTopBar}>
                  <span className={styles.blueprintCode}>
                    STAGE {STAGE_STEP_NUM[status]} · {STAGE_BLUEPRINT_LABELS[status]}
                  </span>
                  {isCurrent && (
                    <span className={styles.blueprintActivePill}>
                      <span className={styles.liveTagDot} />
                      Active
                    </span>
                  )}
                </div>
                <StageBlueprintArtwork status={status} isCurrent={isCurrent} />
              </div>
              <div className={styles.blueprintFooter}>
                <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
                {isCurrent && assignedToName && (
                  <p className={styles.captionSub}>
                    {assignedToName} is personally crafting your garment.
                  </p>
                )}
              </div>
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
