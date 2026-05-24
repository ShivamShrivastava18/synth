import type { RunStatus } from "@/lib/types";

/**
 * Status indicator — a small typographic glyph + text, no shadcn pill.
 * Each status gets a distinct ink color and a single character mark.
 */
const MAP: Record<RunStatus, { glyph: string; color: string; label: string }> = {
  running:           { glyph: "◇", color: "var(--ink-muted)", label: "running" },
  awaiting_approval: { glyph: "◐", color: "var(--amber)",     label: "awaiting" },
  approved:          { glyph: "◉", color: "var(--green)",     label: "approved" },
  rejected:          { glyph: "✕", color: "var(--accent)",    label: "rejected" },
  pushed:            { glyph: "✓", color: "var(--green)",     label: "pushed" },
  failed:            { glyph: "✕", color: "var(--accent)",    label: "failed" },
};

export function StatusGlyph({ status }: { status: RunStatus }) {
  const m = MAP[status];
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-[12px]" style={{ color: m.color }}>
      <span className="text-[14px] leading-none">{m.glyph}</span>
      <span>{m.label}</span>
    </span>
  );
}
