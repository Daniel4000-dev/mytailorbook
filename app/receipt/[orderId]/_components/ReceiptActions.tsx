'use client';

import { useState } from 'react';

import styles from './ReceiptActions.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

interface ReceiptActionsProps {
  fileName: string;
}

/** Renders the actual on-screen #receipt-card DOM node to a PNG via
 *  html-to-image — this is what both "Share as Image" and "Share as PDF"
 *  build from, so the shared file always matches exactly what the tailor
 *  sees on screen, not a separately-maintained layout.
 *
 *  Exception: theme. The card is captured with whatever data-theme is
 *  active on the sender's phone at that instant — if that's dark, the
 *  shared file permanently bakes in a dark card, while the canvas
 *  `backgroundColor` below still forces plain white, leaving a
 *  mismatched white sliver around the rounded corners. A shared
 *  receipt has no "app theme" once it leaves the phone (same reasoning
 *  as the @media print override in page.module.css) so capture always
 *  forces the canonical light/paper look, then restores whatever the
 *  tailor actually had set. */
async function captureReceiptPng(): Promise<Blob> {
  const node = document.getElementById('receipt-card');
  if (!node) throw new Error('Receipt not found');
  const root = document.documentElement;
  const priorTheme = root.getAttribute('data-theme');
  root.setAttribute('data-theme', 'light');
  try {
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
    if (!blob) throw new Error('Could not render receipt');
    return blob;
  } finally {
    if (priorTheme) root.setAttribute('data-theme', priorTheme);
    else root.removeAttribute('data-theme');
  }
}

/** Shares a file via the native share sheet when available (mobile), or
 *  falls back to a direct browser download (desktop, or any browser
 *  without file-sharing support) — either way the user ends up with the
 *  file, just via whichever mechanism their device actually supports. */
async function shareOrDownload(file: File, downloadName: string) {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Fall through to download if sharing failed for a non-cancel reason.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReceiptActions({ fileName }: ReceiptActionsProps) {
  const [busy, setBusy] = useState<'image' | 'pdf' | null>(null);

  const handleShareImage = async () => {
    setBusy('image');
    try {
      const blob = await captureReceiptPng();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      await shareOrDownload(file, `${fileName}.png`);
    } catch {
      // Rendering the receipt is best-effort — a failure here shouldn't
      // block the tailor from still printing or trying again.
    } finally {
      setBusy(null);
    }
  };

  const handleSharePdf = async () => {
    setBusy('pdf');
    try {
      const blob = await captureReceiptPng();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const { jsPDF } = await import('jspdf');
      // Points, sized to the receipt's own pixel aspect ratio at 72dpi
      // (rather than fitting it onto a fixed A4/Letter page) so the PDF
      // is exactly the receipt, not the receipt awkwardly centered on a
      // mostly-blank page.
      const pdf = new jsPDF({
        orientation: img.height > img.width ? 'portrait' : 'landscape',
        unit: 'pt',
        format: [img.width / 2, img.height / 2],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
      await shareOrDownload(file, `${fileName}.pdf`);
    } catch {
      // Same best-effort reasoning as the image path.
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`${styles.actions} noPrint`}>
      <button type="button" className={styles.actionBtn} onClick={handleShareImage} disabled={busy !== null}>
        <Symbol name="image" /> {busy === 'image' && <Symbol name="progress_activity" className="global-spinner" />} Image
      </button>
      <button type="button" className={styles.actionBtn} onClick={handleSharePdf} disabled={busy !== null}>
        <Symbol name="picture_as_pdf" /> {busy === 'pdf' && <Symbol name="progress_activity" className="global-spinner" />} PDF
      </button>
      <button type="button" className={styles.printBtn} onClick={() => window.print()} disabled={busy !== null}>
        <Symbol name="print" /> Print
      </button>
    </div>
  );
}
