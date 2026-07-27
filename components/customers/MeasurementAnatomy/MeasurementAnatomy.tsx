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
const FEMALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
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

const MALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
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
}

export default function MeasurementAnatomy({
  gender,
  measurements,
  selectedPointId,
  onPointSelect,
  onValueChange,
}: MeasurementAnatomyProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('list');
  const points = gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;
  
  const filledCount = Object.keys(measurements).length;
  const totalCount = points.length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Body Measurements</h3>
        <span className={styles.counter}>
          {filledCount}/{totalCount} recorded
        </span>
      </div>

      <div className={styles.viewModeTabs}>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('list')}
        >
          Quick List
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${viewMode === 'visual' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('visual')}
        >
          Visual Anatomy
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className={styles.listView}>
          {points.map((point) => (
            <div key={point.id} className={styles.listRow}>
              <label htmlFor={point.id} className={styles.listLabel}>{point.name}</label>
              <input
                id={point.id}
                type="text"
                className={styles.listInput}
                placeholder="--"
                value={measurements[point.id] || ''}
                onChange={(e) => onValueChange?.(point.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.anatomyContainer}>
            <div className={styles.anatomyInner}>
              {gender === 'female' ? (
              <svg viewBox="0 0 100 100" className={styles.bodySvg} preserveAspectRatio="xMidYMid meet">
                <ellipse cx="50" cy="9" rx="7" ry="9" className={styles.bodyPart} />
                <polygon points="46,17 46,21 32,23 38,35 41,45 34,58 37,78 39,96 45,96 47,78 50,62 53,78 55,96 61,96 63,78 66,58 59,45 62,35 68,23 54,21 54,17" className={styles.bodyPart} />
                <polygon points="32,23 26,42 20,62 26,62 31,42 38,35" className={styles.bodyPart} />
                <polygon points="68,23 74,42 80,62 74,62 69,42 62,35" className={styles.bodyPart} />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className={styles.bodySvg} preserveAspectRatio="xMidYMid meet">
                <ellipse cx="50" cy="9" rx="7" ry="9" className={styles.bodyPart} />
                <polygon points="45,17 45,21 28,22 34,35 37,48 36,58 38,78 39,96 45,96 46,78 50,63 54,78 55,96 61,96 62,78 64,58 63,48 66,35 72,22 55,21 55,17" className={styles.bodyPart} />
                <polygon points="28,22 23,43 17,64 24,64 29,43 34,35" className={styles.bodyPart} />
                <polygon points="72,22 77,43 83,64 76,64 71,43 66,35" className={styles.bodyPart} />
              </svg>
            )}

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
              Not recorded
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendFilled}`} />
              Recorded
            </span>
          </div>
        </>
      )}
    </div>
  );
}
