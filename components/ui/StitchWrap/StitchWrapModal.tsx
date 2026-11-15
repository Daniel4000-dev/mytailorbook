'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import Symbol from '@/components/ui/Symbol/Symbol';
import { fetchStitchWrapAction } from '@/app/actions/wrap';
import type { StitchWrapData } from '@/lib/wrap/types';
import { wrapAudio, type AudioTrackId } from '@/lib/wrap/audioEngine';
import { exportStitchWrapVideo } from '@/lib/wrap/videoExporter';
import styles from './StitchWrapModal.module.css';

interface StitchWrapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 7;
const SLIDE_DURATION_MS = 6500;

/**
 * High-performance 60fps kinetic number ticker.
 * Eases from 0 up to target value with easeOutExpo curve.
 */
function AnimatedCounter({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const startTime = performance.now();
    let animationFrame: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutExpo curve
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(update);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </>
  );
}

export default function StitchWrapModal({ isOpen, onClose }: StitchWrapModalProps) {
  const [data, setData] = useState<StitchWrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Audio System
  const [selectedTrack, setSelectedTrack] = useState<AudioTrackId>('lagos_amapiano');
  const [customTrackName, setCustomTrackName] = useState<string | null>(null);
  const [isSoundDrawerOpen, setIsSoundDrawerOpen] = useState(false);
  const [eqHeights, setEqHeights] = useState<number[]>([4, 8, 12, 6]);

  // Video Export System
  const [isVideoExporting, setIsVideoExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');

  // Privacy Toggles
  const [isClientMasked, setIsClientMasked] = useState(true);
  const [isRevenueMasked, setIsRevenueMasked] = useState(false);
  const [isCardExporting, setIsCardExporting] = useState(false);

  const storyCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressStartTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

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
          // Start Audio Engine
          wrapAudio.setTrack('lagos_amapiano').catch(() => {});
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

    return () => {
      wrapAudio.stop();
    };
  }, [isOpen]);

  // Real-time Audio Visualizer Equalizer Loop
  useEffect(() => {
    if (!isOpen) return;

    const updateBars = () => {
      const freqData = wrapAudio.getAnalyserData();
      if (selectedTrack !== 'mute' && freqData.length >= 4) {
        setEqHeights([
          Math.max(3, (freqData[1] / 255) * 14),
          Math.max(4, (freqData[3] / 255) * 16),
          Math.max(3, (freqData[5] / 255) * 14),
          Math.max(2, (freqData[7] / 255) * 12),
        ]);
      } else {
        setEqHeights([3, 3, 3, 3]);
      }
      animFrameRef.current = requestAnimationFrame(updateBars);
    };

    animFrameRef.current = requestAnimationFrame(updateBars);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, selectedTrack]);

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

  // Celebratory Confetti on Trophy Slide
  useEffect(() => {
    if (currentSlide === TOTAL_SLIDES - 1 && isOpen) {
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#D4AF37', '#10B981', '#6366F1', '#F59E0B', '#38BDF8', '#ffffff'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [currentSlide, isOpen]);

  // Story Progress Timer
  useEffect(() => {
    if (!isOpen || isLoading || !data || isPaused || isVideoExporting) {
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
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isLoading, data, isPaused, isVideoExporting, currentSlide, handleNextSlide]);

  // Hold to Pause / Release to Resume
  const handleHoldStart = () => {
    if (isPaused || isVideoExporting) return;
    elapsedBeforePauseRef.current = Date.now() - progressStartTimeRef.current;
    setIsPaused(true);
  };

  const handleHoldEnd = () => {
    setIsPaused(false);
  };

  // Sound Track Selection
  const handleSelectTrack = async (track: AudioTrackId) => {
    setSelectedTrack(track);
    if (track === 'custom') {
      fileInputRef.current?.click();
    } else {
      await wrapAudio.setTrack(track);
      setIsSoundDrawerOpen(false);
    }
  };

  // Custom File Selection
  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomTrackName(file.name);
      setSelectedTrack('custom');
      await wrapAudio.setTrack('custom', file);
      setIsSoundDrawerOpen(false);
    }
  };

  // 1-Click Video Export (9:16 vertical video reel with real photos)
  const handleExportVideoReel = async () => {
    if (!data) return;
    setIsPaused(true);
    setIsVideoExporting(true);
    setExportProgress(0);
    setExportStatusText('Preparing 9:16 high-fashion video canvas...');

    try {
      const audioTrack = wrapAudio.getAudioStreamTrack();
      const result = await exportStitchWrapVideo({
        data,
        audioTrack,
        isClientMasked,
        isRevenueMasked,
        onProgress: (pct, status) => {
          setExportProgress(pct);
          setExportStatusText(status);
        },
      });

      // Trigger automatic download
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.click();

      // Native Mobile Share to WhatsApp Status if supported
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([result.blob], result.filename, { type: result.blob.type });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My 2026 Stitch Wrap',
              text: `✂️ Check out my 2026 Stitch Wrap! Crafted ${data.totalGarments} bespoke garments with ~${data.estimatedFabricYards} yards cut. Awarded "${data.archetype.title}" on MyStitchBook!`,
            });
          } catch {
            // Share canceled or dismissed
          }
        }
      }
    } catch (err) {
      console.error('[StitchWrap] Video export error:', err);
      alert('Video export could not be completed in this browser. You can download the Story Card (PNG) instead!');
    } finally {
      setIsVideoExporting(false);
      setIsPaused(false);
    }
  };

  // Download Story Card as crisp PNG
  const handleDownloadStoryCard = async () => {
    if (!storyCardRef.current || !data) return;
    setIsCardExporting(true);
    try {
      const dataUrl = await toPng(storyCardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });

      const link = document.createElement('a');
      link.download = `${data.shopName.toLowerCase().replace(/\s+/g, '-')}-stitch-wrap-2026.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[StitchWrap] Card export error:', err);
      alert('Unable to generate image directly. You can take a screenshot to share on WhatsApp!');
    } finally {
      setIsCardExporting(false);
    }
  };

  // Share to WhatsApp Status
  const handleShareToWhatsApp = () => {
    if (!data) return;
    const shareText = `✂️ My 2026 Stitch Wrap is here!
Crafted ${data.totalGarments} bespoke garments with ~${data.estimatedFabricYards} yards of fabric chalked.
Top craft: ${data.topGarmentStyle} · Longest streak: ${data.longestStreak} days!
Awarded "${data.archetype.title}" on MyStitchBook. Proud of our craft! 🧵✨`;

    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  const theme = data?.theme;
  const photos = data?.featuredGarmentPhotos;

  // Determine which background garment photo to display for the current slide
  let activeSlidePhoto = photos?.heroStylePhoto;
  if (currentSlide === 1) activeSlidePhoto = photos?.fabricDetailPhoto;
  else if (currentSlide === 2) activeSlidePhoto = photos?.patronFitPhoto;
  else if (currentSlide === 3) activeSlidePhoto = photos?.heroStylePhoto;
  else if (currentSlide === 4) activeSlidePhoto = photos?.celebrationPhoto;
  else if (currentSlide === 5) activeSlidePhoto = photos?.fabricDetailPhoto;
  else if (currentSlide === 6) activeSlidePhoto = photos?.heroStylePhoto;

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
        {/* Hidden Audio Upload Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleCustomAudioUpload}
        />

        {/* Full-Bleed Editorial Garment Photo Background Stage */}
        {activeSlidePhoto && (
          <div className={styles.photoBackdropStage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSlidePhoto}
              alt="Bespoke Garment Craft"
              className={styles.photoBackdropImg}
            />
            <div className={styles.photoVignetteOverlay} />
          </div>
        )}

        {/* Fashion Textures: Ankara Geometry & Tailor White Chalk Markings */}
        <div className={styles.ankaraTextureOverlay} />
        <div className={styles.chalkMeasurementLines} />
        <div className={styles.chalkCornerTicks}>[CHALK: 42° LAGOS BESPOKE]</div>

        {/* Dynamic Motion Aurora Stage */}
        <div className={styles.auroraStage}>
          <div
            className={styles.auroraBlob1}
            style={{ background: theme?.blobColor1 || 'rgba(16, 185, 129, 0.45)' }}
          />
          <div
            className={styles.auroraBlob2}
            style={{ background: theme?.blobColor2 || 'rgba(245, 158, 11, 0.35)' }}
          />
          <div
            className={styles.auroraBlob3}
            style={{ background: theme?.blobColor3 || 'rgba(99, 102, 241, 0.35)' }}
          />
          <div className={styles.laserSweepLine} />
        </div>

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
              <div className={styles.shopLogoIcon}>
                <Symbol name="needle" size={13} style={{ color: theme?.accentColor || '#ffffff' }} />
              </div>
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
              {/* Audio Equalizer & Track Selector */}
              <button
                type="button"
                className={styles.eqControlBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSoundDrawerOpen(true);
                }}
                title="Select Soundtrack or Upload Song"
                aria-label="Soundtrack Selector"
              >
                <div className={styles.equalizerBars}>
                  {eqHeights.map((h, i) => (
                    <div
                      key={i}
                      className={styles.eqBar}
                      style={{
                        height: h,
                        backgroundColor: theme?.accentColor || '#ffffff',
                      }}
                    />
                  ))}
                </div>
                <Symbol name="music_note" size={14} />
              </button>

              {/* Privacy Eye Toggle button (Slides 2, 5 & 6) */}
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
                    size={15}
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
                <Symbol name="close" size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Tap Zones for Quick Slide Navigation */}
        <div className={styles.tapZonesWrap}>
          <div
            className={styles.tapZoneLeft}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSlide();
            }}
            title="Tap Left: Previous Slide"
          />
          <div
            className={styles.tapZoneRight}
            onClick={(e) => {
              e.stopPropagation();
              handleNextSlide();
            }}
            title="Tap Right: Next Slide"
          />
        </div>

        {/* Floating Pause Indicator Pill */}
        {isPaused && !isSoundDrawerOpen && !isVideoExporting && (
          <div className={styles.pauseNotice}>
            <Symbol name="pause" size={12} />
            <span>Story Paused</span>
          </div>
        )}

        {/* Sound Track Selector Drawer */}
        {isSoundDrawerOpen && (
          <div
            className={styles.soundDrawerOverlay}
            onClick={(e) => {
              e.stopPropagation();
              setIsSoundDrawerOpen(false);
            }}
          >
            <div className={styles.soundDrawer} onClick={(e) => e.stopPropagation()}>
              <div className={styles.soundDrawerHeader}>
                <span className={styles.soundDrawerTitle}>Choose Story Soundtrack</span>
                <button
                  type="button"
                  className={styles.iconControlBtn}
                  onClick={() => setIsSoundDrawerOpen(false)}
                >
                  <Symbol name="close" size={14} />
                </button>
              </div>

              <div className={styles.soundTrackList}>
                <div
                  className={`${styles.soundTrackItem} ${
                    selectedTrack === 'lagos_amapiano' ? styles.soundTrackItemActive : ''
                  }`}
                  onClick={() => handleSelectTrack('lagos_amapiano')}
                >
                  <div className={styles.soundTrackInfo}>
                    <span className={styles.soundTrackName}>🥁 Lagos Amapiano Groove</span>
                    <span className={styles.soundTrackDesc}>Heavy synthesized log drums, 808 sub-bass &amp; shakers (114 BPM)</span>
                  </div>
                  {selectedTrack === 'lagos_amapiano' && <Symbol name="check" size={16} />}
                </div>

                <div
                  className={`${styles.soundTrackItem} ${
                    selectedTrack === 'afro_fusion' ? styles.soundTrackItemActive : ''
                  }`}
                  onClick={() => handleSelectTrack('afro_fusion')}
                >
                  <div className={styles.soundTrackInfo}>
                    <span className={styles.soundTrackName}>🎷 Afro-Fusion Runway</span>
                    <span className={styles.soundTrackDesc}>High-fashion Afrobeat brass, syncopated clave &amp; percussion (120 BPM)</span>
                  </div>
                  {selectedTrack === 'afro_fusion' && <Symbol name="check" size={16} />}
                </div>

                <div
                  className={`${styles.soundTrackItem} ${
                    selectedTrack === 'custom' ? styles.soundTrackItemActive : ''
                  }`}
                  onClick={() => handleSelectTrack('custom')}
                >
                  <div className={styles.soundTrackInfo}>
                    <span className={styles.soundTrackName}>📁 Pick Any Song From My Phone</span>
                    <span className={styles.soundTrackDesc}>
                      {customTrackName ? `Loaded: ${customTrackName}` : 'Select your favorite trending MP3/audio (Zero copyright liability)'}
                    </span>
                  </div>
                  <Symbol name="folder_open" size={16} />
                </div>

                <div
                  className={`${styles.soundTrackItem} ${
                    selectedTrack === 'mute' ? styles.soundTrackItemActive : ''
                  }`}
                  onClick={() => handleSelectTrack('mute')}
                >
                  <div className={styles.soundTrackInfo}>
                    <span className={styles.soundTrackName}>🔇 Mute Soundtrack</span>
                    <span className={styles.soundTrackDesc}>Silent visual story</span>
                  </div>
                  {selectedTrack === 'mute' && <Symbol name="check" size={16} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Exporting Modal Overlay */}
        {isVideoExporting && (
          <div className={styles.videoExportOverlay}>
            <Symbol name="movie" size={44} style={{ color: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
              Rendering Your 9:16 Video Reel
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', maxWidth: 280 }}>
              {exportStatusText}
            </p>
            <div className={styles.videoExportProgressBar}>
              <div
                className={styles.videoExportProgressFill}
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#f59e0b' }}>
              {exportProgress}% COMPLETE
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className={styles.slideCanvas} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Symbol name="needle" size={42} style={{ color: '#f59e0b', animation: 'spin 1.5s linear infinite' }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>Curating Your 2026 Stitch Wrap...</span>
              <span style={{ fontSize: '0.84rem', opacity: 0.8 }}>Matching your garment photos &amp; craft milestones.</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className={styles.slideCanvas} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Symbol name="warning" size={38} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '1.15rem', fontWeight: 900 }}>Unable to Load Stitch Wrap</span>
              <span style={{ fontSize: '0.82rem', opacity: 0.8 }}>{error}</span>
            </div>
          </div>
        )}

        {/* Kinetic Animated Story Slide Body */}
        {!isLoading && !error && data && (
          <div className={styles.slideCanvas}>
            <AnimatePresence mode="wait">
              {/* SLIDE 0: JOURNEY & ADAPTIVE TENURE */}
              {currentSlide === 0 && (
                <motion.div
                  key="slide-0"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        ✨ {data.isMidYearJoiner ? 'New Workshop Story' : '2026 Retrospective'}
                      </span>
                      <span className={styles.garmentCareMiniTag}>
                        {data.isMidYearJoiner ? 'OCT 2026 COHORT' : 'VETERAN RUN'}
                      </span>
                    </div>
                    <h2 className={styles.slideMainTitle}>
                      {data.isMidYearJoiner
                        ? `You set up your workshop table in ${data.joinedDate}.`
                        : '365 days of steady craft and bespoke mastery.'}
                    </h2>
                    <p className={styles.slideSubtitle}>
                      {data.isMidYearJoiner
                        ? `In just ${data.monthsActive} active months, you brought serious runway energy to your cutting table.`
                        : 'From your first chalk mark of January to the grand December rush, your scissors never rested.'}
                    </p>
                  </div>

                  <div className={styles.heroNumberStage}>
                    <div className={styles.heroIconHalo}>
                      <Symbol name="straighten" size={34} style={{ color: theme?.accentColor }} />
                    </div>
                    <span className={styles.editorialBigCounter} style={{ color: theme?.accentColor }}>
                      <AnimatedCounter value={data.totalGarments} />
                    </span>
                    <span className={styles.heroNumberLabel}>Garments Brought to Life</span>
                    <span className={styles.heroDetailSubtext}>
                      {data.isMidYearJoiner
                        ? `An impressive velocity of ${(data.totalGarments / (data.monthsActive || 1)).toFixed(1)} bespoke garments delivered every month!`
                        : `Averaging ${(data.totalGarments / 12).toFixed(1)} completed fits every month across all wedding and celebration seasons.`}
                    </span>
                  </div>

                  <div className={styles.statGlassCard}>
                    <span className={styles.statGlassLabel}>Workshop Velocity</span>
                    <span className={styles.statGlassVal}>Joined {data.joinedDate}</span>
                    <span className={styles.statGlassSub}>
                      {data.isMidYearJoiner
                        ? 'Already matching the pace of seasoned master workshops!'
                        : 'Full year of dedicated bespoke excellence.'}
                    </span>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 1: GARMENTS & FABRIC YARDAGE */}
              {currentSlide === 1 && (
                <motion.div
                  key="slide-1"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        ✂️ Fabric Mileage
                      </span>
                      <span className={styles.garmentCareMiniTag}>100% PURE CRAFT</span>
                    </div>
                    <h2 className={styles.slideMainTitle}>The cloth on your cutting table spoke volumes.</h2>
                    <p className={styles.slideSubtitle}>
                      Every bespoke piece required exact body measurements, chalking, and seam assembly.
                    </p>
                  </div>

                  {/* Photo Framing Window: Fabric & Embroidery Detail */}
                  {photos?.fabricDetailPhoto && (
                    <div className={styles.garmentPhotoCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos.fabricDetailPhoto}
                        alt="Bespoke Fabric Detail"
                        className={styles.garmentPhotoImg}
                      />
                      <span className={styles.photoTagBadge}>CHALK // SILK &amp; BROCADE</span>
                    </div>
                  )}

                  <div className={styles.statsGrid}>
                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Total Garments</span>
                      <span className={styles.statGlassVal} style={{ color: theme?.accentColor }}>
                        <AnimatedCounter value={data.totalGarments} />
                      </span>
                      <span className={styles.statGlassSub}>Delivered to clients</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Fabric Cut</span>
                      <span className={styles.statGlassVal}>
                        ~<AnimatedCounter value={data.estimatedFabricYards} /> yds
                      </span>
                      <span className={styles.statGlassSub}>Cloth transformed</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Fittings Logged</span>
                      <span className={styles.statGlassVal}>
                        <AnimatedCounter value={data.totalFittings} />
                      </span>
                      <span className={styles.statGlassSub}>Precision adjustments</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>On-Time Rate</span>
                      <span className={styles.statGlassVal} style={{ color: '#10b981' }}>
                        <AnimatedCounter value={data.onTimeDeliveryRate} suffix="%" />
                      </span>
                      <span className={styles.statGlassSub}>Promises honored</span>
                    </div>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 2: CLIENT CIRCLE & VIP PATRON */}
              {currentSlide === 2 && (
                <motion.div
                  key="slide-2"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        👥 Inner Circle
                      </span>
                      <span className={styles.garmentCareMiniTag}>CONFIDENTIAL VIP</span>
                    </div>
                    <h2 className={styles.slideMainTitle}>
                      You dressed <AnimatedCounter value={data.totalClients} /> unique clients this year.
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
                        title="Mask or reveal client name"
                      >
                        <Symbol name={isClientMasked ? 'visibility_off' : 'visibility'} size={13} />
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

                  <div className={styles.statGlassCard}>
                    <span className={styles.statGlassLabel}>Word-of-Mouth Momentum</span>
                    <span className={styles.statGlassSub} style={{ fontSize: '0.84rem', color: '#ffffff' }}>
                      {data.newClientsThisYear > 4
                        ? `A healthy ${Math.round((data.newClientsThisYear / data.totalClients) * 100)}% of your clients were new introductions—your reputation is spreading!`
                        : 'Strong repeat patronage keeping your sewing machines humming.'}
                    </span>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 3: SIGNATURE STYLE & RUSH MONTH */}
              {currentSlide === 3 && (
                <motion.div
                  key="slide-3"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        👑 Signature Crown
                      </span>
                      <span className={styles.garmentCareMiniTag}>RUNWAY RANK #1</span>
                    </div>
                    <h2 className={styles.slideMainTitle}>What defined your scissors in 2026?</h2>
                    <p className={styles.slideSubtitle}>
                      Every tailor workshop develops a distinct identity that clients seek out.
                    </p>
                  </div>

                  {/* Photo Framing Window: Hero Runway Piece */}
                  {photos?.heroStylePhoto && (
                    <div className={styles.garmentPhotoCard} style={{ height: 180 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos.heroStylePhoto}
                        alt="Bespoke Runway Fit"
                        className={styles.garmentPhotoImg}
                      />
                      <span className={styles.photoTagBadge}>EDITORIAL // {data.topGarmentStyle.toUpperCase()}</span>
                    </div>
                  )}

                  <div className={styles.statsGrid}>
                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Busiest Month</span>
                      <span className={styles.statGlassVal}>{data.busiestMonth.name}</span>
                      <span className={styles.statGlassSub}>{data.busiestMonth.garmentCount} pieces finished</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Avg Turnaround</span>
                      <span className={styles.statGlassVal}>
                        <AnimatedCounter value={data.averageTurnaroundDays} suffix=" Days" />
                      </span>
                      <span className={styles.statGlassSub}>Tape intake to packaging</span>
                    </div>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 4: RESILIENCE & CRAFT STREAKS */}
              {currentSlide === 4 && (
                <motion.div
                  key="slide-4"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        🔥 Table Resilience
                      </span>
                      <span className={styles.garmentCareMiniTag}>DAILY DISCIPLINE</span>
                    </div>
                    <h2 className={styles.slideMainTitle}>Mastery is forged through daily consistency.</h2>
                    <p className={styles.slideSubtitle}>
                      Showing up at your cutting table every day, rain or shine.
                    </p>
                  </div>

                  <div className={styles.heroNumberStage}>
                    <div className={styles.heroIconHalo} style={{ borderColor: '#f97316' }}>
                      <Symbol name="local_fire_department" size={38} style={{ color: '#f97316' }} />
                    </div>
                    <span className={styles.editorialBigCounter} style={{ color: '#f97316' }}>
                      <AnimatedCounter value={data.longestStreak} />
                    </span>
                    <span className={styles.heroNumberLabel}>Day Unbroken Craft Streak</span>
                    <span className={styles.heroDetailSubtext}>
                      Your longest stretch of consecutive craft without dropping the needle!
                    </span>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Active Table Days</span>
                      <span className={styles.statGlassVal}>
                        <AnimatedCounter value={data.totalActiveDays} suffix=" Days" />
                      </span>
                      <span className={styles.statGlassSub}>Work logged this year</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Circle Pod</span>
                      <span className={styles.statGlassVal}>
                        {data.circlePartnerName ? 'Active Pod' : 'Independent'}
                      </span>
                      <span className={styles.statGlassSub}>
                        {data.circlePartnerName
                          ? `Paired with ${data.circlePartnerName}`
                          : 'Solo craft resilience'}
                      </span>
                    </div>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 5: BUSINESS MILESTONES */}
              {currentSlide === 5 && (
                <motion.div
                  key="slide-5"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        💼 Annual Commerce
                      </span>
                      <span className={styles.garmentCareMiniTag}>100% SECURE</span>
                    </div>
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
                        <Symbol name={isRevenueMasked ? 'visibility_off' : 'visibility'} size={13} />
                        <span>{isRevenueMasked ? 'Figure Masked' : 'Figure Visible'}</span>
                      </button>
                    </div>

                    <div className={styles.vipClientName} style={{ color: '#10b981', fontSize: '1.9rem' }}>
                      {isRevenueMasked ? (
                        '₦ •••••••••••'
                      ) : (
                        <AnimatedCounter value={data.totalRevenue} prefix="₦" />
                      )}
                    </div>

                    <p className={styles.vipQuote}>
                      {isRevenueMasked
                        ? 'Financial privacy shield enabled. Perfect for sharing your craft milestones publicly without disclosing bank figures.'
                        : 'Total value of garments commissioned and recorded on your workshop table.'}
                    </p>
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Average / Garment</span>
                      <span className={styles.statGlassVal}>
                        {isRevenueMasked ? (
                          '₦ •••'
                        ) : (
                          <AnimatedCounter
                            value={Math.round(data.totalRevenue / data.totalGarments)}
                            prefix="₦"
                          />
                        )}
                      </span>
                      <span className={styles.statGlassSub}>Bespoke craft value</span>
                    </div>

                    <div className={styles.statGlassCard}>
                      <span className={styles.statGlassLabel}>Deposit Health</span>
                      <span className={styles.statGlassVal} style={{ color: '#10b981' }}>
                        100% Tracked
                      </span>
                      <span className={styles.statGlassSub}>Zero lost balances</span>
                    </div>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 6: TROPHY & VIRAL SHARE CARD */}
              {currentSlide === 6 && (
                <motion.div
                  key="slide-6"
                  className={styles.slideMotionFrame}
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.slideHeaderBlock}>
                    <div className={styles.headerTopMeta}>
                      <span
                        className={styles.storyPillTag}
                        style={{ background: theme?.tagBackground, color: theme?.accentColor }}
                      >
                        🏆 2026 Tailor Trophy
                      </span>
                      <span className={styles.garmentCareMiniTag}>OFFICIAL HONOUR</span>
                    </div>
                  </div>

                  <div className={styles.archetypeContainer}>
                    <div
                      className={styles.archetypeIconHalo}
                      style={{
                        background: theme?.accentGlow,
                        borderColor: theme?.accentColor,
                      }}
                    >
                      <Symbol name={data.archetype.badgeIcon} size={42} style={{ color: '#ffffff' }} />
                    </div>

                    <h3 className={styles.archetypeTitle}>{data.archetype.title}</h3>
                    <span className={styles.archetypeSubtitle} style={{ color: theme?.accentColor }}>
                      {data.archetype.subtitle}
                    </span>
                    <p className={styles.archetypeDescription}>{data.archetype.description}</p>
                  </div>

                  <div className={styles.bottomActionRow}>
                    {/* 1-Tap Video Export */}
                    <button
                      type="button"
                      className={styles.exportVideoBtn}
                      onClick={handleExportVideoReel}
                      disabled={isVideoExporting}
                    >
                      <Symbol name="movie" size={17} />
                      <span>{isVideoExporting ? 'Generating Video...' : 'Export Video Reel (9:16 MP4)'}</span>
                    </button>

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
                      disabled={isCardExporting}
                    >
                      <Symbol name="download" size={16} />
                      <span>{isCardExporting ? 'Generating Retina Card...' : 'Download Story Card (PNG)'}</span>
                    </button>
                  </div>

                  {/* Watermark Footer on Every Slide */}
                  <div className={styles.cardWatermarkFooter}>
                    <div className={styles.watermarkBrandLogo}>
                      <Symbol name="needle" size={11} style={{ color: theme?.accentColor || '#f59e0b' }} />
                      <span>MYTAILORBOOK</span>
                    </div>
                    <span>2026 CRAFT TELEMETRY // {data.shopName.toUpperCase()}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
