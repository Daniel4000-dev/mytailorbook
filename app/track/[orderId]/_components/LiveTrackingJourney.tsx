'use client';

import React, { useState, useEffect } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
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
      {/* ── 1. Borderless Hero Dossier (Pure Typographic Flow on Page Canvas) ── */}
      <section className={styles.liveHeroSection}>
        {/* Unified Badge Row: Status Pill, Order Ref & Share Button on One Single Line */}
        <div className={styles.liveHeroBadgesRow}>
          <span className={styles.liveHeroStatusPill}>
            {CLIENT_STAGE_HEADLINES[actualStatus]}
          </span>
          <span className={styles.liveHeroOrderRef}>
            Order #{orderId.slice(0, 4).toUpperCase()}
          </span>
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

        {/* Main Garment Identity */}
        <div className={styles.liveHeroHeader}>
          <span className={styles.liveHeroClientTag}>
            Prepared for {customerName || 'Valued Client'}
          </span>
          <h1 className={styles.liveHeroTitle}>{orderTitle}</h1>
          {styleName && styleName !== orderTitle && (
            <p className={styles.liveHeroStyleSub}>{styleName}</p>
          )}
        </div>

        {/* Typographic Delivery Strip: Pure Flow, No Cards */}
        <div className={styles.liveHeroMetaBar}>
          <div className={styles.liveHeroMetaGroup}>
            <span className={styles.liveHeroMetaLabel}>
              {isDelivered ? 'Delivered' : 'To Be Delivered'}
            </span>
            <span className={styles.liveHeroMetaValue}>
              {isDelivered
                ? formattedCompletedDate || 'Completed'
                : formattedDueDate || 'Scheduled'}
            </span>
          </div>

          {!isDelivered && daysRemainingLabel && (
            <>
              <span className={styles.liveHeroMetaDot} aria-hidden="true">•</span>
              <div className={styles.liveHeroMetaGroup}>
                <span className={styles.liveHeroMetaAccent}>
                  {daysRemainingLabel}
                </span>
              </div>
            </>
          )}
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
    </>
  );
}
