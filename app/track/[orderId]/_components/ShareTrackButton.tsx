'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if native file sharing is supported on this browser/device
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

  // Handle escape key to dismiss modal
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

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Best effort clipboard
    }
  };

  const handleShareStoryImage = async () => {
    if (!cardRef.current || isCapturing) return;
    setIsCapturing(true);
    setDownloadNotice(false);

    const shareTitle = `Tracking: ${orderTitle} at ${shopName}`;
    const shareText = `Watch the craftsmanship journey of this bespoke garment live at ${shopName}:`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#0c1017',
        cacheBust: true,
      });

      if (!blob) throw new Error('Could not render story image');

      const fileName = `${safeShopName}-Order-${orderShortCode}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // If device supports file sharing (iOS Safari, Android Chrome share sheet)
      if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
            files: [file],
          });
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
          // Fall through to file download
        }
      }

      // Fallback for desktop or browsers without file-share: direct download
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);

      setDownloadNotice(true);
      setTimeout(() => setDownloadNotice(false), 3000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Resilient fallback: share URL via web share or clipboard
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
        } catch {
          await handleCopyLink();
        }
      } else {
        await handleCopyLink();
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        className={styles.shareBtn}
        onClick={() => setIsOpen(true)}
        aria-label="Share tracking progress card"
      >
        <Symbol name="share" size={15} />
        <span>Share</span>
      </button>

      {/* Share Progress Card Modal */}
      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderInfo}>
                <h3 className={styles.modalTitle}>Share Progress Card</h3>
                <p className={styles.modalSubtitle}>High-resolution story card for Instagram, WhatsApp & X</p>
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
                  {/* Card Atelier Header */}
                  <div className={styles.cardTopBar}>
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
                        <span className={styles.cardAtelierSub}>Bespoke Atelier</span>
                      </div>
                    </div>
                    <div className={styles.cardLiveBadge}>
                      <span className={styles.cardLiveDot} />
                      <span>Live Track</span>
                    </div>
                  </div>

                  {/* Garment Identification */}
                  <div className={styles.cardGarmentBlock}>
                    <div className={styles.cardOrderCode}>Order #{orderShortCode}</div>
                    <h4 className={styles.cardGarmentTitle}>{orderTitle}</h4>
                    <p className={styles.cardClientLabel}>
                      {customerFirstName ? `Handcrafted for ${customerFirstName}` : 'Handcrafted Bespoke Piece'}
                    </p>
                  </div>

                  {/* Centerpiece Image Showcase */}
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

                  {/* Milestone Progress Pill */}
                  <div className={styles.cardMilestoneCapsule}>
                    <div className={styles.cardMilestoneIcon}>
                      <Symbol name={STAGE_ICON_MAP[status] || 'verified'} size={15} />
                    </div>
                    <div className={styles.cardMilestoneInfo}>
                      <span className={styles.cardMilestoneHeadline}>{stageHeadline}</span>
                      <span className={styles.cardMilestoneDate}>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Card Luxury Footer */}
                  <div className={styles.cardFooter}>
                    <div className={styles.cardFooterBrand}>
                      <Symbol name="auto_awesome" size={13} className={styles.cardFooterIcon} />
                      <span>Live Craftsmanship Journey</span>
                    </div>
                    <span className={styles.cardFooterWatermark}>MyTailorBook</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                        ? 'Share Story Card'
                        : 'Save Story Card Image'}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.secondaryActionBtn}
                  onClick={handleCopyLink}
                >
                  <Symbol name={copiedLink ? 'check' : 'content_copy'} size={16} />
                  <span>{copiedLink ? 'Tracking Link Copied' : 'Copy Tracking Link'}</span>
                </button>

                {downloadNotice && (
                  <p className={styles.downloadNotice}>
                    <Symbol name="check_circle" size={14} />
                    <span>Story card image saved to your device</span>
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
