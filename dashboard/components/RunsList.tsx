"use client";
import { useEffect, useState } from "react";
import { fmtRelative, fmtRunId, fmtMetric } from "@/lib/format";
import type { RunDocClient } from "@/lib/types";
import { StatusDot } from "./StatusDot";
import { EngineBadge } from "./EngineBadge";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRunsLoaded?: (runs: RunDocClient[]) => void;
};

export function RunsList({ selectedId, onSelect, onRunsLoaded }: Props) {
  const [runs, setRuns] = useState<RunDocClient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch("/api/runs", { cache: "no-store" });
      const data: RunDocClient[] = await r.json();
      setRuns(data);
      onRunsLoaded?.(data);
      if (!selectedId && data.length > 0) onSelect(data[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && runs.length === 0) {
    return <SkeletonTable rows={3} />;
  }
  if (runs.length === 0) {
    return (
      <div className="border border-dashed border-border px-5 py-10 text-center rounded-md">
        <p className="text-sm text-fg-muted">No runs yet.</p>
        <p className="mt-1 text-xs text-fg-faint">
          Trigger one with{" "}
          <code className="f-mono text-fg-muted">python agent/orchestrator.py</code>
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full f-sans text-sm">
        <thead className="bg-bg-elev-1">
          <tr className="text-left text-fg-faint">
            <Th>Run</Th>
            <Th>Source → Destination</Th>
            <Th>Engine</Th>
            <Th className="text-right">TSTR</Th>
            <Th className="text-right">KS</Th>
            <Th className="text-right">DCR</Th>
            <Th>Status</Th>
            <Th className="text-right">When</Th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r, idx) => {
            const isSel = r.id === selectedId;
            const tint = rowTint(r.status);
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                style={{
                  background: isSel ? "var(--bg-elev-2)" : tint || undefined,
                  animationDelay: `${idx * 24}ms`,
                }}
                className="group cursor-pointer border-t border-border-soft transition-base hover:bg-bg-elev-2 fade-row"
              >
                <Td>
                  <span className="f-mono text-xs text-fg">{fmtRunId(r.id)}</span>
                  {r.retry_count > 0 && (
                    <span className="ml-1.5 f-mono text-2xs text-warn">↻{r.retry_count}</span>
                  )}
                </Td>
                <Td>
                  <span className="text-fg">{r.source_table}</span>
                  <span className="text-fg-dim mx-1.5">→</span>
                  <span className="text-fg-muted">{r.destination_table}</span>
                </Td>
                <Td>
                  <EngineBadge engine={r.engine} />
                </Td>
                <Td className="text-right f-mono tab text-fg">{fmtMetric(r.metrics?.TSTR ?? null)}</Td>
                <Td className="text-right f-mono tab text-fg">{fmtMetric(r.metrics?.KS_avg ?? null)}</Td>
                <Td className="text-right f-mono tab text-fg">{fmtMetric(r.metrics?.DCR_min ?? null)}</Td>
                <Td>
                  <StatusDot status={r.status} />
                </Td>
                <Td className="text-right text-fg-faint">{fmtRelative(r.created_at)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
        @keyframes fade-row {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-row {
          animation: fade-row 260ms var(--ease-out) backwards;
        }
      `}</style>
    </div>
  );
}

function rowTint(status: RunDocClient["status"]): string | undefined {
  switch (status) {
    case "awaiting_approval": return "var(--wash-amber)";
    case "rejected": return "var(--wash-rose)";
    case "failed":   return "var(--wash-rose)";
    case "approved":
    case "pushed":   return "var(--wash-mint)";
    default: return undefined;
  }
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 f-mono text-2xs uppercase tracking-wider font-medium ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="bg-bg-elev-1 h-9 border-b border-border-soft" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 border-b border-border-soft last:border-b-0">
          <div className="h-full shimmer" />
        </div>
      ))}
    </div>
  );
}
