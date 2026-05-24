"use client";
import { useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { RunsList } from "@/components/RunsList";
import { MetricsTable } from "@/components/MetricsTable";
import { DistributionPlots } from "@/components/DistributionPlots";
import { StatusGlyph } from "@/components/StatusGlyph";
import { fmtAbsolute, fmtRunId } from "@/lib/format";
import type { RunDocClient } from "@/lib/types";

export default function Page() {
  const [runs, setRuns] = useState<RunDocClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = runs.find((r) => r.id === selectedId) ?? null;

  async function verdict(id: string, kind: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/runs/${id}/${kind}`, { method: "POST" });
      // Optimistic local update — list also polls every 4s.
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
    <main className="mx-auto max-w-[1080px] px-8 py-14">
      {/* ─── Masthead ───────────────────────────────────────────────────── */}
      <header className="flex items-end justify-between pb-6">
        <div>
          <Wordmark />
          <p className="font-display italic text-ink-muted text-[15px] mt-1.5">
            autonomous synthetic data &middot; the agent&rsquo;s daily record
          </p>
        </div>
        <div className="text-right">
          <p className="kicker">Run log</p>
          <p className="font-mono text-[12px] text-ink-muted mt-1 tabular">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </header>

      <DoubleRule />

      {/* ─── Recent runs ────────────────────────────────────────────────── */}
      <section className="py-6">
        <SectionLabel kicker="Section I" title="Recent runs" />
        <div className="mt-3">
          <RunsList
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRunsLoaded={setRuns}
          />
        </div>
      </section>

      {selected && (
        <>
          <DoubleRule />
          <RunDetail run={selected} onVerdict={verdict} busy={busy} />
        </>
      )}

      <DoubleRule />
      <footer className="pt-6 flex items-baseline justify-between font-mono text-[11px] text-ink-faint uppercase tracking-kicker">
        <span>Synth &middot; rapid-agent hackathon &middot; Fivetran track</span>
        <span>
          <a
            href="https://github.com/ShivamShrivastava18/synth"
            className="text-ink-muted hover:text-accent"
          >
            github / synth
          </a>
        </span>
      </footer>
    </main>
  );
}

function RunDetail({
  run,
  onVerdict,
  busy,
}: {
  run: RunDocClient;
  onVerdict: (id: string, kind: "approve" | "reject") => void;
  busy: boolean;
}) {
  const pending = run.status === "awaiting_approval";
  return (
    <article className="py-8">
      <SectionLabel kicker={`Run №${fmtRunId(run.id)}`} title={null} />

      <h1 className="font-display text-[56px] leading-[1.05] tracking-tightest text-ink mt-2">
        {run.source_table}
        <span className="text-ink-faint font-display italic font-normal">
          {" "}
          →{" "}
        </span>
        {run.destination_table}
      </h1>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-[13px] text-ink-muted">
        <span>
          <span className="text-ink-faint">engine </span>
          <span className="text-ink">{run.engine}</span>
          {run.retry_count > 0 && (
            <span className="text-accent"> · retry {run.retry_count}</span>
          )}
        </span>
        <span>
          <span className="text-ink-faint">trigger </span>
          <span className="text-ink">{run.trigger}</span>
        </span>
        <span>
          <span className="text-ink-faint">created </span>
          <span className="text-ink tabular">{fmtAbsolute(run.created_at)}</span>
        </span>
        <span>
          <StatusGlyph status={run.status} />
        </span>
      </div>

      {/* ─── Fidelity ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionLabel kicker="Section II" title="Fidelity assessment" />
        <div className="mt-4">
          <MetricsTable metrics={run.metrics} />
        </div>
      </section>

      {/* ─── Figures ──────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionLabel kicker="Section III" title="Distribution comparison" />
        <div className="mt-5">
          <DistributionPlots
            runId={run.id}
            sourceTable={run.source_table}
            columns={run.plot_columns?.slice(0, 4) ?? []}
          />
        </div>
      </section>

      {/* ─── Verdict ──────────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionLabel kicker="Section IV" title="Verdict" />
        {pending ? (
          <div className="mt-5 flex items-center gap-4 flex-wrap">
            <button
              disabled={busy}
              onClick={() => onVerdict(run.id, "approve")}
              className="font-mono uppercase tracking-kicker text-[12px] px-6 py-3 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
            >
              Approve &amp; push
            </button>
            <button
              disabled={busy}
              onClick={() => onVerdict(run.id, "reject")}
              className="font-mono uppercase tracking-kicker text-[12px] px-6 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-paper transition-colors disabled:opacity-40"
            >
              Reject
            </button>
            <span className="font-mono text-[12px] text-ink-faint italic ml-2">
              the agent is waiting on you.
            </span>
          </div>
        ) : (
          <p className="mt-3 font-display italic text-[18px] text-ink-muted">
            Verdict on record:{" "}
            <span className="not-italic font-mono text-ink">
              {run.approval_verdict ?? run.status}
            </span>
            .
          </p>
        )}
      </section>
    </article>
  );
}

function SectionLabel({
  kicker,
  title,
}: {
  kicker: string;
  title: string | null;
}) {
  return (
    <div>
      <p className="kicker">{kicker}</p>
      {title && (
        <h2 className="font-display text-[28px] leading-none text-ink mt-1.5">
          {title}
        </h2>
      )}
    </div>
  );
}

function DoubleRule() {
  return (
    <div aria-hidden>
      <hr className="rule" />
      <div style={{ height: 3 }} />
      <hr className="rule" />
    </div>
  );
}
