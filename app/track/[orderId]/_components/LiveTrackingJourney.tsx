'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import PhotoLightbox from '@/components/ui/PhotoLightbox/PhotoLightbox';
import TimelineStage, { CLIENT_STAGE_HEADLINES } from './TimelineStage';
import ShareTrackButton from './ShareTrackButton';
import type { OrderStatus, OrderPhoto } from '@/lib/types';
import styles from '../page.module.css';

const PRODUCTION_STAGES: OrderStatus[] = ['Documented', 'Cutting', 'Sewing', 'Ready'];

export interface StageTimelineData {
  status: OrderStatus;
  dateIso: string | null;
  photos: OrderPhoto[];
}

interface LiveTrackingJourneyProps {
  orderId: string;
  orderTitle: string;
  styleName?: string;
  customerName?: string;
  shopName: string;
  shopLogoUrl: string | null;
  actualStatus: OrderStatus;
  dueDate?: string | null;
  completedDateIso: string | null;
  daysRemainingLabel: string | null;
  assignedToName?: string;
  latestPhotoUrl: string | null;
  outfitReferenceUrl: string | null;
  stages: StageTimelineData[];
  specsCount: number;
}

export default function LiveTrackingJourney({
  orderId,
  orderTitle,
  styleName,
  customerName,
  shopName,
  shopLogoUrl,
  actualStatus,
  dueDate,
  completedDateIso,
  daysRemainingLabel,
  assignedToName,
  latestPhotoUrl,
  outfitReferenceUrl,
  stages,
  specsCount,
}: LiveTrackingJourneyProps) {
  const isDelivered = actualStatus === 'Delivered';
  const currentStepIndex = isDelivered
    ? PRODUCTION_STAGES.length - 1
    : Math.max(0, PRODUCTION_STAGES.indexOf(actualStatus));

  const [railExpanded, setRailExpanded] = useState(false);
  const [heroLightbox, setHeroLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);

  // Instant Truth + Smooth Progress Rail Sweep (450ms):
  // The text status and active stage card render immediately at their true current stage,
  // while the vertical timeline rail and active node glide smoothly into place on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setRailExpanded(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const heroVisualUrl = latestPhotoUrl || outfitReferenceUrl;
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-NG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const formattedCompletedDate = completedDateIso
    ? new Date(completedDateIso).toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const railFillPercentage = isDelivered
    ? 100
    : Math.round(((currentStepIndex + 0.35) / PRODUCTION_STAGES.length) * 100);

  return (
    <>
      {/* ── 1. Clean Order Dossier Hero Card (No Progress Bar — Pure Identity, Outfit & Key Facts) ── */}
      <section className={styles.liveHeroCard}>
        <div className={styles.liveHeroTopBar}>
          <div className={styles.liveHeroBadges}>
            <span className={styles.liveHeroStatusPill}>
              <span className={styles.liveHeroPulseDot} />
              <span>{CLIENT_STAGE_HEADLINES[actualStatus]}</span>
            </span>
            <span className={styles.liveHeroOrderRef}>
              Order #{orderId.slice(0, 4).toUpperCase()}
            </span>
          </div>

          <ShareTrackButton
            orderId={orderId}
            orderTitle={orderTitle}
            shopName={shopName}
            shopLogoUrl={shopLogoUrl}
            customerName={customerName}
            stageHeadline={CLIENT_STAGE_HEADLINES[actualStatus]}
            status={actualStatus}
            photoUrl={heroVisualUrl}
            dueDate={dueDate}
            completedDate={completedDateIso}
            isDelivered={isDelivered}
          />
        </div>

        {/* Main Garment Identity + Outfit Visual Preview */}
        <div className={styles.liveHeroBody}>
          <div className={styles.liveHeroCopy}>
            <span className={styles.liveHeroClientTag}>
              Prepared for {customerName || 'Valued Client'}
            </span>
            <h1 className={styles.liveHeroTitle}>{orderTitle}</h1>
            {styleName && styleName !== orderTitle && (
              <p className={styles.liveHeroStyleSub}>{styleName}</p>
            )}
          </div>

          {/* Outfit Thumbnail Frame right inside Hero */}
          {heroVisualUrl ? (
            <button
              type="button"
              className={styles.liveHeroMediaFrame}
              onClick={(e) =>
                setHeroLightbox({
                  src: heroVisualUrl,
                  rect: e.currentTarget.getBoundingClientRect(),
                })
              }
              aria-label="View outfit photo"
            >
              <Image
                src={heroVisualUrl}
                alt={orderTitle}
                width={176}
                height={176}
                className={styles.liveHeroMediaImg}
              />
              <span className={styles.liveHeroMediaTag}>
                {latestPhotoUrl ? 'Latest Photo' : 'Reference'}
              </span>
            </button>
          ) : (
            <div className={styles.liveHeroSilhouetteFrame} aria-hidden="true">
              <Symbol name="checkroom" size={28} />
              <span>Custom Fit</span>
            </div>
          )}
        </div>

        {/* 3 Key Facts Strip: Target Ready Date · Countdown / Status · Documented Fit Specs */}
        <div className={styles.liveHeroFactsGrid}>
          <div className={styles.liveHeroFactCell}>
            <span className={styles.liveHeroFactLabel}>
              {isDelivered ? 'Delivered On' : 'Target Ready Date'}
            </span>
            <span className={styles.liveHeroFactValue}>
              {isDelivered
                ? formattedCompletedDate || 'Completed'
                : formattedDueDate || 'Scheduled'}
            </span>
          </div>

          <div className={styles.liveHeroFactCell}>
            <span className={styles.liveHeroFactLabel}>Schedule</span>
            <span className={styles.liveHeroFactValueAccent}>
              {isDelivered
                ? 'Received'
                : daysRemainingLabel || 'In Workshop'}
            </span>
          </div>

          <div className={styles.liveHeroFactCell}>
            <span className={styles.liveHeroFactLabel}>Fit Profile</span>
            <span className={styles.liveHeroFactValue}>
              {specsCount > 0 ? `${specsCount} Measurements` : 'Confirmed'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Craftsmanship Timeline with Instant Status + Smooth Rail Sweep ── */}
      {!isDelivered && (
        <section className={styles.timeline}>
          <div className={styles.timelineRail} aria-hidden="true">
            <div
              className={styles.timelineRailFill}
              style={{
                height: railExpanded ? `${railFillPercentage}%` : '0%',
              }}
            />
          </div>
          {stages.map((stageItem, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <TimelineStage
                key={stageItem.status}
                status={stageItem.status}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isPending={isPending}
                isJustAdvanced={isCurrent && railExpanded}
                date={stageItem.dateIso ? new Date(stageItem.dateIso) : null}
                photos={stageItem.photos}
                dueDate={dueDate}
                assignedToName={assignedToName}
              />
            );
          })}
        </section>
      )}

      {heroLightbox && (
        <PhotoLightbox
          src={heroLightbox.src}
          originRect={heroLightbox.rect}
          alt={orderTitle}
          onClose={() => setHeroLightbox(null)}
        />
      )}
    </>
  );
}
