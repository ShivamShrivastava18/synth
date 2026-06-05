"use client";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { RunsList } from "@/components/RunsList";
import { MetricCard } from "@/components/MetricCard";
import { DistributionPlots } from "@/components/DistributionPlots";
import { StatusDot } from "@/components/StatusDot";
import { Button } from "@/components/Button";
import { EngineBadge } from "@/components/EngineBadge";
import { fmtAbsolute, fmtRunId } from "@/lib/format";
import { THRESHOLDS, type RunDocClient, type RunMetrics } from "@/lib/types";

export default function Page() {
  const [runs, setRuns] = useState<RunDocClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const selected = runs.find((r) => r.id === selectedId) ?? null;

  // History for sparklines — last N runs of THIS source/target combo, oldest first.
  const history = useMemo(() => {
    if (!selected) return null;
    const sameSource = runs
      .filter((r) => r.source_table === selected.source_table)
      .slice()
      .reverse(); // oldest → newest
    const take = (k: keyof RunMetrics) =>
      sameSource
        .map((r) => r.metrics?.[k])
        .filter((v): v is number => typeof v === "number");
    return {
      TSTR: take("TSTR"),
      KS_avg: take("KS_avg"),
      JS_avg: take("JS_avg"),
      DCR_min: take("DCR_min"),
    };
  }, [runs, selected?.source_table]);

  async function verdict(id: string, kind: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/runs/${id}/${kind}`, { method: "POST" });
      setRuns((rs) =>
        rs.map((r) =>
          r.id === id
            ? {
                ...r,
                status: kind === "approve" ? "approved" : "rejected",
                approval_verdict: kind === "approve" ? "approved" : "rejected",
              }
            : r,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 min-w-0 fade-in" style={{ animationDelay: "60ms" }}>
        <TopBar
          crumbs={[
            { label: "synth-hackathon-2026", muted: true },
            { label: "Runs" },
            ...(selected ? [{ label: fmtRunId(selected.id), muted: true }] : []),
          ]}
          right={
            <Button
              variant="primary"
              size="sm"
              disabled={triggering}
              onClick={async () => {
                setTriggering(true);
                try {
                  await fetch("/api/trigger", { method: "POST" });
                } finally {
                  setTriggering(false);
                }
              }}
            >
              <span>{triggering ? "Triggering…" : "New run"}</span>
              <kbd className="f-mono text-2xs text-fg-faint border border-border-soft px-1 rounded-xs ml-1">N</kbd>
            </Button>
          }
        />

        <main className="px-6 py-5 max-w-[1280px]">
          <section className="mb-5 flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold text-fg tracking-tighter">Runs</h1>
              <p className="text-sm text-fg-muted mt-0.5">
                Synthetic-data runs across all sources.{" "}
                <span className="text-fg-faint">{runs.length} total</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">All sources</Button>
              <Button variant="ghost" size="sm">All status</Button>
            </div>
          </section>

          <RunsList
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRunsLoaded={setRuns}
          />

          {selected && (
            <RunDetail
              run={selected}
              onVerdict={verdict}
              busy={busy}
              history={history}
            />
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .fade-in { animation: fade-in 360ms var(--ease-out) backwards; }
      `}</style>
    </div>
  );
}

function RunDetail({
  run,
  onVerdict,
  busy,
  history,
}: {
  run: RunDocClient;
  onVerdict: (id: string, kind: "approve" | "reject") => void;
  busy: boolean;
  history: { TSTR: number[]; KS_avg: number[]; JS_avg: number[]; DCR_min: number[] } | null;
}) {
  const pending = run.status === "awaiting_approval";

  return (
    <section
      key={run.id}
      className="mt-8 space-y-6 fade-in"
      style={{ animationDelay: "120ms" }}
    >
      <hr className="hr" />

      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="kicker">Run · {fmtRunId(run.id)}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tighter text-fg">
            <span>{run.source_table}</span>
            <span className="text-fg-dim mx-2 font-normal">→</span>
            <span className="text-fg-muted">{run.destination_table}</span>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-fg-muted">
            <StatusDot status={run.status} />
            <Sep />
            <span className="flex items-center gap-1.5">
              <span className="text-fg-faint">engine</span>
              <EngineBadge engine={run.engine} />
              {run.retry_count > 0 && (
                <span className="f-mono text-warn">↻ retry {run.retry_count}</span>
              )}
            </span>
            <Sep />
            <span>
              <span className="text-fg-faint">trigger</span>{" "}
              <span className="f-mono text-fg">{run.trigger}</span>
            </span>
            <Sep />
            <span className="f-mono text-fg-muted tab">{fmtAbsolute(run.created_at)}</span>
          </div>
        </div>

        {pending ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="danger" size="md" disabled={busy} onClick={() => onVerdict(run.id, "reject")}>
              Reject
            </Button>
            <Button variant="primary" size="md" disabled={busy} onClick={() => onVerdict(run.id, "approve")}>
              Approve &amp; push
            </Button>
          </div>
        ) : (
          <div className="text-right text-sm">
            <p className="kicker">Verdict</p>
            <p className="f-mono text-fg mt-1">{run.approval_verdict ?? run.status}</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <p className="kicker">Fidelity</p>
          <p className="text-xs text-fg-faint">4 metrics · 3 gating · {history?.TSTR.length ?? 0} of {history?.TSTR.length ?? 0} historical</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="TSTR · utility"
            value={run.metrics.TSTR}
            threshold={`≥ ${THRESHOLDS.TSTR_MIN.toFixed(2)}`}
            thresholdValue={THRESHOLDS.TSTR_MIN}
            pass={run.metrics.TSTR == null ? null : run.metrics.TSTR >= THRESHOLDS.TSTR_MIN}
            hint="XGBoost AUC, train synth → test real"
            history={history?.TSTR ?? []}
            direction="higher"
          />
          <MetricCard
            label="KS_avg · numeric"
            value={run.metrics.KS_avg}
            threshold={`≤ ${THRESHOLDS.KS_MAX.toFixed(2)}`}
            thresholdValue={THRESHOLDS.KS_MAX}
            pass={run.metrics.KS_avg <= THRESHOLDS.KS_MAX}
            hint="Kolmogorov–Smirnov, per-col mean"
            history={history?.KS_avg ?? []}
            direction="lower"
          />
          <MetricCard
            label="JS_avg · categorical"
            value={run.metrics.JS_avg}
            threshold="reported"
            pass={null}
            hint="Jensen–Shannon, per-col mean"
            history={history?.JS_avg ?? []}
            direction="lower"
          />
          <MetricCard
            label="DCR_min · privacy"
            value={run.metrics.DCR_min}
            threshold={`≥ ${THRESHOLDS.DCR_MIN.toFixed(2)}`}
            thresholdValue={THRESHOLDS.DCR_MIN}
            pass={run.metrics.DCR_min >= THRESHOLDS.DCR_MIN}
            hint="closest synth↔real / median real↔real"
            history={history?.DCR_min ?? []}
            direction="higher"
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <p className="kicker">Distribution comparison · top columns</p>
          <p className="text-xs text-fg-faint">500 real vs 500 synth</p>
        </div>
        <DistributionPlots
          runId={run.id}
          sourceTable={run.source_table}
          columns={run.plot_columns?.slice(0, 4) ?? []}
        />
      </div>
    </section>
  );
}

function Sep() {
  return <span aria-hidden className="text-fg-dim">·</span>;
}
