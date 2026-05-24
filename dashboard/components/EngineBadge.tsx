import type { EngineName } from "@/lib/types";

const STYLE: Record<EngineName, { bg: string; color: string; label: string }> = {
  gaussian_copula: {
    bg: "var(--wash-violet)",
    color: "var(--tint-violet)",
    label: "gaussian_copula",
  },
  conditional_histogram: {
    bg: "var(--wash-teal)",
    color: "var(--tint-teal)",
    label: "conditional_hist.",
  },
};

export function EngineBadge({ engine }: { engine: EngineName }) {
  const s = STYLE[engine];
  if (!s) {
    return (
      <span className="f-mono text-xs text-fg-muted">{engine}</span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 f-mono text-xs px-1.5 py-0.5 rounded-xs border"
      style={{
        background: s.bg,
        color: s.color,
        borderColor: "transparent",
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: s.color }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}
