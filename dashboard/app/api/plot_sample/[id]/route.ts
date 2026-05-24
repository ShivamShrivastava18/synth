import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source_table");
  const columns = searchParams.get("columns");

  if (!source || !columns) {
    return NextResponse.json(
      { error: "source_table and columns required" },
      { status: 400 },
    );
  }

  const engineUrl = process.env.ENGINE_URL;
  if (!engineUrl) {
    return NextResponse.json(
      { error: "ENGINE_URL env var not set" },
      { status: 500 },
    );
  }

  const url = `${engineUrl}/runs/${params.id}/plot_sample?source_table=${encodeURIComponent(source)}&columns=${encodeURIComponent(columns)}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `Engine returned ${resp.status}`, body: await resp.text() },
      { status: 502 },
    );
  }
  return NextResponse.json(await resp.json());
}
