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

const SHORT_LABELS: Record<OrderStatus, string> = {
  Documented: 'Confirmed',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Delivered: 'Delivered',
};

const STAGE_ICONS: Record<OrderStatus, string> = {
  Documented: 'verified',
  Cutting: 'content_cut',
  Sewing: 'apparel',
  Ready: 'checkroom',
  Delivered: 'check_circle',
};

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
  const targetStepIndex = isDelivered
    ? PRODUCTION_STAGES.length - 1
    : Math.max(0, PRODUCTION_STAGES.indexOf(actualStatus));

  const [displayIndex, setDisplayIndex] = useState<number>(targetStepIndex);
  const [transitionBanner, setTransitionBanner] = useState<{
    from: OrderStatus;
    to: OrderStatus;
  } | null>(null);
  const [isAnimatingAdvance, setIsAnimatingAdvance] = useState(false);
  const [heroLightbox, setHeroLightbox] = useState<{ src: string; rect: DOMRect } | null>(null);

  // Live Story Replay: If the customer last visited when the order was at an earlier stage,
  // start from that exact stage and animate forward step-by-step to the new current stage.
  useEffect(() => {
    if (isDelivered || typeof window === 'undefined') return;
    const storageKey = `mtb_last_seen_stage_${orderId}`;
    let savedIndex: number | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed < PRODUCTION_STAGES.length) {
          savedIndex = parsed;
        }
      }
      localStorage.setItem(storageKey, String(targetStepIndex));
    } catch {
      // ignore storage errors
    }

    if (savedIndex !== null && savedIndex < targetStepIndex) {
      const fromStage = PRODUCTION_STAGES[savedIndex];
      const toStage = PRODUCTION_STAGES[targetStepIndex];
      setDisplayIndex(savedIndex);
      setIsAnimatingAdvance(true);
      setTransitionBanner({ from: fromStage, to: toStage });

      const timers: ReturnType<typeof setTimeout>[] = [];
      let stepCursor = savedIndex;

      const stepForward = () => {
        stepCursor += 1;
        setDisplayIndex(stepCursor);
        if (stepCursor < targetStepIndex) {
          timers.push(setTimeout(stepForward, 700));
        } else {
          timers.push(
            setTimeout(() => {
              setIsAnimatingAdvance(false);
            }, 900)
          );
        }
      };

      timers.push(setTimeout(stepForward, 650));
      return () => timers.forEach(clearTimeout);
    }
  }, [orderId, targetStepIndex, isDelivered]);

  const activeStageStatus = isDelivered
    ? 'Delivered'
    : PRODUCTION_STAGES[displayIndex] || actualStatus;
  const heroVisualUrl = latestPhotoUrl || outfitReferenceUrl;

  return (
    <>
      {/* ── 1. Clean Apple-Inspired Live Activity Hero Card ── */}
      <section className={styles.liveHeroCard}>
        {/* Animated Story Catch-Up Pill when stage has advanced since customer's last visit */}
        {transitionBanner && (
          <div className={styles.storyCatchupBanner} role="status" aria-live="polite">
            <div className={styles.storyCatchupPulse}>
              <Symbol name="auto_awesome" size={14} />
            </div>
            <span className={styles.storyCatchupText}>
              Moved from <strong>{CLIENT_STAGE_HEADLINES[transitionBanner.from]}</strong> to{' '}
              <strong>{CLIENT_STAGE_HEADLINES[transitionBanner.to]}</strong> since your last visit
            </span>
          </div>
        )}

        <div className={styles.liveHeroTopBar}>
          <div className={styles.liveHeroBadges}>
            <span className={styles.liveHeroStatusPill}>
              <span className={styles.liveHeroPulseDot} />
              <span>{CLIENT_STAGE_HEADLINES[activeStageStatus]}</span>
            </span>
            <span className={styles.liveHeroOrderRef}>
              #{orderId.slice(0, 4).toUpperCase()}
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
            <div className={styles.liveHeroMetaRow}>
              {styleName && styleName !== orderTitle && (
                <span className={styles.liveHeroMetaChip}>
                  <Symbol name="checkroom" size={13} />
                  <span>{styleName}</span>
                </span>
              )}
              {dueDate && !isDelivered && (
                <span className={styles.liveHeroMetaChip}>
                  <Symbol name="event" size={13} />
                  <span>
                    Ready by{' '}
                    {new Date(dueDate).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              )}
              {daysRemainingLabel && !isDelivered && (
                <span className={styles.liveHeroMetaHighlight}>{daysRemainingLabel}</span>
              )}
              {!daysRemainingLabel && specsCount > 0 && !isDelivered && (
                <span className={styles.liveHeroMetaChip}>
                  <Symbol name="straighten" size={13} />
                  <span>{specsCount} Fit Measurements</span>
                </span>
              )}
            </div>
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
                width={160}
                height={160}
                className={styles.liveHeroMediaImg}
              />
              <span className={styles.liveHeroMediaTag}>
                {latestPhotoUrl ? 'Latest' : 'Outfit'}
              </span>
            </button>
          ) : (
            <div className={styles.liveHeroSilhouetteFrame} aria-hidden="true">
              <Symbol name="checkroom" size={28} />
              <span>Custom Fit</span>
            </div>
          )}
        </div>

        {/* Animated 4-Stage Apple Live Activity Progress Stepper */}
        <div className={styles.liveStepperWrap}>
          <div className={styles.liveStepperTrack}>
            <div
              className={styles.liveStepperFill}
              style={{
                width: isDelivered
                  ? '100%'
                  : `${(displayIndex / (PRODUCTION_STAGES.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className={styles.liveStepperNodes}>
            {PRODUCTION_STAGES.map((stage, idx) => {
              const isDone = isDelivered || idx < displayIndex;
              const isNow = !isDelivered && idx === displayIndex;
              return (
                <div
                  key={stage}
                  className={`${styles.liveStepItem} ${
                    isDone ? styles.liveStepDone : isNow ? styles.liveStepNow : ''
                  }`}
                >
                  <div
                    className={`${styles.liveStepDot} ${
                      isNow && isAnimatingAdvance ? styles.liveStepDotMorph : ''
                    }`}
                  >
                    <Symbol
                      name={isDone ? 'check' : STAGE_ICONS[stage]}
                      size={13}
                    />
                  </div>
                  <span className={styles.liveStepLabel}>{SHORT_LABELS[stage]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. Craftsmanship Timeline (Synced with Live Story Replay) ── */}
      {!isDelivered && (
        <section className={styles.timeline}>
          <div className={styles.timelineRail} aria-hidden="true" />
          {stages.map((stageItem, index) => {
            const isCompleted = index < displayIndex;
            const isCurrent = index === displayIndex;
            const isPending = index > displayIndex;

            return (
              <TimelineStage
                key={stageItem.status}
                status={stageItem.status}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isPending={isPending}
                isJustAdvanced={isCurrent && isAnimatingAdvance}
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

