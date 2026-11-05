'use client';

import { useState } from 'react';
import styles from './MeasurementAnatomy.module.css';

interface MeasurementPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  /** When set, this measurement spans two landmarks (e.g. nipple to nipple)
   *  rather than a single spot — (x,y) and (endX,endY) are drawn as a
   *  connecting line, with the tap target at their midpoint. A single dot
   *  can't communicate "from here to there," so these get a line instead. */
  endX?: number;
  endY?: number;
  /** Override for where the tap target sits — the anatomically correct line
   *  sometimes has its true geometric midpoint on top of an unrelated point
   *  (e.g. a nipple-to-nipple line crosses right through the Bust point at
   *  its center); this nudges just the clickable marker/label clear of it
   *  without moving the line itself. */
  midX?: number;
  midY?: number;
}

// Note: every point below must have a unique (x, y) — two points sharing the
// same spot means one silently sits on top of the other, making the covered
// one invisible and unclickable in the visual view (still editable via Quick
// List, which is why a value could be entered but never seen here).
export const FEMALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
  { id: 'neck', name: 'Neck', x: 50, y: 19 },
  { id: 'shoulder', name: 'Shoulder', x: 34, y: 24 },
  { id: 'crossFront', name: 'Across Front', x: 50, y: 28 },
  { id: 'crossBack', name: 'Across Back', x: 58, y: 28 },
  { id: 'bust', name: 'Bust', x: 50, y: 34 },
  { id: 'underBust', name: 'Under Bust', x: 50, y: 39 },
  { id: 'waist', name: 'Waist', x: 50, y: 45 },
  { id: 'hips', name: 'Hips', x: 50, y: 58 },
  { id: 'armhole', name: 'Armhole', x: 35, y: 29 },
  { id: 'bicep', name: 'Bicep', x: 33, y: 34 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: 25, y: 50 },
  { id: 'wrist', name: 'Wrist', x: 21, y: 66 },
  { id: 'napeToWaist', name: 'Nape to Waist', x: 58, y: 45 },
  { id: 'frontLength', name: 'Front Length', x: 50, y: 65 },
  { id: 'dressLength', name: 'Dress Length', x: 50, y: 75 },
  { id: 'gownLength', name: 'Gown Length', x: 50, y: 92 },
  { id: 'trouserLength', name: 'Trouser Length', x: 37, y: 90 },
  { id: 'thigh', name: 'Thigh', x: 42, y: 68 },
  { id: 'knee', name: 'Knee', x: 42, y: 78 },
  { id: 'calf', name: 'Calf', x: 42, y: 87 },
  { id: 'ankle', name: 'Ankle', x: 42, y: 96 },
  { id: 'inseam', name: 'Inseam', x: 47.5, y: 79 },
  { id: 'outseam', name: 'Outseam', x: 36.5, y: 77 },
  { id: 'crotch', name: 'Crotch', x: 44, y: 63 },
  { id: 'halfLength', name: 'Half Length', x: 30, y: 72 },
  // Spans — two landmarks connected by a line, not a single spot. Some
  // need a `mid` override: their true geometric midpoint would otherwise
  // land exactly on an unrelated point (see the field comment above).
  { id: 'shoulderToBustPoint', name: 'Shoulder to Bust Point', x: 37, y: 24, endX: 43, endY: 34, midX: 44, midY: 25 },
  { id: 'nippleToNipple', name: 'Nipple to Nipple', x: 43, y: 34, endX: 57, endY: 34, midX: 44, midY: 31 },
  { id: 'shoulderToWaist', name: 'Shoulder to Waist', x: 64, y: 24, endX: 63, endY: 45, midX: 70, midY: 34 },
  { id: 'shoulderToHips', name: 'Shoulder to Hips', x: 64, y: 24, endX: 66, endY: 58, midX: 72, midY: 45 },
];

export const MALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
  { id: 'neck', name: 'Neck', x: 50, y: 19 },
  { id: 'shoulder', name: 'Shoulder', x: 31, y: 23 },
  { id: 'crossFront', name: 'Across Front', x: 50, y: 28 },
  { id: 'crossBack', name: 'Across Back', x: 58, y: 28 },
  { id: 'chest', name: 'Chest', x: 50, y: 33 },
  { id: 'stomach', name: 'Stomach', x: 50, y: 42 },
  { id: 'waist', name: 'Waist', x: 50, y: 48 },
  { id: 'hips', name: 'Hips', x: 50, y: 58 },
  { id: 'crotch', name: 'Crotch', x: 50, y: 63 },
  { id: 'armhole', name: 'Armhole', x: 31, y: 28.5 },
  { id: 'bicep', name: 'Bicep', x: 29, y: 34 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: 22, y: 50 },
  { id: 'wrist', name: 'Wrist', x: 19, y: 65 },
  { id: 'backLength', name: 'Back Length', x: 58, y: 48 },
  { id: 'shirtLength', name: 'Shirt Length', x: 58, y: 60 },
  { id: 'trouserLength', name: 'Trouser Length', x: 37, y: 90 },
  { id: 'thigh', name: 'Thigh', x: 43, y: 70 },
  { id: 'knee', name: 'Knee', x: 42, y: 78 },
  { id: 'calf', name: 'Calf', x: 42, y: 87 },
  { id: 'ankle', name: 'Ankle', x: 42, y: 96 },
  { id: 'inseam', name: 'Inseam', x: 47.5, y: 79.5 },
  { id: 'outseam', name: 'Outseam', x: 37.5, y: 77 },
];

interface MeasurementAnatomyProps {
  gender: 'male' | 'female';
  measurements: Record<string, string>;
  selectedPointId?: string;
  onPointSelect: (point: MeasurementPoint) => void;
  onValueChange?: (pointId: string, value: string) => void;
  onValueBlur?: (pointId: string, value: string) => void;
}

export default function MeasurementAnatomy({
  gender,
  measurements,
  selectedPointId,
  onPointSelect,
  onValueChange,
  onValueBlur,
}: MeasurementAnatomyProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('list');
  const points = gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;
  
  const filledCount = Object.keys(measurements).length;
  const totalCount = points.length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Measurements</h3>
        <span className={styles.counter}>
          {filledCount}/{totalCount} saved
        </span>
      </div>

      <div className={styles.viewModeTabs}>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${viewMode === 'visual' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('visual')}
        >
          Body View
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className={styles.listView}>
          {points.map((point, i) => (
            <div key={point.id} className={styles.listRow}>
              <label htmlFor={point.id} className={styles.listLabel}>{point.name}</label>
              <input
                id={point.id}
                type="text"
                inputMode="decimal"
                enterKeyHint={i < points.length - 1 ? 'next' : 'done'}
                className={styles.listInput}
                placeholder="--"
                value={measurements[point.id] || ''}
                onChange={(e) => onValueChange?.(point.id, e.target.value)}
                onBlur={(e) => onValueBlur?.(point.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextPoint = points[i + 1];
                    if (nextPoint) {
                      document.getElementById(nextPoint.id)?.focus();
                    } else {
                      (e.target as HTMLInputElement).blur();
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className={styles.visualHint}>
            Tap any point on the body to enter or update measurements
          </p>
          <div className={styles.anatomyContainer}>
            <div className={styles.anatomyInner}>
              {gender === 'female' ? <FemaleTailorForm /> : <MaleTailorForm />}

            {/* Span lines — drawn first so the point markers sit on top */}
            <svg viewBox="0 0 100 100" className={styles.spanSvg} preserveAspectRatio="xMidYMid meet">
              {points
                .filter((p) => p.endX !== undefined && p.endY !== undefined)
                .map((p) => (
                  <line
                    key={`${p.id}-span`}
                    x1={p.x}
                    y1={p.y}
                    x2={p.endX}
                    y2={p.endY}
                    className={`${styles.spanLine} ${measurements[p.id] ? styles.spanLineFilled : ''}`}
                  />
                ))}
            </svg>

            {/* Interactive measurement points */}
            {points.map((point) => {
              const hasMeasurement = !!measurements[point.id];
              const isSelected = selectedPointId === point.id;
              const isSpan = point.endX !== undefined && point.endY !== undefined;
              const tapX = point.midX ?? (isSpan ? (point.x + point.endX!) / 2 : point.x);
              const tapY = point.midY ?? (isSpan ? (point.y + point.endY!) / 2 : point.y);

              return (
                <button
                  key={point.id}
                  className={`${styles.point} ${hasMeasurement ? styles.filled : ''} ${isSelected ? styles.selected : ''} ${isSpan ? styles.spanPoint : ''}`}
                  style={{ left: `${tapX}%`, top: `${tapY}%` }}
                  onClick={() => onPointSelect(point)}
                  aria-label={`${point.name}${hasMeasurement ? `: ${measurements[point.id]}` : ''}`}
                >
                  <span className={styles.pointDot} />
                  <span className={styles.pointLabel}>
                    {hasMeasurement ? measurements[point.id] : point.name}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendEmpty}`} />
              Empty
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendFilled}`} />
              Saved
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function FemaleTailorForm() {
  return (
    <svg viewBox="0 0 100 100" className={styles.bodySvg} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="femaleMannequinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--sf-border)" stopOpacity="0.4" />
          <stop offset="30%" stopColor="var(--sf-border)" stopOpacity="0.18" />
          <stop offset="50%" stopColor="var(--sf-border)" stopOpacity="0.08" />
          <stop offset="70%" stopColor="var(--sf-border)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--sf-border)" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="femaleArmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--sf-border)" stopOpacity="0.35" />
          <stop offset="50%" stopColor="var(--sf-border)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--sf-border)" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Head & Neck Cap / Finial */}
      <path d="M 47,2.5 Q 50,1.2 53,2.5 L 53,3.8 Q 50,4.8 47,3.8 Z" className={styles.mannequinFinial} />
      <ellipse cx="50" cy="9.5" rx="6.2" ry="8" className={styles.mannequinHead} />
      <path d="M 46.5,15.5 Q 50,17 53.5,15.5" className={styles.mannequinGuideSubtle} />

      {/* Graceful Torso and Legs (Continuous Bézier Curves) */}
      <path
        d="M 50,19
           C 47.5,19 45.5,19.6 44.2,20.4
           C 40.5,21.5 36.5,22.8 33.8,23.8
           C 34.6,26.5 36.2,29.5 37.6,31.6
           C 38.6,32.8 39,33.5 38.8,35
           C 38.2,37.5 39,40 40.5,41.5
           C 41.5,43 42,44.5 41.8,46
           C 41.2,48.5 37.2,53 35.2,57.5
           C 34.5,60 36.2,63.5 38,66
           C 39.2,68.5 39.8,73 40,77.5
           C 40.2,80 39.2,83.5 39.2,86.5
           C 39.2,89.5 40,93 40.5,96.5
           L 44.2,96.5
           C 44.5,93 45,89 45,86.5
           C 45,83 44.6,80 44.8,77.5
           C 45.2,73 47,67.5 50,63
           C 53,67.5 54.8,73 55.2,77.5
           C 55.4,80 55,83 55,86.5
           C 55,89 55.5,93 55.8,96.5
           L 59.5,96.5
           C 60,93 60.8,89.5 60.8,86.5
           C 60.8,83.5 59.8,80 60,77.5
           C 60.2,73 60.8,68.5 62,66
           C 63.8,63.5 65.5,60 64.8,57.5
           C 62.8,53 58.8,48.5 58.2,46
           C 58,44.5 58.5,43 59.5,41.5
           C 61,40 61.8,37.5 61.2,35
           C 61,33.5 61.4,32.8 62.4,31.6
           C 63.8,29.5 65.4,26.5 66.2,23.8
           C 63.5,22.8 59.5,21.5 55.8,20.4
           C 54.5,19.6 52.5,19 50,19 Z"
        className={styles.mannequinBody}
        fill="url(#femaleMannequinGrad)"
      />

      {/* Draped Left Arm */}
      <path
        d="M 33.8,23.8
           C 31,25.5 29,29.5 28.5,34
           C 28,38.5 27.2,43.5 26.2,48
           C 25.2,52.5 23.5,58.5 21.8,65
           C 21.2,67.5 20,70.5 19,72
           L 21.5,72.5
           C 23,70 24.5,66.5 25.5,64
           C 27.5,58 29.2,52 30.5,47
           C 31.8,42.5 33.2,37.5 35,33
           C 36,30.5 36.8,28.5 37.6,27.2 Z"
        className={styles.mannequinArm}
        fill="url(#femaleArmGrad)"
      />

      {/* Draped Right Arm */}
      <path
        d="M 66.2,23.8
           C 69,25.5 71,29.5 71.5,34
           C 72,38.5 72.8,43.5 73.8,48
           C 74.8,52.5 76.5,58.5 78.2,65
           C 78.8,67.5 80,70.5 81,72
           L 78.5,72.5
           C 77,70 75.5,66.5 74.5,64
           C 72.5,58 70.8,52 69.5,47
           C 68.2,42.5 66.8,37.5 65,33
           C 64,30.5 63.2,28.5 62.4,27.2 Z"
        className={styles.mannequinArm}
        fill="url(#femaleArmGrad)"
      />

      {/* Center Front Tailor Seam */}
      <line x1="50" y1="19" x2="50" y2="63" className={styles.mannequinSeam} />

      {/* Tailor Chalk Guidelines */}
      <path d="M 44.5,20.5 Q 50,21.5 55.5,20.5" className={styles.mannequinGuide} />
      <path d="M 37.8,34 Q 50,36.5 62.2,34" className={styles.mannequinGuide} />
      <path d="M 40.5,39 Q 50,41 59.5,39" className={styles.mannequinGuideSubtle} />
      <path d="M 41.8,45 Q 50,47 58.2,45" className={styles.mannequinGuide} />
      <path d="M 35.2,58 Q 50,60.5 64.8,58" className={styles.mannequinGuide} />
      <line x1="39.8" y1="78" x2="60.2" y2="78" className={styles.mannequinGuideSubtle} />
      <line x1="40.5" y1="96" x2="59.5" y2="96" className={styles.mannequinGuideSubtle} />
    </svg>
  );
}

function MaleTailorForm() {
  return (
    <svg viewBox="0 0 100 100" className={styles.bodySvg} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="maleMannequinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--sf-border)" stopOpacity="0.4" />
          <stop offset="30%" stopColor="var(--sf-border)" stopOpacity="0.18" />
          <stop offset="50%" stopColor="var(--sf-border)" stopOpacity="0.08" />
          <stop offset="70%" stopColor="var(--sf-border)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--sf-border)" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="maleArmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--sf-border)" stopOpacity="0.35" />
          <stop offset="50%" stopColor="var(--sf-border)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--sf-border)" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Head & Neck Cap / Finial */}
      <path d="M 46.5,2.5 Q 50,1.2 53.5,2.5 L 53.5,3.8 Q 50,4.8 46.5,3.8 Z" className={styles.mannequinFinial} />
      <ellipse cx="50" cy="9.5" rx="6.5" ry="8.2" className={styles.mannequinHead} />
      <path d="M 45.5,15.8 Q 50,17.2 54.5,15.8" className={styles.mannequinGuideSubtle} />

      {/* Tailored Athletic Torso and Legs */}
      <path
        d="M 50,19
           C 47,19 44.8,19.6 43.5,20.2
           C 39.5,21.2 34.5,22.2 31,23.2
           C 31.8,26.5 33.5,29.5 35.2,31.5
           C 36.2,32.5 37.2,33.5 37.5,35
           C 38,38.5 38.5,41.5 39.2,44.5
           C 39.8,47 40.2,49 40,51
           C 39.5,53.5 37.8,56 36.5,58.5
           C 35.8,60.5 37.2,63.5 38.8,66
           C 39.8,68.5 40.2,73 40.2,77.5
           C 40.2,80 39.5,83.5 39.5,86.5
           C 39.5,89.5 40.2,93 40.5,96.5
           L 44.5,96.5
           C 44.8,93 45.2,89 45.2,86.5
           C 45.2,83 44.8,80 44.8,77.5
           C 45.2,73 47,68 50,63
           C 53,68 54.8,73 55.2,77.5
           C 55.2,80 54.8,83 54.8,86.5
           C 54.8,89 55.2,93 55.5,96.5
           L 59.5,96.5
           C 59.8,93 60.5,89.5 60.5,86.5
           C 60.5,83.5 59.8,80 59.8,77.5
           C 59.8,73 60.2,68.5 61.2,66
           C 62.8,63.5 64.2,60.5 63.5,58.5
           C 62.2,56 60.5,53.5 60,51
           C 59.8,49 60.2,47 60.8,44.5
           C 61.5,41.5 62,38.5 62.5,35
           C 62.8,33.5 63.8,32.5 64.8,31.5
           C 66.5,29.5 68.2,26.5 69,23.2
           C 65.5,22.2 60.5,21.2 56.5,20.2
           C 55.2,19.6 53,19 50,19 Z"
        className={styles.mannequinBody}
        fill="url(#maleMannequinGrad)"
      />

      {/* Athletic Draped Left Arm */}
      <path
        d="M 31,23.2
           C 28,25 26,29 25.2,33.5
           C 24.5,38 23.8,43 23,47.5
           C 22,52 20.5,58 19,64.5
           C 18.5,67 17.5,70 16.5,71.5
           L 19.5,72
           C 21,69.5 22.5,66 23.5,63.5
           C 25.5,57.5 27,51.5 28.2,46.5
           C 29.5,42 30.8,37 32.5,32.5
           C 33.5,30 34.2,28 35.2,26.5 Z"
        className={styles.mannequinArm}
        fill="url(#maleArmGrad)"
      />

      {/* Athletic Draped Right Arm */}
      <path
        d="M 69,23.2
           C 72,25 74,29 74.8,33.5
           C 75.5,38 76.2,43 77,47.5
           C 78,52 79.5,58 81,64.5
           C 81.5,67 82.5,70 83.5,71.5
           L 80.5,72
           C 79,69.5 77.5,66 76.5,63.5
           C 74.5,57.5 73,51.5 71.8,46.5
           C 70.5,42 69.2,37 67.5,32.5
           C 66.5,30 65.8,28 64.8,26.5 Z"
        className={styles.mannequinArm}
        fill="url(#maleArmGrad)"
      />

      {/* Center Front Tailor Seam */}
      <line x1="50" y1="19" x2="50" y2="63" className={styles.mannequinSeam} />

      {/* Tailor Chalk Guidelines */}
      <path d="M 43.5,20.2 Q 50,21.2 56.5,20.2" className={styles.mannequinGuide} />
      <path d="M 37.5,33 Q 50,35.5 62.5,33" className={styles.mannequinGuide} />
      <path d="M 39.2,42 Q 50,44 60.8,42" className={styles.mannequinGuideSubtle} />
      <path d="M 40,48 Q 50,50 60,48" className={styles.mannequinGuide} />
      <path d="M 36.5,58 Q 50,60 63.5,58" className={styles.mannequinGuide} />
      <line x1="39.8" y1="78" x2="60.2" y2="78" className={styles.mannequinGuideSubtle} />
      <line x1="40.5" y1="96" x2="59.5" y2="96" className={styles.mannequinGuideSubtle} />
    </svg>
  );
}
