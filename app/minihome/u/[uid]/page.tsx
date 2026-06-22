import type { Metadata } from "next";
import { getPublicHome } from "@/lib/biz/userhome-store";
import { MyMiniHome } from "@/components/biz/minihompy/MyMiniHome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const { uid } = await params;
  const home = await getPublicHome(uid).catch(() => null);
  if (!home) return { title: "미니홈피를 찾을 수 없습니다 | 펀제주" };
  return { title: `${home.displayName}님의 미니홈피 🏠 | 펀제주`, description: `${home.displayName}님의 제주 미니홈피에 놀러오세요!` };
}

// 방문자 모드 — 주인 미니홈피와 동일 레이아웃(읽기 + 방명록·응원·채팅)
export default async function VisitMiniHomePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return <MyMiniHome viewUid={uid} />;
}
