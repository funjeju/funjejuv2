import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "내 미니홈피 만들기 🏠 | 펀제주",
  description: "제주 감성 미니홈피를 나만의 공간으로! 미니미 키우고, 방 꾸미고, 제주 지도에 내 깃발을 꽂아보세요.",
};

/**
 * 일반 유저 미니홈피 진입(랜딩). Phase: 안내 + 만들기 CTA(준비중).
 * 다음 단계에서 유저 미니홈피 생성 플로우 + 상점 + 제주 깃발지도로 확장.
 */
export default function MiniHomeLanding() {
  return (
    <div style={{ minHeight: "100vh", background: "#9ec46f", padding: 24, fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif", color: "#3a332a" }}>
      <div style={{ maxWidth: 560, margin: "40px auto", background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🏠✨</div>
        <h1 style={{ fontSize: 22, margin: "10px 0 4px" }}>내 미니홈피 만들기</h1>
        <p style={{ fontSize: 14, color: "#7a6e58", lineHeight: 1.7 }}>
          제주 감성 미니홈피를 나만의 공간으로!<br />
          미니미를 고르고, 방을 꾸미고, 방명록을 받고,<br />
          <b>제주 지도 어딘가에 내 깃발</b>을 꽂아보세요. 🚩
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, margin: "20px 0", textAlign: "left" }}>
          {[
            ["🧍 미니미 6종", "해녀·돌하르방·한라봉·바람·유채꽃·검은모래"],
            ["🖼️ 방 컨셉", "오름·귤농장·해수욕장 (+커스텀 배경)"],
            ["💬 방명록·말하기", "일촌평 받고 미니미가 말해요"],
            ["🚩 제주 깃발지도", "내 미니홈피를 지도에 꽂기"],
          ].map(([t, d]) => (
            <div key={t} style={{ background: "#f6f1e6", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
              <div style={{ fontSize: 11, color: "#8a7a5a", marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/minihome/map" style={{ flex: 1, background: "#3f8fc4", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            🎈 제주 지도
          </Link>
          <Link href="/minihome/shop" style={{ flex: 1, background: "#e0890a", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            🛍️ 상점
          </Link>
        </div>
        <Link href="/minihome/me" style={{ display: "block", width: "100%", marginTop: 8, background: "#5b9e3f", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, textDecoration: "none", boxSizing: "border-box" }}>
          🏠 내 미니홈피 만들기 / 입장
        </Link>
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ fontSize: 12, color: "#5b9e3f", textDecoration: "underline" }}>← 펀제주 홈으로</Link>
        </div>
      </div>
    </div>
  );
}
