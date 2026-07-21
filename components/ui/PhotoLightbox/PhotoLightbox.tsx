'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './PhotoLightbox.module.css';

interface PhotoLightboxProps {
  /** The open photo's url, or null when closed. */
  src: string | null;
  /** The clicked thumbnail's on-screen rect at the moment it was opened —
   *  the lightbox grows from here to fullscreen, and shrinks back to it
   *  on close, instead of just fading in/out in place. */
  originRect: DOMRect | null;
  alt?: string;
  onClose: () => void;
}

const TRANSITION_MS = 320; // matches the spring transition in PhotoLightbox.module.css

/** Full-screen photo viewer with a shared-element-style expand/shrink
 *  transition: opens by growing from the thumbnail's own position/size to
 *  fill the screen, and reverses the same way on close, rather than a plain
 *  fade. Portaled to document.body so its fixed positioning can never be
 *  hijacked by a transformed/animated ancestor (see the page-transition
 *  wrapper fix — same class of bug). */
export default function PhotoLightbox({ src, originRect, alt = '', onClose }: PhotoLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const [renderedSrc, setRenderedSrc] = useState<string | null>(null);
  const [renderedRect, setRenderedRect] = useState<DOMRect | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (src && originRect) {
      setRenderedSrc(src);
      setRenderedRect(originRect);
      setPhase('opening');
      // Two rAFs: the first commits the thumbnail-position starting frame,
      // the second flips to the fullscreen target — guaranteeing the browser
      // actually paints the start state before the transition begins.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setPhase('open'));
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
    if (!src) {
      setPhase((p) => (p === 'closed' ? p : 'closing'));
      const t = setTimeout(() => {
        setPhase('closed');
        setRenderedSrc(null);
        setRenderedRect(null);
      }, TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [src, originRect]);

  useEffect(() => {
    if (phase === 'closed') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  if (!mounted || phase === 'closed' || !renderedSrc || !renderedRect) return null;

  const isOpen = phase === 'open';
  const frameStyle: CSSProperties = isOpen
    ? { top: 0, left: 0, width: '100vw', height: '100dvh', borderRadius: 0 }
    : {
        top: renderedRect.top,
        left: renderedRect.left,
        width: renderedRect.width,
        height: renderedRect.height,
        borderRadius: 'var(--sf-radius-md)',
      };

  return createPortal(
    <div className={styles.overlay} style={{ opacity: isOpen ? 1 : 0 }} onClick={onClose}>
      <div className={styles.frame} style={frameStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={renderedSrc}
          alt={alt}
          className={styles.img}
          style={{ objectFit: isOpen ? 'contain' : 'cover' }}
        />
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
        aria-label="Close photo"
      >
        <Symbol name="close" size={24} />
      </button>
    </div>,
    document.body
  );
}
