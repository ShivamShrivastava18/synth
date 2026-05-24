"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Sample = { real: Record<string, unknown>[]; synth: Record<string, unknown>[] };

type Props = {
  runId: string;
  sourceTable: string;
  columns: string[];
};

export function DistributionPlots({ runId, sourceTable, columns }: Props) {
  const [data, setData] = useState<Sample | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!columns.length) return;
    setData(null);
    setErr(null);
    const url = `/api/plot_sample/${runId}?source_table=${encodeURIComponent(sourceTable)}&columns=${encodeURIComponent(columns.join(","))}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j))))
      .then(setData)
      .catch((e) => setErr(typeof e === "string" ? e : JSON.stringify(e)));
  }, [runId, sourceTable, columns.join(",")]);

  if (err) {
    const expired = err.includes("not found in cache");
    return (
      <div className="border border-border bg-bg-elev-1 px-4 py-6 rounded-md text-center">
        <p className="text-sm text-fg">
          {expired ? "Sample data expired" : "Plot data unavailable"}
        </p>
        <p className="mt-1 text-xs text-fg-muted max-w-md mx-auto">
          {expired
            ? "Run a fresh generation to repopulate the engine's in-memory cache. The metrics above remain valid."
            : "Could not load plot samples from the engine."}
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {columns.map((c) => (
          <div key={c} className="h-[180px] border border-border-soft bg-bg-elev-1 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {columns.map((col) => {
        const real = data.real.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
        const synth = data.synth.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
        const isNumeric = real.length > 0;

        return (
          <div key={col} className="border border-border bg-bg-elev-1 rounded-md p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="f-mono text-xs text-fg">{col}</span>
              <span className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-fg-faint">
                  <span className="w-2 h-2 rounded-sm" style={{ background: "#71717a" }} />
                  real
                </span>
                <span className="flex items-center gap-1.5 text-fg-faint">
                  <span className="w-2 h-2 rounded-sm" style={{ background: "var(--accent)" }} />
                  synth
                </span>
              </span>
            </div>
            <Plot
              data={[
                {
                  x: (isNumeric
                    ? real
                    : data.real.map((r) => String(r[col]))) as (string | number)[],
                  type: "histogram",
                  histnorm: "probability density",
                  name: "real",
                  marker: { color: "#71717a", opacity: 0.55, line: { width: 0 } },
                  // @ts-expect-error nbinsx valid for plotly
                  nbinsx: 26,
                },
                {
                  x: (isNumeric
                    ? synth
                    : data.synth.map((r) => String(r[col]))) as (string | number)[],
                  type: "histogram",
                  histnorm: "probability density",
                  name: "synth",
                  marker: { color: "#34d399", opacity: 0.65, line: { width: 0 } },
                  // @ts-expect-error nbinsx valid for plotly
                  nbinsx: 26,
                },
              ]}
              layout={{
                width: undefined,
                height: 170,
                autosize: true,
                margin: { l: 32, r: 8, t: 4, b: 26 },
                barmode: "overlay",
                bargap: 0.05,
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: { family: "var(--font-geist-mono), monospace", size: 9, color: "#6a6a64" },
                xaxis: {
                  showgrid: false,
                  zeroline: false,
                  showline: true,
                  linecolor: "#25252b",
                  ticks: "outside",
                  tickcolor: "#25252b",
                  ticklen: 3,
                  tickfont: { color: "#6a6a64" },
                },
                yaxis: {
                  showgrid: true,
                  gridcolor: "#1c1c20",
                  zeroline: false,
                  showline: false,
                  ticks: "outside",
                  tickcolor: "#25252b",
                  ticklen: 3,
                  tickfont: { color: "#6a6a64" },
                  tickformat: ".2f",
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%" }}
            />
          </div>
        );
      })}
    </div>
  );
}
