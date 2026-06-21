import { NextRequest, NextResponse } from "next/server";
import { listVisitors } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { return NextResponse.json({ visitors: await listVisitors(slug) }); }
  catch (e) { console.error("[visitors GET]", e); return NextResponse.json({ visitors: [] }); }
}
