import type { RunStatus } from "@/lib/types";

const TONE: Record<
  RunStatus,
  { color: string; label: string; pulse: boolean }
> = {
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
  size = 7,
}: {
  status: RunStatus;
  showLabel?: boolean;
  size?: number;
}) {
  const t = TONE[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {t.pulse && (
          <span
            className="absolute inset-0 rounded-full ring-pulse"
            style={{ background: t.color }}
            aria-hidden
          />
        )}
        <span
          className="relative inline-block rounded-full"
          style={{
            width: size,
            height: size,
            background: t.color,
            boxShadow: t.pulse ? `0 0 0 1px ${t.color}33` : undefined,
          }}
        />
      </span>
      {showLabel && <span>{t.label}</span>}
    </span>
  );
}
