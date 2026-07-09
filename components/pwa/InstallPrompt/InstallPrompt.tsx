'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaXmark, FaShareFromSquare, FaSquarePlus, FaDownload } from 'react-icons/fa6';
import styles from './InstallPrompt.module.css';

const DISMISS_KEY = 'mtb_install_prompt_dismissed_at';
const RESHOW_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SHOW_DELAY_MS = 1800;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissedRecently(): boolean {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < RESHOW_AFTER_MS;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Real mobile devices only (per product decision) — desktop Chrome can also
 *  technically install PWAs, but the install UX here is tailored specifically
 *  to a phone home screen, not a desktop app shelf. */
function detectMobilePlatform(): 'ios' | 'android' | null {
  const ua = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  return null;
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const detected = detectMobilePlatform();
    if (!detected) return;
    setPlatform(detected);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS has no install event to wait for — show on a short delay regardless.
    // Android shows only once the browser confirms installability via the event,
    // UNLESS it never fires in time (some Chrome versions delay it), so we also
    // reveal on a timer there and simply skip the native prompt() step if the
    // event never arrived (falling back to manual instructions).
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
      setVisible(false);
    }
  }, [deferredPrompt]);

  if (!platform || !visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Install MyTailorBook">
      <button type="button" className={styles.closeBtn} onClick={dismiss} aria-label="Dismiss">
        <FaXmark />
      </button>

      <div className={styles.iconWrapper}>
        <img src="/images/sewing-machine.svg" alt="" className={styles.appIcon} />
      </div>

      <div className={styles.textWrapper}>
        <span className={styles.title}>Install MyTailorBook</span>
        {platform === 'android' ? (
          <span className={styles.subtitle}>Add it to your home screen for the full app experience.</span>
        ) : (
          <span className={styles.subtitle}>
            Tap <FaShareFromSquare className={styles.inlineIcon} /> Share, then{' '}
            <FaSquarePlus className={styles.inlineIcon} /> &ldquo;Add to Home Screen&rdquo;.
          </span>
        )}
      </div>

      {platform === 'android' && deferredPrompt && (
        <button type="button" className={styles.installBtn} onClick={handleInstallClick} disabled={installing}>
          <FaDownload />
          {installing ? 'Installing…' : 'Install'}
        </button>
      )}
    </div>
  );
}
