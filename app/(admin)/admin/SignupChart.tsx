import type { SignupDay } from '@/lib/admin/queries';
import styles from './page.module.css';

/** Plain inline SVG bar chart — no charting library in this repo, and a
 *  30-bar daily series doesn't need one. Server component: the data is
 *  baked into static SVG at render time, no client JS required. */
export default function SignupChart({ data }: { data: SignupDay[] }) {
  const width = 640;
  const height = 140;
  const barGap = 2;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Organization signups over the last 30 days"
    >
      {data.map((d, i) => {
        const barHeight = (d.count / max) * (height - 20);
        const x = i * (barWidth + barGap);
        const y = height - barHeight - 16;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={Math.max(barWidth, 1)} height={barHeight} rx={1} className={styles.chartBar} />
            {d.count > 0 && (
              <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" className={styles.chartLabel}>
                {d.count}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={height - 16} x2={width} y2={height - 16} className={styles.chartAxis} />
    </svg>
  );
}
