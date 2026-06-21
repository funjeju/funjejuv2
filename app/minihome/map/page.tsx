import type { Metadata } from "next";
import Link from "next/link";
import { JejuMap } from "@/components/biz/minihompy/JejuMap";
import cctvRaw from "@/locations.json";
import foodRaw from "@/data/domin_food.json";

export const metadata: Metadata = {
  title: "제주 미니홈피 지도 🎈 | 펀제주",
  description: "제주 지도에서 미니홈피·CCTV·도민맛집·내 스팟을 한눈에. 열기구를 띄우고 깃발을 꽂아보세요.",
};

export const dynamic = "force-dynamic";

type RawCctv = { id: string; formal?: string; short?: string; lat?: number; lng?: number };
type RawFood = { id: string; title?: string; address?: string; lat?: string | number; lng?: string | number; images?: string[]; content?: string };

const summarize = (html?: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);

const CCTV = (cctvRaw as RawCctv[])
  .filter((c) => c.lat && c.lng)
  .map((c) => ({ id: c.id, name: c.formal || c.short || c.id, lat: Number(c.lat), lng: Number(c.lng) }));

const FOOD = (foodRaw as RawFood[])
  .filter((f) => f.lat && f.lng)
  .map((f) => ({ id: f.id, title: f.title || "", lat: Number(f.lat), lng: Number(f.lng), address: f.address || "", img: f.images?.[0] || "", summary: summarize(f.content) }));

/** 제주 OSM 지도 + 레이어(미니홈피 깃발·CCTV·도민맛집·내 스팟) + 모달→더보기. */
export default function MiniHomeMapPage() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#3f8fc4", color: "#fff", padding: "8px 14px", fontSize: 14, flex: "none" }}>
        <span style={{ fontWeight: 700 }}>🎈 제주 미니홈피 지도</span>
        <Link href="/minihome" style={{ color: "#fff", textDecoration: "underline", fontSize: 12 }}>← 돌아가기</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <JejuMap cctv={CCTV} food={FOOD} />
      </div>
    </div>
  );
}
