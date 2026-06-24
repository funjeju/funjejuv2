import { JejuMap } from "@/components/biz/minihompy/JejuMap";
import cctvRaw from "@/locations.json";
import foodRaw from "@/data/domin_food.json";

export const dynamic = "force-dynamic";

type RawCctv = { id: string; formal?: string; short?: string; lat?: number; lng?: number };
type RawFood = { id: string; title?: string; address?: string; lat?: string | number; lng?: string | number; images?: string[]; content?: string; menu?: string };

const summarize = (html?: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);

const CCTV = (cctvRaw as RawCctv[])
  .filter((c) => c.lat && c.lng)
  .map((c) => ({ id: c.id, name: c.formal || c.short || c.id, lat: Number(c.lat), lng: Number(c.lng) }));

const FOOD = (foodRaw as RawFood[])
  .filter((f) => f.lat && f.lng)
  .map((f) => ({ id: f.id, title: f.title || "", lat: Number(f.lat), lng: Number(f.lng), address: f.address || "", img: f.images?.[0] || "", summary: summarize(f.content), menu: f.menu || "" }));

/** 어드민 — 제주 지도 테스트(런칭 전 레이어·모달 점검용). */
export default function AdminMapPage() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 8, fontFamily: "'Apple SD Gothic Neo',sans-serif" }}>
        🗺️ 제주 지도 테스트 — 미니홈피 깃발 · CCTV({CCTV.length}) · 도민맛집({FOOD.length}) · 내 스팟. 런칭 전 레이어/모달 점검용.
      </div>
      <div style={{ position: "relative", height: "calc(100vh - 130px)", border: "1px solid #e3d9c2", borderRadius: 12, overflow: "hidden" }}>
        <JejuMap cctv={CCTV} food={FOOD} />
      </div>
    </div>
  );
}
