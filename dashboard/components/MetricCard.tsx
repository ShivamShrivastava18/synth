import { fmtMetric } from "@/lib/format";

type Props = {
  label: string;
  value: number | null;
  threshold?: string;
  pass?: boolean | null;
  hint?: string;
};

export function MetricCard({ label, value, threshold, pass, hint }: Props) {
  const indicator =
    pass === true ? "bg-ok" : pass === false ? "bg-danger" : pass === null ? "bg-fg-faint" : null;

  return (
    <div className="border border-border bg-bg-elev-1 px-4 py-3.5 rounded-md">
      <div className="flex items-center justify-between">
        <p className="kicker">{label}</p>
        {indicator && <span className={`w-1.5 h-1.5 rounded-full ${indicator}`} />}
      </div>
      <p className="mt-1.5 text-2xl text-fg f-mono tab tracking-tighter">{fmtMetric(value)}</p>
      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="text-xs text-fg-faint">{hint}</span>
        {threshold && (
          <span className="f-mono text-2xs text-fg-faint">{threshold}</span>
        )}
      </div>
    </div>
  );
}
