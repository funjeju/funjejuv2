import { NextRequest, NextResponse } from "next/server";
import { mockCctvs } from "@/constants/mock-cctvs";
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  const cctvs = q ? mockCctvs.filter(c => [c.name, c.region, c.category, c.description].some(v => v?.toLowerCase().includes(q))).slice(0, 20).map(c => ({id:c.id, name:c.name, region:c.region})) : [];
  return NextResponse.json({ restaurants: [], contents: [], cctvs });
}
