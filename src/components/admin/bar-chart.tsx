import { formatNumber } from '@/lib/format';

export type BarPoint = { key: string; label: string; value: number };

const W = 600;
const H = 150;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
const GAP = 2;
const RADIUS = 4;

/** A bar whose top corners are rounded and whose base sits flat on the axis. */
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, width / 2, height);
  const bottom = y + height;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`;
}

/**
 * Single-series daily bar chart (one hue, so no legend; the title names it).
 * Time runs right-to-left to follow the RTL page. Each bar has a hover
 * tooltip; the same numbers are available as a table below the chart.
 */
export function BarChart({
  title,
  points,
  unit,
  compact = false,
}: {
  title: string;
  points: BarPoint[];
  unit: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const step = W / Math.max(1, points.length);
  const barW = Math.max(1, step - GAP);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  // A few date labels: newest, oldest and the middle one.
  const labelled = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <figure className="m-0 rounded-panel border border-line bg-white p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className={`font-bold text-brand-900 ${compact ? 'text-sm' : 'text-base'}`}>
          {title}
        </span>
        <span className="text-xs text-ink-2">
          جمع: {formatNumber(total)} {unit}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${title}، نمودار روزانه`}
      >
        <line
          x1={0}
          x2={W}
          y1={PAD_TOP}
          y2={PAD_TOP}
          className="stroke-line"
          strokeDasharray="3 4"
        />
        <text x={W - 2} y={PAD_TOP + 10} textAnchor="end" className="fill-ink-2 text-[10px]">
          {formatNumber(max)}
        </text>
        <line
          x1={0}
          x2={W}
          y1={H - PAD_BOTTOM}
          y2={H - PAD_BOTTOM}
          className="stroke-line-strong"
        />
        {points.map((point, index) => {
          const height = (point.value / max) * plotH;
          // Oldest on the right, newest on the left.
          const x = W - (index + 1) * step + GAP / 2;
          const y = H - PAD_BOTTOM - height;
          return (
            <g key={point.key} className="group">
              {/* Full-height hit area, wider than the bar. */}
              <rect x={x - GAP / 2} y={PAD_TOP} width={step} height={plotH} fill="transparent">
                <title>{`${point.label}: ${formatNumber(point.value)} ${unit}`}</title>
              </rect>
              {point.value > 0 ? (
                <path
                  d={barPath(x, y, barW, height)}
                  className="pointer-events-none fill-primary transition-opacity group-hover:opacity-70"
                />
              ) : null}
              {labelled.has(index) ? (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-ink-2 text-[10px]"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-ink-2">نمایش جدول</summary>
        <table className="mt-2 w-full">
          <tbody className="divide-y divide-line">
            {[...points].reverse().map((point) => (
              <tr key={point.key}>
                <td className="py-1 text-ink-2">{point.label}</td>
                <td className="py-1 text-end font-semibold text-ink">
                  {formatNumber(point.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
