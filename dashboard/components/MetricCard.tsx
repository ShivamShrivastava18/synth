"use client";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

type Props = {
  label: string;
  value: number | null;
  threshold?: string;
  pass?: boolean | null;
  hint?: string;
  /** Recent history for the sparkline. Most-recent value should be last. */
  history?: number[];
  /** "higher" means greater values are better; "lower" means smaller values are better. */
  direction?: "higher" | "lower";
  /** Numeric threshold value, used to render the threshold bar. */
  thresholdValue?: number;
};

export function MetricCard({
  label,
  value,
  threshold,
  pass,
  hint,
  history = [],
  direction = "higher",
  thresholdValue,
}: Props) {
  const dotColor =
    pass === true ? "var(--ok)" : pass === false ? "var(--danger)" : "var(--fg-faint)";

  return (
    <div className="lift border border-border bg-bg-elev-1 px-4 pt-3.5 pb-3 rounded-md relative overflow-hidden">
      {/* Subtle wash behind pass/fail */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-base"
        style={{
          background:
            pass === true ? "var(--wash-mint)"
            : pass === false ? "var(--wash-rose)"
            : "transparent",
          opacity: 0.55,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="kicker">{label}</p>
          <span
            className="w-1.5 h-1.5 rounded-full transition-base"
            style={{ background: dotColor }}
            aria-hidden
          />
        </div>

        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-2xl text-fg f-mono tab tracking-tighter leading-none">
            {value == null ? "—" : <CountUp value={value} digits={3} />}
          </p>
          {history.length >= 2 && (
            <div className="opacity-80">
              <Sparkline values={history} color={dotColor} width={84} height={22} />
            </div>
          )}
        </div>

        <div className="mt-2">
          <p className="text-xs text-fg-faint truncate">{hint}</p>
          {threshold && (
            <p className="f-mono text-2xs text-fg-faint mt-0.5">{threshold}</p>
          )}
        </div>

        {/* Threshold gradient bar — a thin horizontal indicator showing
            where this value falls in a sensible 0..1 range. */}
        {value != null && thresholdValue != null && (
          <div className="mt-3 relative h-[3px] bg-bg-elev-3 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-base"
              style={{
                width: `${clamp01(value) * 100}%`,
                background:
                  pass === true ? "var(--ok)"
                  : pass === false ? "var(--danger)"
                  : "var(--fg-faint)",
                opacity: 0.85,
              }}
            />
            <span
              aria-hidden
              className="absolute inset-y-[-1px] w-px bg-fg-muted/70"
              style={{ left: `${clamp01(thresholdValue) * 100}%` }}
              title={`threshold ${thresholdValue}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
