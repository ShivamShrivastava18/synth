import { fmtMetric } from "@/lib/format";
import { THRESHOLDS, type RunMetrics } from "@/lib/types";

type Row = {
  label: string;
  value: number | null;
  threshold: string;
  pass: boolean | null;
  note?: string;
};

function build(m: RunMetrics): Row[] {
  return [
    {
      label: "Train Synthetic, Test Real",
      value: m.TSTR,
      threshold: `≥ ${THRESHOLDS.TSTR_MIN.toFixed(3)}`,
      pass: m.TSTR == null ? null : m.TSTR >= THRESHOLDS.TSTR_MIN,
      note: "XGBoost AUC trained on synthetic, scored on real holdout",
    },
    {
      label: "Kolmogorov–Smirnov, mean",
      value: m.KS_avg,
      threshold: `≤ ${THRESHOLDS.KS_MAX.toFixed(3)}`,
      pass: m.KS_avg <= THRESHOLDS.KS_MAX,
      note: "per-column distance between real & synthetic distributions",
    },
    {
      label: "Jensen–Shannon, mean",
      value: m.JS_avg,
      threshold: "reported only",
      pass: null,
      note: "categorical-column distributional similarity",
    },
    {
      label: "Distance to Closest Record, min",
      value: m.DCR_min,
      threshold: `≥ ${THRESHOLDS.DCR_MIN.toFixed(3)}`,
      pass: m.DCR_min >= THRESHOLDS.DCR_MIN,
      note: "privacy — closest synthetic-to-real distance / median real-real",
    },
  ];
}

export function MetricsTable({ metrics }: { metrics: RunMetrics }) {
  const rows = build(metrics);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 py-1.5 border-b border-rule-thin last:border-b-0">
          <div>
            <div className="text-[14px] text-ink leading-tight">{r.label}</div>
            {r.note && <div className="text-[11px] text-ink-faint mt-0.5 italic">{r.note}</div>}
          </div>
          {/* dot leaders */}
          <div aria-hidden className="text-ink-faint tracking-widest hidden sm:block">·····</div>
          <div className="font-mono tabular text-[18px] text-ink min-w-[70px] text-right">
            {fmtMetric(r.value)}
          </div>
          <div className="font-mono text-[11px] min-w-[120px] text-right">
            {r.pass === true && (
              <span className="text-green">✓ {r.threshold}</span>
            )}
            {r.pass === false && (
              <span className="text-accent">✕ {r.threshold}</span>
            )}
            {r.pass === null && (
              <span className="text-ink-muted">· {r.threshold}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
