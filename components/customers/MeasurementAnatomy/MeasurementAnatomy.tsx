'use client';

import { useState } from 'react';
import styles from './MeasurementAnatomy.module.css';

interface MeasurementPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

const FEMALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
  { id: 'neck', name: 'Neck', x: 50, y: 19 },
  { id: 'shoulder', name: 'Shoulder', x: 34, y: 24 },
  { id: 'crossFront', name: 'Cross Front', x: 50, y: 28 },
  { id: 'bust', name: 'Bust', x: 50, y: 34 },
  { id: 'underBust', name: 'Under Bust', x: 50, y: 39 },
  { id: 'waist', name: 'Waist', x: 50, y: 45 },
  { id: 'hips', name: 'Hips', x: 50, y: 58 },
  { id: 'armhole', name: 'Armhole', x: 35, y: 29 },
  { id: 'bicep', name: 'Bicep', x: 33, y: 34 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: 23, y: 62 },
  { id: 'wrist', name: 'Wrist', x: 23, y: 62 },
  { id: 'napeToWaist', name: 'Nape to Waist', x: 50, y: 45 },
  { id: 'frontLength', name: 'Front Length', x: 50, y: 65 },
  { id: 'dressLength', name: 'Dress Length', x: 50, y: 75 },
  { id: 'trouserLength', name: 'Trouser Length', x: 42, y: 96 },
  { id: 'thigh', name: 'Thigh', x: 42, y: 68 },
  { id: 'knee', name: 'Knee', x: 42, y: 78 },
  { id: 'calf', name: 'Calf', x: 42, y: 87 },
  { id: 'ankle', name: 'Ankle', x: 42, y: 96 },
  { id: 'inseam', name: 'Inseam', x: 47.5, y: 79 },
  { id: 'outseam', name: 'Outseam', x: 36.5, y: 77 },
];

const MALE_MEASUREMENT_POINTS: MeasurementPoint[] = [
  { id: 'neck', name: 'Neck', x: 50, y: 19 },
  { id: 'shoulder', name: 'Shoulder', x: 31, y: 23 },
  { id: 'chest', name: 'Chest', x: 50, y: 33 },
  { id: 'stomach', name: 'Stomach', x: 50, y: 42 },
  { id: 'waist', name: 'Waist', x: 50, y: 48 },
  { id: 'hips', name: 'Hips', x: 50, y: 58 },
  { id: 'crotch', name: 'Crotch', x: 50, y: 63 },
  { id: 'armhole', name: 'Armhole', x: 31, y: 28.5 },
  { id: 'bicep', name: 'Bicep', x: 29, y: 34 },
  { id: 'sleeveLength', name: 'Sleeve Length', x: 20.5, y: 64 },
  { id: 'wrist', name: 'Wrist', x: 20.5, y: 64 },
  { id: 'backLength', name: 'Back Length', x: 50, y: 48 },
  { id: 'shirtLength', name: 'Shirt Length', x: 50, y: 60 },
  { id: 'trouserLength', name: 'Trouser Length', x: 42, y: 96 },
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
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');
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
          className={`${styles.viewModeBtn} ${viewMode === 'visual' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('visual')}
        >
          Visual Anatomy
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
          onClick={() => setViewMode('list')}
        >
          Quick List
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

            {/* Interactive measurement points */}
            {points.map((point) => {
              const hasMeasurement = !!measurements[point.id];
              const isSelected = selectedPointId === point.id;

              return (
                <button
                  key={point.id}
                  className={`${styles.point} ${hasMeasurement ? styles.filled : ''} ${isSelected ? styles.selected : ''}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
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
