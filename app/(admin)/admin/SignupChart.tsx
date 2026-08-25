import type { SignupDay } from '@/lib/admin/queries';
import styles from './page.module.css';

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

/** Plain inline SVG bar chart — no charting library in this repo, and a
 *  30-bar daily series doesn't need one. Server component: the data is
 *  baked into static SVG at render time, no client JS required.
 *
 *  Uses a fixed-aspect-ratio viewBox (matched to CSS `aspect-ratio`, not
 *  a stretched height) so text never gets non-uniformly scaled — the
 *  previous version used `preserveAspectRatio="none"` inside a fixed-px
 *  height box, which stretched every label horizontally the wider the
 *  container got. */
export default function SignupChart({ data }: { data: SignupDay[] }) {
  const width = 1000;
  const height = 460;
  const marginLeft = 36;
  const marginRight = 4;
  const marginTop = 24;
  const marginBottom = 40;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const max = Math.max(...data.map((d) => d.count), 1);
  // Round the axis ceiling up to a clean number so gridline labels read as
  // whole, sensible values (0 / 2 / 4 instead of 0 / 1.3 / 2.7).
  const axisMax = Math.max(Math.ceil(max / 2) * 2, 2);

  const barGap = 2;
  const barWidth = data.length > 0 ? plotWidth / data.length - barGap : 0;

  const yTicks = [0, axisMax / 2, axisMax];
  // Every 5th day, plus the last day, keeps x-axis labels from overlapping
  // across a 30-bar series while still anchoring the reader in time.
  const xTickIndices = data.map((_, i) => i).filter((i) => i % 5 === 0 || i === data.length - 1);

  return (
    <>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Organization signups per day over the last 30 days"
      >
        {yTicks.map((tick) => {
          const y = marginTop + plotHeight - (tick / axisMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={marginLeft} y1={y} x2={width - marginRight} y2={y} className={styles.chartGridline} />
              <text x={marginLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" className={styles.chartAxisLabel}>
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          // A day with zero signups gets a small flat stub instead of
          // rendering nothing — with real height=0 those days were
          // literally invisible, which made whole stretches of the chart
          // read as dead empty space rather than "zero, on purpose."
          const ZERO_STUB_HEIGHT = 5;
          const barHeight = d.count > 0 ? (d.count / axisMax) * plotHeight : ZERO_STUB_HEIGHT;
          const x = marginLeft + i * (barWidth + barGap);
          const y = marginTop + plotHeight - barHeight;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={barHeight}
                rx={2}
                className={d.count > 0 ? styles.chartBar : styles.chartBarEmpty}
              >
                <title>
                  {formatShortDate(d.date)}: {d.count} signup{d.count === 1 ? '' : 's'}
                </title>
              </rect>
              {d.count > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className={styles.chartValueLabel}>
                  {d.count}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={width - marginRight}
          y2={marginTop + plotHeight}
          className={styles.chartAxis}
        />

        {xTickIndices.map((i) => {
          const x = marginLeft + i * (barWidth + barGap) + barWidth / 2;
          return (
            <text
              key={i}
              x={x}
              y={marginTop + plotHeight + 20}
              textAnchor="middle"
              className={styles.chartAxisLabel}
            >
              {formatShortDate(data[i].date)}
            </text>
          );
        })}
      </svg>
      <p className={styles.chartNote}>
        Each bar is one day&apos;s new organization signups — taller means more that day. Hover a bar for the exact date and
        count; the left axis shows the signup count scale.
      </p>
    </>
  );
}
