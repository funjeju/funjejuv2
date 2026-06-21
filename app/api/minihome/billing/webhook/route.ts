/**
 * 보말 충전 PG 웹훅 스켈레톤.
 * ⚠️ 실제 결제(PG) 연동은 운영자가 직접 해야 함. 이 엔드포인트는 "결제가 검증된 후"
 *    PG가 호출하면 보말을 적립하는 안전한 적립 지점이다.
 *
 * 연결 방법:
 *  1) PG(토스페이먼츠/포트원 등)에서 결제 성공 웹훅을 이 URL로 설정.
 *  2) env BILLING_WEBHOOK_SECRET 를 PG 측 시크릿과 맞추고, 헤더 x-billing-secret 로 전달.
 *  3) TODO: 아래 verifyPgSignature 를 실제 PG 서명검증으로 교체(현재는 시크릿 일치만).
 */
import { NextRequest, NextResponse } from "next/server";
import { awardXp } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "결제 웹훅이 아직 설정되지 않았습니다(PG 연동 필요)" }, { status: 501 });
  if (req.headers.get("x-billing-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // TODO: 실제 PG 서명/주문 검증으로 교체
    const { uid, bomal } = await req.json();
    const amt = Number(bomal);
    if (!uid || !Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: "uid/bomal 필요" }, { status: 400 });
    const p = await awardXp(String(uid), 0, Math.trunc(amt));
    return NextResponse.json({ ok: true, bomal: p.bomal });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "적립 실패" }, { status: 400 });
  }
}
