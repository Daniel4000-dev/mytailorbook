'use client';

import React from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import { triggerHaptic } from '@/lib/haptics';
import styles from './VoiceTapeHUD.module.css';

interface VoiceTapeHUDProps {
  isListening: boolean;
  onToggleListening: () => void;
  lastCapture: { label: string; value: string; key: string } | null;
  onUndoLastCapture: () => void;
  activePoint?: { key: string; label: string; value: string } | null;
  onNudgeActive?: (delta: number) => void;
  onNextActive?: () => void;
  isSupported?: boolean;
}

export default function VoiceTapeHUD({
  isListening,
  onToggleListening,
  lastCapture,
  onUndoLastCapture,
  activePoint,
  onNudgeActive,
  onNextActive,
  isSupported = true,
}: VoiceTapeHUDProps) {
  const handleNudge = (delta: number) => {
    triggerHaptic('light');
    onNudgeActive?.(delta);
  };

  const handleNext = () => {
    triggerHaptic('medium');
    onNextActive?.();
  };

  return (
    <div className={styles.hudWrap}>
      {/* ── 1. Voice Tape Header Bar ── */}
      <div className={`${styles.voiceBar} ${isListening ? styles.voiceBarListening : ''}`}>
        <div className={styles.voiceLeft}>
          <button
            type="button"
            className={`${styles.micBtn} ${isListening ? styles.micBtnActive : ''}`}
            onClick={() => {
              triggerHaptic('medium');
              onToggleListening();
            }}
            title={isListening ? 'Stop Voice Tape' : 'Start Voice Tape Dictation'}
            aria-label={isListening ? 'Stop Voice Tape' : 'Start Voice Tape Dictation'}
          >
            <Symbol name={isListening ? 'mic' : 'mic_none'} size={18} />
          </button>

          <div className={styles.voiceInfo}>
            <span className={styles.voiceTitle}>
              {isListening ? '🎙️ Voice Tape Active' : 'Hands-Free Voice Tape'}
            </span>
            <span className={styles.voiceSub}>
              {isListening
                ? 'Speak e.g. "Chest 42, Lap 26 and half"'
                : isSupported
                  ? 'Tap to speak measurements while holding tape'
                  : 'Voice not supported on this browser (use dial)'}
            </span>
          </div>
        </div>

        {lastCapture && (
          <div className={styles.voiceCapturePill}>
            <span>
              {lastCapture.label}: {lastCapture.value}″
            </span>
            <button
              type="button"
              className={styles.undoBtn}
              onClick={() => {
                triggerHaptic('selection');
                onUndoLastCapture();
              }}
              title="Undo last recorded measurement"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {/* ── 2. One-Thumb Stepper Bar (Active when tailor focuses a field) ── */}
      {activePoint && onNudgeActive && (
        <div className={styles.thumbStepperBar}>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => handleNudge(-1)}
            aria-label="Decrease by 1 inch"
          >
            -1
          </button>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => handleNudge(-0.5)}
            aria-label="Decrease by half inch"
          >
            -½
          </button>

          <div className={styles.stepperCenter}>
            <span className={styles.stepperLabel}>{activePoint.label}</span>
            <span className={styles.stepperValue}>{activePoint.value || '0.0'}″</span>
          </div>

          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => handleNudge(0.5)}
            aria-label="Increase by half inch"
          >
            +½
          </button>
          <button
            type="button"
            className={styles.stepperBtn}
            onClick={() => handleNudge(1)}
            aria-label="Increase by 1 inch"
          >
            +1
          </button>

          {onNextActive && (
            <button
              type="button"
              className={styles.stepperNextBtn}
              onClick={handleNext}
              aria-label="Next measurement point"
            >
              <span>Next</span>
              <Symbol name="arrow_forward" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

