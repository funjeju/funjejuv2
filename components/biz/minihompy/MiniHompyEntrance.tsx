"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MiniMiKind } from "@/lib/biz/types";
import { MiniMi } from "./MiniMi";
import { track } from "@/lib/analytics";

/**
 * 비즈홈피(/biz/[slug])에 박는 "미니홈피 입장" 티저 배너.
 * 작은 미니미가 좌우로 왔다갔다하며 시선을 끌고, 누르면 /biz/[slug]/home 으로.
 */
export function MiniHompyEntrance({ slug, name, minimi = "hallabong" }: { slug: string; name: string; minimi?: MiniMiKind }) {
  const [left, setLeft] = useState(10);

  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => (l > 50 ? 10 : 78)), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href={`/biz/${slug}/home`}
      onClick={() => track("minihome_enter", { slug })}
      style={{
        display: "block",
        margin: "0 auto",
        maxWidth: 640,
        background: "linear-gradient(135deg,#dbeaff,#ffe0ec)",
        border: "1px solid #b9d0ea",
        borderRadius: 14,
        padding: "14px 18px",
        textDecoration: "none",
        color: "#2b3a52",
        fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🏠 {name} 미니홈피 입장</div>
          <div style={{ fontSize: 12, color: "#5b6f8c", marginTop: 3 }}>방명록 남기고 일촌해요 · 추억의 미니룸 ✨</div>
        </div>

        {/* 움직이는 미니미 티저 */}
        <div style={{ position: "relative", width: 120, height: 44, flex: "none", background: "linear-gradient(#eee6ff 0 60%,#e0cba9 60% 100%)", borderRadius: 8, overflow: "hidden", border: "1px solid #c7b9e0" }}>
          <div style={{ position: "absolute", bottom: 4, left: `${left}%`, transition: "left 1.3s linear" }}>
            <MiniMi kind={minimi} scale={0.45} />
          </div>
        </div>
      </div>
    </Link>
  );
}
