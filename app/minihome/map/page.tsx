import type { Metadata } from "next";
import Link from "next/link";
import { JejuMap } from "@/components/biz/minihompy/JejuMap";

export const metadata: Metadata = {
  title: "제주 미니홈피 지도 🎈 | 펀제주",
  description: "제주 지도 위에 내 미니홈피를 열기구로 띄워보세요. 레벨에 따라 열기구가 자라요.",
};

export const dynamic = "force-dynamic";

/** 제주 OSM 지도 + 열기구 마커. Phase: 데모 마커 1개 + 레벨 시연 + 내 위치 보기. */
export default function MiniHomeMapPage() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#3f8fc4", color: "#fff", padding: "8px 14px", fontSize: 14, flex: "none" }}>
        <span style={{ fontWeight: 700 }}>🎈 제주 미니홈피 지도</span>
        <Link href="/minihome" style={{ color: "#fff", textDecoration: "underline", fontSize: 12 }}>← 돌아가기</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <JejuMap />
      </div>
    </div>
  );
}
