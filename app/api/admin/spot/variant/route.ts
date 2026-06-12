/**
 * 어드민 — 원본 → AI 변형 생성 (영역 선정 → 마스크 편집 → 합성 파이프라인).
 * 정답 마커가 자동으로 같이 내려온다. 클라가 받은 base64를 Storage에 올린다.
 * 주의: 응답의 origBase64(정규화 원본)를 저장해야 변형과 픽셀 단위로 짝이 맞는다.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateVariant } from "@/lib/spot-ai";

export const runtime = "nodejs";
export const maxDuration = 180; // 비전 선정 + 이미지 편집 최대 2회

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { origBase64, mimeType, count, level, extra } = (await req.json().catch(() => ({}))) as {
    origBase64?: string; mimeType?: string; count?: number; level?: string; extra?: string;
  };
  if (!origBase64) return NextResponse.json({ error: "이미지가 필요합니다." }, { status: 400 });

  try {
    const result = await generateVariant({
      origBase64, mimeType: mimeType ?? "image/png",
      count: Math.min(Math.max(count ?? 5, 1), 10), level, extra,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "변형 생성 실패" }, { status: 500 });
  }
}
