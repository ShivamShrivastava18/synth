import { NextResponse } from "next/server";
import { db, tsToIso } from "@/lib/firestore";
import type { RunDocClient } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snap = await db()
    .collection("runs")
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  const runs: RunDocClient[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      trigger: data.trigger,
      source_table: data.source_table,
      destination_table: data.destination_table,
      engine: data.engine,
      retry_count: data.retry_count ?? 0,
      status: data.status,
      metrics: data.metrics,
      plot_columns: data.plot_columns ?? [],
      created_at: tsToIso(data.created_at),
      approved_at: tsToIso(data.approved_at),
      approval_verdict: data.approval_verdict ?? null,
      pushed_at: tsToIso(data.pushed_at),
    };
  });

  return NextResponse.json(runs);
}
