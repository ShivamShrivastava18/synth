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
    const url = `/api/plot_sample/${runId}?source_table=${encodeURIComponent(sourceTable)}&columns=${encodeURIComponent(columns.join(","))}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j))))
      .then(setData)
      .catch((e) => setErr(typeof e === "string" ? e : JSON.stringify(e)));
  }, [runId, sourceTable, columns.join(",")]);

  if (err) return <p className="font-mono text-[12px] text-accent">plot error: {err}</p>;
  if (!data) return <p className="font-mono text-[12px] text-ink-faint">loading figures…</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      {columns.map((col, i) => {
        const real = data.real.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
        const synth = data.synth.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
        const isNumeric = real.length > 0;

        return (
          <figure key={col} className="space-y-1.5">
            <Plot
              data={[
                {
                  x: (isNumeric
                    ? real
                    : data.real.map((r) => String(r[col]))) as (string | number)[],
                  type: "histogram",
                  histnorm: "probability density",
                  name: "real",
                  marker: { color: "#0c0c0c", opacity: 0.55 },
                  // @ts-expect-error react-plotly types don't include nbinsx but Plotly accepts it
                  nbinsx: 30,
                },
                {
                  x: (isNumeric
                    ? synth
                    : data.synth.map((r) => String(r[col]))) as (string | number)[],
                  type: "histogram",
                  histnorm: "probability density",
                  name: "synth",
                  marker: { color: "#c1272d", opacity: 0.55 },
                  // @ts-expect-error react-plotly types don't include nbinsx but Plotly accepts it
                  nbinsx: 30,
                },
              ]}
              layout={{
                width: undefined,
                height: 220,
                autosize: true,
                margin: { l: 36, r: 12, t: 6, b: 28 },
                barmode: "overlay",
                bargap: 0.04,
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: { family: "var(--font-geist-mono), monospace", size: 10, color: "#6b675a" },
                xaxis: {
                  showgrid: false,
                  zeroline: false,
                  showline: true,
                  linecolor: "#0c0c0c",
                  ticks: "outside",
                  tickcolor: "#0c0c0c",
                  ticklen: 4,
                },
                yaxis: {
                  showgrid: false,
                  zeroline: false,
                  showline: true,
                  linecolor: "#0c0c0c",
                  ticks: "outside",
                  tickcolor: "#0c0c0c",
                  ticklen: 4,
                  tickformat: ".2f",
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%" }}
            />
            <figcaption className="font-mono text-[11px] text-ink-muted flex items-baseline justify-between">
              <span className="uppercase tracking-kicker text-ink-faint">Fig. {i + 1}</span>
              <span className="text-ink">{col}</span>
              <span>
                <span className="text-ink">▪</span> real{" "}
                <span className="text-accent ml-2">▪</span> synth
              </span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
