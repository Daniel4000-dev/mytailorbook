'use client';

import type { StyleMeasureSpec, GuideVariant } from '@/lib/constants';
import styles from './MeasureGuide.module.css';

interface MeasureGuideProps {
  spec: StyleMeasureSpec;
  /** Measurement key currently being edited — its marker lights up. */
  activeKey?: string | null;
  /** Keys that already have a value — their markers render as done. */
  filledKeys?: string[];
  /** Tapping a marker focuses its input below. */
  onPointTap?: (key: string) => void;
}

/** Schematic silhouettes, one per garment family — deliberately simple
 *  outlines so the numbered markers carry the information. */
const SILHOUETTES: Record<GuideVariant, React.ReactNode> = {
  robe: (
    <>
      {/* wide flowing agbada */}
      <path d="M62 44 L20 122 L30 132 L52 104 L46 256 L154 256 L148 104 L170 132 L180 122 L138 44 C126 34 112 30 100 30 C88 30 74 34 62 44 Z" />
      <path d="M88 32 C92 42 108 42 112 32" />
      {/* inner top hem hint */}
      <path d="M70 168 L130 168" strokeDasharray="4 4" />
    </>
  ),
  tunic: (
    <>
      {/* tunic */}
      <path d="M70 44 L44 104 L54 112 L68 92 L66 188 L134 188 L132 92 L146 112 L156 104 L130 44 C120 35 108 32 100 32 C92 32 80 35 70 44 Z" />
      <path d="M90 33 C94 41 106 41 110 33" />
      {/* trousers */}
      <path d="M76 188 L72 272 L94 272 L98 206 L102 206 L106 272 L128 272 L124 188" />
    </>
  ),
  gown: (
    <>
      <path d="M72 44 L52 98 L60 104 L70 90 L64 132 C58 200 64 246 76 272 L124 272 C136 246 142 200 136 132 L130 90 L140 104 L148 98 L128 44 C118 35 106 32 100 32 C94 32 82 35 72 44 Z" />
      <path d="M90 33 C94 41 106 41 110 33" />
      <path d="M66 128 L134 128" strokeDasharray="4 4" />
    </>
  ),
  wrapper: (
    <>
      {/* boxy buba */}
      <path d="M66 44 L42 96 L52 104 L64 88 L64 152 L136 152 L136 88 L148 104 L158 96 L134 44 C122 34 108 31 100 31 C92 31 78 34 66 44 Z" />
      <path d="M90 32 C94 40 106 40 110 32" />
      {/* wrapped iro */}
      <path d="M70 152 L64 270 L136 270 L130 152" />
      <path d="M70 176 L130 168" strokeDasharray="4 4" />
    </>
  ),
  suit: (
    <>
      {/* jacket with lapel V */}
      <path d="M70 44 L46 102 L56 110 L68 92 L68 166 L132 166 L132 92 L144 110 L154 102 L130 44 C120 35 108 32 100 32 C92 32 80 35 70 44 Z" />
      <path d="M88 34 L100 78 L112 34" />
      {/* trousers */}
      <path d="M78 166 L74 272 L94 272 L98 196 L102 196 L106 272 L126 272 L122 166" />
    </>
  ),
};

export default function MeasureGuide({ spec, activeKey, filledKeys = [], onPointTap }: MeasureGuideProps) {
  return (
    <div className={styles.guide}>
      <svg viewBox="0 0 200 300" className={styles.svg} role="img" aria-label="Measurement guide diagram">
        <g className={styles.silhouette}>{SILHOUETTES[spec.variant]}</g>
        {spec.points.map((p, i) => {
          const state = p.key === activeKey ? styles.markerActive : filledKeys.includes(p.key) ? styles.markerDone : '';
          return (
            <g
              key={p.key}
              className={`${styles.marker} ${state}`}
              onClick={() => onPointTap?.(p.key)}
              role="button"
              aria-label={`${i + 1}. ${p.label}`}
            >
              {p.key === activeKey && <circle cx={p.gx} cy={p.gy} r="15" className={styles.pulseRing} />}
              <circle cx={p.gx} cy={p.gy} r="10" className={styles.markerCircle} />
              <text x={p.gx} y={p.gy + 3.5} textAnchor="middle" className={styles.markerNum}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <span className={styles.badge}>Guide</span>
    </div>
  );
}
