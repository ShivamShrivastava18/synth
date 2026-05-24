import type { RunStatus } from "@/lib/types";

const TONE: Record<RunStatus, { color: string; label: string; pulse: boolean }> = {
  running:           { color: "var(--info)",   label: "running",   pulse: true  },
  awaiting_approval: { color: "var(--warn)",   label: "awaiting",  pulse: true  },
  approved:          { color: "var(--ok)",     label: "approved",  pulse: false },
  rejected:          { color: "var(--danger)", label: "rejected",  pulse: false },
  pushed:            { color: "var(--ok)",     label: "pushed",    pulse: false },
  failed:            { color: "var(--danger)", label: "failed",    pulse: false },
};

export function StatusDot({
  status,
  showLabel = true,
  size = 6,
}: {
  status: RunStatus;
  showLabel?: boolean;
  size?: number;
}) {
  const t = TONE[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
      <span
        className={`inline-block rounded-full ${t.pulse ? "pulse" : ""}`}
        style={{ width: size, height: size, background: t.color }}
        aria-hidden
      />
      {showLabel && <span>{t.label}</span>}
    </span>
  );
}
