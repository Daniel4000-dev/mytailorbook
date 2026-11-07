'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { APP_CONFIG } from '@/lib/config';
import type { OrderStatus } from '@/lib/types';
import styles from './ShareTrackButton.module.css';

interface ShareTrackButtonProps {
  orderId: string;
  orderTitle: string;
  shopName?: string;
  shopLogoUrl?: string | null;
  customerName?: string;
  stageHeadline: string;
  status: OrderStatus;
  photoUrl?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  isDelivered?: boolean;
}

const STAGE_ICON_MAP: Record<OrderStatus, string> = {
  Documented: 'verified',
  Cutting: 'content_cut',
  Sewing: 'apparel',
  Ready: 'checkroom',
  Delivered: 'check_circle',
};

export default function ShareTrackButton({
  orderId,
  orderTitle,
  shopName = 'Bespoke Atelier',
  shopLogoUrl,
  customerName,
  stageHeadline,
  status,
  photoUrl,
  dueDate,
  completedDate,
  isDelivered = false,
}: ShareTrackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if native file sharing is supported on this device (iOS Safari, Android Chrome, etc.)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      try {
        const testFile = new File([''], 'test.png', { type: 'image/png' });
        setCanShareFiles(navigator.canShare({ files: [testFile] }));
      } catch {
        setCanShareFiles(false);
      }
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('no-scroll');
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.documentElement.classList.remove('no-scroll');
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  const customerFirstName = customerName ? customerName.trim().split(' ')[0] : null;
  const orderShortCode = orderId.slice(0, 4).toUpperCase();
  const safeShopName = shopName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const formattedDate = isDelivered && completedDate
    ? `Completed • ${new Date(completedDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : dueDate
      ? `Target • ${new Date(dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'In Craftsmanship';

  /** Renders the story card DOM node into an ultra-sharp PNG Blob */
  const generateCardBlob = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error('Card not found');
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(cardRef.current, {
      pixelRatio: 2.5,
      backgroundColor: '#0c1017',
      cacheBust: true,
    });
    if (!blob) throw new Error('Could not render story image');
    return blob;
  };

  /** Trigger direct image download without network navigation */
  const downloadBlob = (blob: Blob) => {
    const fileName = `${safeShopName}-Order-${orderShortCode}.png`;
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    setDownloadNotice(true);
    setTimeout(() => setDownloadNotice(false), 3000);
  };

  /** Primary Action: Share image directly to Instagram Stories / WhatsApp Status / X */
  const handleShareStoryImage = async () => {
    if (!cardRef.current || isCapturing) return;
    setIsCapturing(true);
    setDownloadNotice(false);

    try {
      const blob = await generateCardBlob();
      const fileName = `${safeShopName}-Order-${orderShortCode}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // If mobile supports native file sharing (no server link attached to preserve bandwidth and privacy)
      if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Bespoke Craftsmanship at ${shopName}`,
            text: `Crafted at ${shopName} • Powered by ${APP_CONFIG.name}`,
            files: [file],
          });
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
        }
      }

      // Fallback for desktop or non-file share: direct download
      downloadBlob(blob);
    } catch {
      // Quiet failover
    } finally {
      setIsCapturing(false);
    }
  };

  /** Secondary Action: Save image directly to camera roll / downloads */
  const handleDownloadOnly = async () => {
    if (!cardRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const blob = await generateCardBlob();
      downloadBlob(blob);
    } catch {
      // Quiet failover
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      {/* Trigger Button on Tracking Page */}
      <button
        type="button"
        className={styles.shareBtn}
        onClick={() => setIsOpen(true)}
        aria-label="Share progress card image"
      >
        <Symbol name="share" size={15} />
        <span>Share Image</span>
      </button>

      {/* Share Progress Card Modal */}
      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderInfo}>
                <h3 className={styles.modalTitle}>Share Progress Card</h3>
                <p className={styles.modalSubtitle}>Story-ready card for WhatsApp Status, Instagram & X</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsOpen(false)}
                aria-label="Close share dialog"
              >
                <Symbol name="close" size={18} />
              </button>
            </div>

            {/* Modal Body with Story Card Preview */}
            <div className={styles.modalBody}>
              <div className={styles.cardPreviewWrapper}>
                {/* Captured Story Card Node */}
                <div ref={cardRef} className={styles.storyCard}>
                  {/* Co-Branded Top Eyebrow Bar: MyStitchBook discovery header */}
                  <div className={styles.cardEyebrowBar}>
                    <div className={styles.cardEyebrowLive}>
                      <span className={styles.cardLiveDot} />
                      <span>LIVE CRAFT JOURNEY</span>
                    </div>
                    <div className={styles.cardEyebrowBrand}>
                      <Symbol name="auto_awesome" size={11} className={styles.cardBrandSparkle} />
                      <span>Powered by {APP_CONFIG.name}</span>
                    </div>
                  </div>

                  {/* Atelier Header: Dominant focus celebrating the Tailor */}
                  <div className={styles.cardAtelierRow}>
                    <div className={styles.cardAtelierBlock}>
                      {shopLogoUrl ? (
                        <div className={styles.cardLogoWrap}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shopLogoUrl}
                            alt={shopName}
                            className={styles.cardLogo}
                            crossOrigin="anonymous"
                          />
                        </div>
                      ) : (
                        <div className={styles.cardMonogram}>
                          {shopName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={styles.cardAtelierText}>
                        <span className={styles.cardAtelierName}>{shopName}</span>
                        <span className={styles.cardAtelierBadge}>Bespoke Atelier</span>
                      </div>
                    </div>

                    <div className={styles.cardOrderCode}>
                      #{orderShortCode}
                    </div>
                  </div>

                  {/* Centerpiece Image Frame */}
                  <div className={styles.cardVisualFrame}>
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={orderTitle}
                        className={styles.cardPhoto}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className={styles.cardArtPlaceholder}>
                        <div className={styles.cardArtIconWrap}>
                          <Symbol name={STAGE_ICON_MAP[status] || 'apparel'} size={38} className={styles.cardArtIcon} />
                        </div>
                        <span className={styles.cardArtTitle}>{stageHeadline}</span>
                        <span className={styles.cardArtSub}>Craftsmanship in progress</span>
                      </div>
                    )}
                  </div>

                  {/* Garment Identification */}
                  <div className={styles.cardGarmentBlock}>
                    <h4 className={styles.cardGarmentTitle}>{orderTitle}</h4>
                    <p className={styles.cardClientLabel}>
                      {customerFirstName ? `Handcrafted for ${customerFirstName}` : 'Handcrafted Bespoke Piece'}
                    </p>
                  </div>

                  {/* Milestone Progress Capsule */}
                  <div className={styles.cardMilestoneCapsule}>
                    <div className={styles.cardMilestoneIcon}>
                      <Symbol name={STAGE_ICON_MAP[status] || 'verified'} size={15} />
                    </div>
                    <div className={styles.cardMilestoneInfo}>
                      <span className={styles.cardMilestoneHeadline}>{stageHeadline}</span>
                      <span className={styles.cardMilestoneDate}>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Card Luxury Footer: Balances Atelier credit and Platform URL */}
                  <div className={styles.cardFooter}>
                    <span className={styles.cardFooterShop}>Crafted at {shopName}</span>
                    <span className={styles.cardFooterBrandLink}>{APP_CONFIG.domain}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Pure Image Share & Download (No server link spam) */}
              <div className={styles.actionGroup}>
                <button
                  type="button"
                  className={styles.primaryActionBtn}
                  onClick={handleShareStoryImage}
                  disabled={isCapturing}
                >
                  <Symbol name={canShareFiles ? 'ios_share' : 'download'} size={18} />
                  <span>
                    {isCapturing
                      ? 'Generating Story Card...'
                      : canShareFiles
                        ? 'Share Story Image'
                        : 'Save Story Image'}
                  </span>
                </button>

                {canShareFiles && (
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={handleDownloadOnly}
                    disabled={isCapturing}
                  >
                    <Symbol name="download" size={16} />
                    <span>Download to Camera Roll</span>
                  </button>
                )}

                {downloadNotice && (
                  <p className={styles.downloadNotice}>
                    <Symbol name="check_circle" size={14} />
                    <span>Story card saved to your device</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
