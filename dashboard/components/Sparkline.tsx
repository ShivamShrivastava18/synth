"use client";
import { useMemo } from "react";

type Props = {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
};

/**
 * Tiny inline SVG sparkline. Auto-scales to the value range. Optional
 * area fill (subtle gradient under the line) when `fill` is true.
 */
export function Sparkline({
  values,
  color = "var(--accent)",
  width = 96,
  height = 22,
  fill = true,
}: Props) {
  const path = useMemo(() => buildPaths(values, width, height), [values, width, height]);

  if (values.length < 2) {
    return (
      <span
        className="inline-block"
        style={{ width, height }}
        aria-label="not enough history yet"
      />
    );
  }

  const gid = `spark-grad-${Math.abs(hash(values))}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={path.area} fill={`url(#${gid})`} />}
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="draw"
      />
      <circle
        cx={path.lastX}
        cy={path.lastY}
        r={1.75}
        fill={color}
      />
    </svg>
  );
}

function buildPaths(values: number[], w: number, h: number) {
  const pad = 2;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi - lo || 1;
  const step = values.length === 1 ? 0 : (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - lo) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;
  return {
    line,
    area,
    lastX: pts[pts.length - 1][0],
    lastY: pts[pts.length - 1][1],
  };
}

function hash(values: number[]): number {
  return values.reduce((a, v) => (a * 31 + (v * 1000) | 0), 0);
}
