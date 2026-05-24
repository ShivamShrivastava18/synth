"use client";
import { useEffect, useState } from "react";
import { fmtRelative, fmtRunId } from "@/lib/format";
import type { RunDocClient } from "@/lib/types";
import { StatusGlyph } from "./StatusGlyph";

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
    return <p className="font-mono text-[12px] text-ink-faint">loading run log…</p>;
  }
  if (runs.length === 0) {
    return (
      <p className="font-mono text-[12px] text-ink-faint">
        no runs yet · trigger one with{" "}
        <code className="text-ink">python agent/orchestrator.py --source loan_applications --target loan_status</code>
      </p>
    );
  }

  return (
    <table className="w-full text-[13px] font-mono tabular">
      <thead>
        <tr className="text-ink-muted text-left">
          <Th className="w-[60px]">No.</Th>
          <Th className="w-[120px]">When</Th>
          <Th>Source</Th>
          <Th className="w-[200px]">Engine · retry</Th>
          <Th className="w-[140px]">Status</Th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r, i) => {
          const isSel = r.id === selectedId;
          return (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`group border-t border-rule-thin cursor-pointer transition-colors ${
                isSel ? "bg-accent-soft" : "hover:bg-paper-soft"
              }`}
            >
              <Td>
                <span className="text-ink-faint">№</span>{" "}
                <span className={isSel ? "text-ink" : "text-ink-muted"}>
                  {fmtRunId(r.id)}
                </span>
              </Td>
              <Td className="text-ink-muted">{fmtRelative(r.created_at)}</Td>
              <Td className="text-ink">{r.source_table}</Td>
              <Td className="text-ink-muted">
                {r.engine}
                {r.retry_count > 0 && (
                  <span className="text-accent"> · retry {r.retry_count}</span>
                )}
              </Td>
              <Td>
                <StatusGlyph status={r.status} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`py-2 px-3 font-mono font-normal text-[11px] uppercase tracking-kicker ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 px-3 ${className}`}>{children}</td>;
}
