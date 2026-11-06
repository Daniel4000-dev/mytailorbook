'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { AnatomyZone } from './ThreeMannequin';
import styles from './MeasurementAnatomy.module.css';

const ThreeMannequin = dynamic(
  () => import('./ThreeMannequin'),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mannequinLoader}>
        <div className={styles.mannequinLoaderSpinner} />
        <span>Loading 3D view...</span>
      </div>
    ),
  }
);

export interface MeasurementPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  midX?: number;
  midY?: number;
}

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

type CategoryGroupKey = Exclude<AnatomyZone, 'all'>;

const CATEGORY_META: Array<{
  key: CategoryGroupKey;
  title: string;
  pointIds: string[];
}> = [
  {
    key: 'upper',
    title: 'Upper Body',
    pointIds: ['neck', 'shoulder', 'crossFront', 'crossBack', 'chest', 'bust', 'underBust', 'stomach', 'waist', 'hips'],
  },
  {
    key: 'arms',
    title: 'Arms & Sleeves',
    pointIds: ['armhole', 'bicep', 'sleeveLength', 'wrist'],
  },
  {
    key: 'lower',
    title: 'Lower Body',
    pointIds: ['crotch', 'thigh', 'knee', 'calf', 'ankle', 'inseam', 'outseam', 'trouserLength'],
  },
  {
    key: 'spans',
    title: 'Lengths',
    pointIds: [
      'shirtLength',
      'frontLength',
      'backLength',
      'napeToWaist',
      'halfLength',
      'dressLength',
      'gownLength',
      'shoulderToBustPoint',
      'nippleToNipple',
      'shoulderToWaist',
      'shoulderToHips',
    ],
  },
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isFullscreenStudio, setIsFullscreenStudio] = useState(false);
  const [studioZone, setStudioZone] = useState<AnatomyZone>('all');
  const [studioActivePointId, setStudioActivePointId] = useState<string | undefined>(selectedPointId);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const points = gender === 'male' ? MALE_MEASUREMENT_POINTS : FEMALE_MEASUREMENT_POINTS;

  const filledCount = useMemo(
    () => points.filter((p) => measurements[p.id] && String(measurements[p.id]).trim() !== '').length,
    [points, measurements]
  );
  const totalCount = points.length;
  const completionPct = Math.round((filledCount / Math.max(totalCount, 1)) * 100);

  const categorizedGroups = useMemo(() => {
    const pointMap = new Map(points.map((p) => [p.id, p]));
    return CATEGORY_META.map((cat) => {
      const catPoints = cat.pointIds
        .map((id) => pointMap.get(id))
        .filter((p): p is MeasurementPoint => Boolean(p));
      const catFilled = catPoints.filter(
        (p) => measurements[p.id] && String(measurements[p.id]).trim() !== ''
      ).length;
      return {
        ...cat,
        points: catPoints,
        filledCount: catFilled,
      };
    }).filter((cat) => cat.points.length > 0);
  }, [points, measurements]);

  // Lock body scroll when Fullscreen 3D Studio is open
  useEffect(() => {
    if (!isFullscreenStudio) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreenStudio(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreenStudio]);

  const activeStudioPoint = useMemo(() => {
    const targetId = studioActivePointId || selectedPointId || points[0]?.id;
    return points.find((p) => p.id === targetId) || points[0];
  }, [points, studioActivePointId, selectedPointId]);

  const activeStudioIndex = useMemo(
    () => points.findIndex((p) => p.id === activeStudioPoint?.id),
    [points, activeStudioPoint]
  );

  const stepStudioPoint = (dir: -1 | 1) => {
    if (points.length === 0) return;
    const nextIdx = (activeStudioIndex + dir + points.length) % points.length;
    const nextPt = points[nextIdx];
    if (nextPt) {
      setStudioActivePointId(nextPt.id);
    }
  };

  const adjustStudioValue = (delta: number) => {
    if (!activeStudioPoint) return;
    const raw = parseFloat(measurements[activeStudioPoint.id] || '0');
    const base = Number.isFinite(raw) && raw > 0 ? raw : 14;
    const nextVal = Math.max(0.5, Math.round((base + delta) * 4) / 4);
    const formatted = String(nextVal);
    onValueChange?.(activeStudioPoint.id, formatted);
    onValueBlur?.(activeStudioPoint.id, formatted);
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Control Bar (View Mode + Recorded Count) ── */}
      <div className={styles.controlBar}>
        <div className={styles.segmentedTabs} role="tablist" aria-label="Measurement view mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            className={`${styles.segBtn} ${viewMode === 'list' ? styles.segBtnActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Symbol name="checklist" size={14} />
            <span>List View</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'visual'}
            className={`${styles.segBtn} ${viewMode === 'visual' ? styles.segBtnActive : ''}`}
            onClick={() => setViewMode('visual')}
          >
            <Symbol name="person" size={14} />
            <span>3D View</span>
          </button>
        </div>

        <div className={styles.controlBarRight}>
          <div className={styles.progressBadge} title={`${completionPct}% recorded`}>
            <span className={styles.progressDot} />
            <span className={styles.progressText}>
              <strong>{filledCount}</strong>/{totalCount} saved
            </span>
          </div>
        </div>
      </div>

      {/* ── View Mode 1: Interactive 3D Body View ── */}
      {viewMode === 'visual' ? (
        <div className={styles.visualBlock}>
          <div className={styles.anatomyContainer}>
            <ThreeMannequin
              gender={gender}
              measurements={measurements}
              selectedPointId={selectedPointId}
              zoneFilter={studioZone}
              onZoneFilterChange={setStudioZone}
              onToggleFullscreen={() => {
                setStudioActivePointId(selectedPointId || points[0]?.id);
                setIsFullscreenStudio(true);
              }}
              onPointSelect={(point) => {
                const matched = points.find((p) => p.id === point.id);
                onPointSelect(matched || { id: point.id, name: point.name, x: 50, y: 50 });
              }}
            />
          </div>
        </div>
      ) : (
        /* ── View Mode 2: Categorized Input Grid ──────────────── */
        <div className={styles.categoriesStack}>
          {categorizedGroups.map((group) => {
            const isExpanded = Boolean(expandedSections[group.key]);
            return (
              <div key={group.key} className={styles.categoryCard}>
                <button
                  type="button"
                  className={`${styles.categoryHeader} ${styles.categoryHeaderBtn} ${isExpanded ? styles.categoryHeaderExpanded : ''}`}
                  onClick={() => toggleSection(group.key)}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.categoryTitleWrap}>
                    <h4 className={styles.categoryTitle}>{group.title}</h4>
                    <span
                      className={`${styles.categoryCountPill} ${
                        group.filledCount === group.points.length ? styles.categoryCountComplete : ''
                      }`}
                    >
                      {group.filledCount}/{group.points.length}
                    </span>
                  </div>
                  <Symbol
                    name={isExpanded ? 'expand_less' : 'expand_more'}
                    size={20}
                    className={styles.categoryChevron}
                  />
                </button>

                {isExpanded && (
                  <div className={styles.categoryGrid}>
                    {group.points.map((point) => {
                      const val = measurements[point.id] || '';
                      const hasValue = val.trim() !== '';
                      const globalIdx = points.findIndex((p) => p.id === point.id);

                      return (
                        <div
                          key={point.id}
                          className={`${styles.fieldCell} ${hasValue ? styles.fieldCellFilled : ''}`}
                        >
                          <label htmlFor={`list-${point.id}`} className={styles.fieldLabel}>
                            <span className={styles.fieldDot} />
                            <span className={styles.fieldName}>{point.name}</span>
                          </label>
                          <div className={styles.fieldInputWrap}>
                            <input
                              id={`list-${point.id}`}
                              type="text"
                              inputMode="decimal"
                              enterKeyHint={globalIdx < points.length - 1 ? 'next' : 'done'}
                              className={styles.fieldInput}
                              placeholder="--"
                              value={val}
                              onChange={(e) => onValueChange?.(point.id, e.target.value)}
                              onBlur={(e) => onValueBlur?.(point.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const nextPoint = points[globalIdx + 1];
                                  if (nextPoint) {
                                    document.getElementById(`list-${nextPoint.id}`)?.focus();
                                  } else {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }
                              }}
                            />
                            <span className={styles.fieldUnit}>in</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fullscreen 3D View (Portaled to document.body to guarantee 100% viewport coverage) ── */}
      {isFullscreenStudio &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.studioBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label="Measurements Full Screen"
          >
            <div className={styles.studioModal}>
              {/* Header Bar */}
              <div className={styles.studioHeader}>
                <div className={styles.studioTitleRow}>
                  <h3 className={styles.studioTitle}>Measurements</h3>
                  <span className={styles.studioSavedPill}>
                    {filledCount}/{totalCount} saved
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.studioCancelBtn}
                  onClick={() => setIsFullscreenStudio(false)}
                >
                  <Symbol name="close" size={16} />
                  <span>Close</span>
                </button>
              </div>

              {/* Body: Full-Viewport 3D Stage + Measurement Dock */}
              <div className={styles.studioBody}>
                <div className={styles.studioStagePane}>
                  <ThreeMannequin
                    gender={gender}
                    measurements={measurements}
                    selectedPointId={activeStudioPoint?.id}
                    zoneFilter={studioZone}
                    onZoneFilterChange={setStudioZone}
                    isFullscreen
                    onToggleFullscreen={() => setIsFullscreenStudio(false)}
                    onPointSelect={(pt) => {
                      setStudioActivePointId(pt.id);
                    }}
                  />
                </div>

                {/* Right / Bottom Synchronized Measurement Inspector */}
                <div className={styles.studioInspectorPane}>
                  {activeStudioPoint && (
                    <div className={styles.activePointCard}>
                      <div className={styles.activePointHeader}>
                        <button
                          type="button"
                          className={styles.navPointBtn}
                          onClick={() => stepStudioPoint(-1)}
                          title="Previous"
                        >
                          <Symbol name="chevron_left" size={16} />
                        </button>
                        <div className={styles.activePointTitleWrap}>
                          <span className={styles.activePointStep}>
                            {activeStudioIndex + 1} of {totalCount}
                          </span>
                          <h4 className={styles.activePointName}>{activeStudioPoint.name}</h4>
                        </div>
                        <button
                          type="button"
                          className={styles.navPointBtn}
                          onClick={() => stepStudioPoint(1)}
                          title="Next"
                        >
                          <Symbol name="chevron_right" size={16} />
                        </button>
                      </div>

                      <div className={styles.activePointControls}>
                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => adjustStudioValue(-0.5)}
                        >
                          -0.5&Prime;
                        </button>

                        <div className={styles.activeInputBox}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.activePointInput}
                            placeholder="--"
                            value={measurements[activeStudioPoint.id] || ''}
                            onChange={(e) => onValueChange?.(activeStudioPoint.id, e.target.value)}
                            onBlur={(e) => onValueBlur?.(activeStudioPoint.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                                stepStudioPoint(1);
                              }
                            }}
                          />
                          <span className={styles.activeInputUnit}>in</span>
                        </div>

                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => adjustStudioValue(0.5)}
                        >
                          +0.5&Prime;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Desktop Scrollable List */}
                  <div className={styles.studioPointList}>
                    {points
                      .filter((p) => {
                        if (studioZone === 'all') return true;
                        const cat = CATEGORY_META.find((c) => c.key === studioZone);
                        return cat ? cat.pointIds.includes(p.id) : true;
                      })
                      .map((pt) => {
                        const val = measurements[pt.id] || '';
                        const isCurrent = activeStudioPoint?.id === pt.id;
                        return (
                          <button
                            key={pt.id}
                            type="button"
                            className={`${styles.studioListRow} ${
                              isCurrent ? styles.studioListRowActive : ''
                            } ${val ? styles.studioListRowFilled : ''}`}
                            onClick={() => setStudioActivePointId(pt.id)}
                          >
                            <span className={styles.studioListName}>
                              <span className={styles.studioListDot} />
                              {pt.name}
                            </span>
                            <span className={styles.studioListVal}>
                              {val ? `${val}"` : '--'}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
