'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import Symbol from '@/components/ui/Symbol/Symbol';
import { fetchStitchWrapAction } from '@/app/actions/wrap';
import type { StitchWrapData } from '@/lib/wrap/types';
import styles from './StitchWrapModal.module.css';

interface StitchWrapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 7;
const SLIDE_DURATION_MS = 6000;

export default function StitchWrapModal({ isOpen, onClose }: StitchWrapModalProps) {
  const [data, setData] = useState<StitchWrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Privacy Toggles
  const [isClientMasked, setIsClientMasked] = useState(true);
  const [isRevenueMasked, setIsRevenueMasked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const storyCardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressStartTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  // Fetch Wrap Data
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    setCurrentSlide(0);
    setProgressPercent(0);

    fetchStitchWrapAction()
      .then((res) => {
        if (res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to load Stitch Wrap.');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error generating Stitch Wrap.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < TOTAL_SLIDES - 1) {
        elapsedBeforePauseRef.current = 0;
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      elapsedBeforePauseRef.current = 0;
      return Math.max(0, prev - 1);
    });
  }, []);

  // Trigger celebratory confetti on Trophy slide
  useEffect(() => {
    if (currentSlide === TOTAL_SLIDES - 1 && isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#10B981', '#6366F1', '#F59E0B', '#ffffff'],
        });
      } catch {
        // confetti fallback
      }
    }
  }, [currentSlide, isOpen]);

  // Slide Progress Animation Timer
  useEffect(() => {
    if (!isOpen || isLoading || !data || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    progressStartTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - progressStartTimeRef.current;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      setProgressPercent(pct);

      if (elapsed >= SLIDE_DURATION_MS) {
        if (currentSlide < TOTAL_SLIDES - 1) {
          elapsedBeforePauseRef.current = 0;
          handleNextSlide();
        } else {
          // Stay on final share slide
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isLoading, data, isPaused, currentSlide, handleNextSlide]);

  // Pause & Resume Handlers
  const handleHoldStart = () => {
    if (isPaused) return;
    elapsedBeforePauseRef.current = Date.now() - progressStartTimeRef.current;
    setIsPaused(true);
  };

  const handleHoldEnd = () => {
    setIsPaused(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        setIsPaused((p) => !p);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextSlide, handlePrevSlide, onClose]);

  // Export & Download High-Resolution Story Card
  const handleDownloadStoryCard = async () => {
    if (!storyCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(storyCardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // Crisp 2.5x retina rendering
      });

      const link = document.createElement('a');
      link.download = `${data?.shopName.toLowerCase().replace(/\s+/g, '-')}-stitch-wrap-2026.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[StitchWrap] Export error:', err);
      alert('Unable to generate image. You can take a screenshot to share on WhatsApp!');
    } finally {
      setIsExporting(false);
    }
  };

  // Native WhatsApp Share
  const handleShareToWhatsApp = () => {
    if (!data) return;
    const clientName = isClientMasked ? data.topClient.maskedName : data.topClient.name;
    const shareText = `✂️ My 2026 Stitch Wrap is here!
Crafted ${data.totalGarments} bespoke garments with ~${data.estimatedFabricYards} yards of fabric chalked.
Top craft: ${data.topGarmentStyle} · Longest streak: ${data.longestStreak} days!
Honored as "${data.archetype.title}" on MyStitchBook. Proud of our craft! 🧵✨`;

    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  const theme = data?.theme;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={storyCardRef}
        className={styles.storyContainer}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
        style={{
          background: theme ? theme.primaryGradient : '#09090b',
        }}
      >
        {/* Subtle Bespoke Background Stitch Texture */}
        <div className={styles.storyBackground} />
        <div className={styles.stitchDashesOverlay} />

        {/* Top Progress Tracks & Header Bar */}
        <div className={styles.topChrome}>
          <div className={styles.progressTrackRow}>
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
              let fillWidth = '0%';
              if (idx < currentSlide) fillWidth = '100%';
              else if (idx === currentSlide) fillWidth = `${progressPercent}%`;

              return (
                <div key={idx} className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: fillWidth,
                      backgroundColor: theme?.accentColor || '#ffffff',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className={styles.headerMetaRow}>
            <div className={styles.shopInfoWrap}>
              <span className={styles.shopNameBadge}>
                {data?.shopName || 'Tailor Workshop'}
              </span>
              {theme && (
                <span className={styles.auraBadge} style={{ borderColor: theme.accentColor }}>
                  {theme.auraTitle}
                </span>
              )}
            </div>

            <div className={styles.headerActionBtns}>
              {/* Privacy Eye Toggle button (Slides 2 & 5) */}
              {(currentSlide === 2 || currentSlide === 5 || currentSlide === 6) && (
                <button
                  type="button"
                  className={styles.iconControlBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentSlide === 2) setIsClientMasked((m) => !m);
                    else if (currentSlide === 5) setIsRevenueMasked((m) => !m);
                    else {
                      setIsClientMasked((m) => !m);
                      setIsRevenueMasked((m) => !m);
                    }
                  }}
                  title="Toggle Privacy on Client & Revenue details"
                  aria-label="Toggle Privacy"
                >
                  <Symbol
                    name={
                      (currentSlide === 2 ? isClientMasked : isRevenueMasked)
                        ? 'visibility_off'
                        : 'visibility'
                    }
                    size={16}
                  />
                </button>
              )}

              <button
                type="button"
                className={styles.iconControlBtn}
                onClick={onClose}
                title="Close Stitch Wrap"
                aria-label="Close"
              >
                <Symbol name="close" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tap Zones for Fast Navigation */}
        <div className={styles.tapZonesWrap}>
          <div
            className={styles.tapZoneLeft}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSlide();
            }}
            title="Previous Slide"
          />
          <div
            className={styles.tapZoneRight}
            onClick={(e) => {
              e.stopPropagation();
              handleNextSlide();
            }}
            title="Next Slide"
          />
        </div>

        {/* Pause Indicator Badge */}
        {isPaused && <div className={styles.pauseNotice}>Story Paused</div>}

        {/* Loading State */}
        {isLoading && (
          <div className={styles.slideCanvas} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Symbol name="needle" size={36} style={{ color: '#f59e0b', animation: 'spin 1.5s linear infinite' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Curating Your 2026 Stitch Wrap...</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Calculating your garment stitches &amp; client milestones.</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className={styles.slideCanvas} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Symbol name="warning" size={36} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Unable to Load Stitch Wrap</span>
              <span style={{ fontSize: '0.82rem', opacity: 0.8 }}>{error}</span>
            </div>
          </div>
        )}

        {/* Main Interactive Slide Content */}
        {!isLoading && !error && data && (
          <div className={styles.slideCanvas}>
            {/* SLIDE 0: JOURNEY & ADAPTIVE TENURE */}
            {currentSlide === 0 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    ✨ {data.isMidYearJoiner ? 'New Workshop Story' : '2026 Annual Retrospective'}
                  </span>
                  <h2 className={styles.slideMainTitle}>
                    {data.isMidYearJoiner
                      ? `You set up your workshop table with us in ${data.joinedDate}.`
                      : '365 days of steady craft and bespoke mastery.'}
                  </h2>
                  <p className={styles.slideSubtitle}>
                    {data.isMidYearJoiner
                      ? `In just ${data.monthsActive} active months, you brought real energy to your tailoring table.`
                      : 'From the first chalk mark of January to the grand December rush, your scissors never rested.'}
                  </p>
                </div>

                <div className={styles.heroNumberBlock}>
                  <span className={styles.heroBigNumber} style={{ color: theme?.accentColor }}>
                    {data.totalGarments}
                  </span>
                  <span className={styles.heroNumberLabel}>Garments Brought to Life</span>
                  <span className={styles.heroDetailSubtext}>
                    {data.isMidYearJoiner
                      ? `That's an impressive average of ${(data.totalGarments / data.monthsActive).toFixed(1)} garments delivered every single month!`
                      : `Averaging ${(data.totalGarments / 12).toFixed(1)} bespoke garments every month across all seasons.`}
                  </span>
                </div>

                <div className={styles.statGridCard}>
                  <span className={styles.statGridLabel}>Craft Tenure</span>
                  <span className={styles.statGridVal}>Joined {data.joinedDate}</span>
                  <span className={styles.statGridSub}>
                    {data.isMidYearJoiner
                      ? 'Already hitting the velocity of seasoned master workshops!'
                      : 'Full year of dedicated craft excellence.'}
                  </span>
                </div>
              </div>
            )}

            {/* SLIDE 1: GARMENTS & CUTTING OUTPUT */}
            {currentSlide === 1 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    ✂️ Craft Output &amp; Yardage
                  </span>
                  <h2 className={styles.slideMainTitle}>The fabric on your cutting table spoke volumes.</h2>
                  <p className={styles.slideSubtitle}>
                    Every bespoke piece required precise measurement, fabric chalking, and expert seam assembly.
                  </p>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Total Garments</span>
                    <span className={styles.statGridVal} style={{ color: theme?.accentColor }}>
                      {data.totalGarments}
                    </span>
                    <span className={styles.statGridSub}>Delivered on time</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Fabric Cut</span>
                    <span className={styles.statGridVal}>~{data.estimatedFabricYards} yds</span>
                    <span className={styles.statGridSub}>Cloth transformed</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Fittings Logged</span>
                    <span className={styles.statGridVal}>{data.totalFittings}</span>
                    <span className={styles.statGridSub}>Basting &amp; precision adjustments</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>On-Time Rate</span>
                    <span className={styles.statGridVal} style={{ color: '#10b981' }}>
                      {data.onTimeDeliveryRate}%
                    </span>
                    <span className={styles.statGridSub}>Client promises honored</span>
                  </div>
                </div>

                <div className={styles.statGridCard}>
                  <span className={styles.statGridLabel}>Tailor Craft Fact</span>
                  <span className={styles.statGridSub} style={{ fontSize: '0.82rem', color: '#ffffff' }}>
                    {data.estimatedFabricYards > 50
                      ? `Your ${data.estimatedFabricYards} yards of cut fabric could stretch across an entire Olympic football pitch!`
                      : 'Every single yard was cut with dedicated artisan care and attention to detail.'}
                  </span>
                </div>
              </div>
            )}

            {/* SLIDE 2: CLIENT CIRCLE & VIP PATRON (WITH PRIVACY TOGGLE) */}
            {currentSlide === 2 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    👥 Client Relationships
                  </span>
                  <h2 className={styles.slideMainTitle}>
                    You dressed {data.totalClients} unique clients this year.
                  </h2>
                  <p className={styles.slideSubtitle}>
                    {data.newClientsThisYear} new clients trusted your workshop for the very first time.
                  </p>
                </div>

                {/* VIP Client Card */}
                <div className={styles.vipCard}>
                  <div className={styles.vipCardHeader}>
                    <span className={styles.vipBadge}>⭐ Patron of the Year</span>
                    <button
                      type="button"
                      className={styles.vipMaskToggleBtn}
                      onClick={() => setIsClientMasked((m) => !m)}
                      title="Mask client name for private sharing"
                    >
                      <Symbol name={isClientMasked ? 'visibility_off' : 'visibility'} size={12} />
                      <span>{isClientMasked ? 'Name Masked' : 'Name Revealed'}</span>
                    </button>
                  </div>

                  <div className={styles.vipClientName}>
                    {isClientMasked ? data.topClient.maskedName : data.topClient.name}
                  </div>

                  <div className={styles.vipClientStats}>
                    <span>✂️ {data.topClient.garmentCount} Bespoke Garments</span>
                    {data.topClient.totalSpent > 0 && !isRevenueMasked && (
                      <span>💎 ₦{data.topClient.totalSpent.toLocaleString()}</span>
                    )}
                  </div>

                  <p className={styles.vipQuote}>
                    &ldquo;Your biggest champion of 2026. Kept returning to your cutting table for your signature touch.&rdquo;
                  </p>
                </div>

                <div className={styles.statGridCard}>
                  <span className={styles.statGridLabel}>Word-of-Mouth Momentum</span>
                  <span className={styles.statGridSub} style={{ fontSize: '0.82rem', color: '#ffffff' }}>
                    {data.newClientsThisYear > 5
                      ? `A healthy ${Math.round((data.newClientsThisYear / data.totalClients) * 100)}% of your clients were new introductions—your reputation is spreading!`
                      : 'Strong repeat patronage keeping your sewing machines humming.'}
                  </span>
                </div>
              </div>
            )}

            {/* SLIDE 3: SIGNATURE STYLE & RUSH MONTH */}
            {currentSlide === 3 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    👑 Signature Craft
                  </span>
                  <h2 className={styles.slideMainTitle}>What defined your scissors in 2026?</h2>
                  <p className={styles.slideSubtitle}>
                    Every tailor workshop develops a distinct identity that clients seek out.
                  </p>
                </div>

                <div className={styles.heroNumberBlock}>
                  <Symbol name="workspace_premium" size={44} style={{ color: theme?.accentColor }} />
                  <span
                    className={styles.heroNumberLabel}
                    style={{ fontSize: '1.6rem', color: theme?.accentColor, marginTop: 6 }}
                  >
                    {data.topGarmentStyle}
                  </span>
                  <span className={styles.heroDetailSubtext}>
                    Your most commissioned bespoke design of the entire year!
                  </span>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Busiest Month</span>
                    <span className={styles.statGridVal}>{data.busiestMonth.name}</span>
                    <span className={styles.statGridSub}>{data.busiestMonth.garmentCount} pieces finished</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Avg Turnaround</span>
                    <span className={styles.statGridVal}>{data.averageTurnaroundDays} Days</span>
                    <span className={styles.statGridSub}>Tape intake to packaging</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 4: RESILIENCE & STREAKS */}
            {currentSlide === 4 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    🔥 Workshop Resilience
                  </span>
                  <h2 className={styles.slideMainTitle}>Mastery is forged through daily consistency.</h2>
                  <p className={styles.slideSubtitle}>
                    Showing up at your cutting table every day, rain or shine.
                  </p>
                </div>

                <div className={styles.heroNumberBlock}>
                  <span className={styles.heroBigNumber} style={{ color: '#f97316' }}>
                    {data.longestStreak}
                  </span>
                  <span className={styles.heroNumberLabel}>Day Unbroken Craft Streak</span>
                  <span className={styles.heroDetailSubtext}>
                    Your longest stretch of consecutive craft without dropping the needle!
                  </span>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Active Table Days</span>
                    <span className={styles.statGridVal}>{data.totalActiveDays} Days</span>
                    <span className={styles.statGridSub}>Work logged this year</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Circle Accountability</span>
                    <span className={styles.statGridVal}>
                      {data.circlePartnerName ? 'Active Pod' : 'Independent'}
                    </span>
                    <span className={styles.statGridSub}>
                      {data.circlePartnerName
                        ? `Paired with ${data.circlePartnerName}`
                        : 'Solo craft resilience'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 5: BUSINESS MILESTONES (WITH PRIVACY TOGGLE) */}
            {currentSlide === 5 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    💼 Business Turnover
                  </span>
                  <h2 className={styles.slideMainTitle}>Your craft rewarded your dedication.</h2>
                  <p className={styles.slideSubtitle}>
                    Turning raw fabrics into sustainable business growth.
                  </p>
                </div>

                <div className={styles.vipCard}>
                  <div className={styles.vipCardHeader}>
                    <span className={styles.vipBadge}>💰 Annual Turnover</span>
                    <button
                      type="button"
                      className={styles.vipMaskToggleBtn}
                      onClick={() => setIsRevenueMasked((m) => !m)}
                      title="Hide or show revenue figure"
                    >
                      <Symbol name={isRevenueMasked ? 'visibility_off' : 'visibility'} size={12} />
                      <span>{isRevenueMasked ? 'Figure Masked' : 'Figure Visible'}</span>
                    </button>
                  </div>

                  <div className={styles.vipClientName} style={{ color: '#10b981' }}>
                    {isRevenueMasked ? '₦ •••••••••••' : `₦${data.totalRevenue.toLocaleString()}`}
                  </div>

                  <p className={styles.vipQuote}>
                    {isRevenueMasked
                      ? 'Financial privacy shield enabled. Perfect for sharing your craft milestones publicly without disclosing bank figures.'
                      : 'Total value of garments commissioned and recorded on your workshop table.'}
                  </p>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Average / Garment</span>
                    <span className={styles.statGridVal}>
                      {isRevenueMasked
                        ? '₦ •••'
                        : `₦${Math.round(data.totalRevenue / data.totalGarments).toLocaleString()}`}
                    </span>
                    <span className={styles.statGridSub}>Bespoke craft value</span>
                  </div>

                  <div className={styles.statGridCard}>
                    <span className={styles.statGridLabel}>Deposit Health</span>
                    <span className={styles.statGridVal} style={{ color: '#10b981' }}>
                      100% Tracked
                    </span>
                    <span className={styles.statGridSub}>Zero lost balances</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 6: TAILOR PERSONA TROPHY & VIRAL SHARE CARD */}
            {currentSlide === 6 && (
              <div className={styles.slideInteractiveContent}>
                <div className={styles.slideHeaderBlock}>
                  <span
                    className={styles.storyPillTag}
                    style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                  >
                    🏆 2026 Tailor Trophy
                  </span>
                </div>

                <div className={styles.archetypeContainer}>
                  <div
                    className={styles.archetypeIconRing}
                    style={{
                      background: theme?.accentGlow,
                      borderColor: theme?.accentColor,
                    }}
                  >
                    <Symbol name={data.archetype.badgeIcon} size={38} style={{ color: '#ffffff' }} />
                  </div>

                  <h3 className={styles.archetypeTitle}>{data.archetype.title}</h3>
                  <span className={styles.archetypeSubtitle} style={{ color: theme?.accentColor }}>
                    {data.archetype.subtitle}
                  </span>
                  <p className={styles.archetypeDescription}>{data.archetype.description}</p>
                </div>

                <div className={styles.bottomActionRow}>
                  <button
                    type="button"
                    className={styles.whatsappShareBtn}
                    onClick={handleShareToWhatsApp}
                  >
                    <Symbol name="share" size={16} />
                    <span>Share to WhatsApp Status</span>
                  </button>

                  <button
                    type="button"
                    className={styles.downloadCardBtn}
                    onClick={handleDownloadStoryCard}
                    disabled={isExporting}
                  >
                    <Symbol name="download" size={16} />
                    <span>{isExporting ? 'Generating Retina Card...' : 'Download Story Card (PNG)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
