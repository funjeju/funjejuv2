/**
 * 어드민 보말 수동 지급 — 운영·보상·CS·테스트용.
 * 인증: admin_auth 쿠키. (실제 충전 결제 PG는 별도 — billing/webhook 참고)
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { awardXp } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { uid, amount } = await req.json();
    const amt = Number(amount);
    if (!uid || !Number.isFinite(amt)) return NextResponse.json({ error: "uid/amount 필요" }, { status: 400 });
    const p = await awardXp(String(uid), 0, Math.trunc(amt)); // XP 0, 보말만 가산(음수=차감)
    return NextResponse.json({ ok: true, bomal: p.bomal });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "지급 실패" }, { status: 400 });
  }
}
