"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { SHOP_CATEGORIES, SHOP_ITEMS, BOMAL_PACKS } from "./shop-items";

/**
 * 미니홈피 상점 — 보말(제주 바다고둥 🐚)로 배경·미니미·아이템 구매.
 * 로그인 유저의 보말 잔액·보유아이템은 minihomes/{uid}에 영속(서버 트랜잭션 검증).
 * ※ 충전(현금 결제 PG)은 정책상 직접 처리 불가 — 안내만.
 */

interface Home { bomal: number; ownedItems: string[]; }

export function Shop() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(""), 1800); };

  useEffect(() => {
    if (!user) { setHome(null); return; }
    (async () => {
      try {
        const t = await user.getIdToken();
        const r = await fetch("/api/minihome/me", { headers: { Authorization: `Bearer ${t}` } });
        const d = await r.json();
        if (r.ok) setHome(d.home);
      } catch { /* ignore */ }
    })();
  }, [user]);

  const buy = useCallback(async (id: string, name: string) => {
    if (!user) { signInWithGoogle(); return; }
    if (home?.ownedItems?.includes(id)) return;
    setBusy(true);
    try {
      const t = await user.getIdToken();
      const r = await fetch("/api/minihome/me/buy", {
        method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id }),
      });
      const d = await r.json();
      if (!r.ok) { flash(d.error || "구매 실패 🥲"); return; }
      setHome(d.home);
      flash(`${name} 구매 완료! 🎉`);
    } finally { setBusy(false); }
  }, [user, home, signInWithGoogle]);

  const balance = home?.bomal ?? 0;
  const owned = new Set(home?.ownedItems ?? []);

  return (
    <div style={{ minHeight: "100vh", background: "#f4ead6", padding: 18, fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif", color: "#3a332a" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>🛍️ 미니홈피 상점</h1>
          <Link href="/minihome" style={{ fontSize: 12, color: "#a06a2c", textDecoration: "underline" }}>← 돌아가기</Link>
        </div>

        {/* 로그인 안내 / 보말 잔액 */}
        {!user ? (
          <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#7a6e58", marginBottom: 10 }}>로그인하면 🐚 보말 500개를 드려요! 구매한 아이템은 내 계정에 저장됩니다.</div>
            <button onClick={signInWithGoogle} disabled={loading} style={{ background: "#5b9e3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>구글로 로그인</button>
          </div>
        ) : (
          <>
            <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>🐚 내 보말 <span style={{ color: "#e0890a" }}>{balance.toLocaleString()}</span></div>
              <div style={{ display: "flex", gap: 6 }}>
                {BOMAL_PACKS.map((p) => (
                  <button key={p.bomal} onClick={() => flash("충전(결제)은 곧 오픈돼요 🛠️")} title={`${p.won.toLocaleString()}원 (결제 연동 예정)`} style={{ fontSize: 11, background: "#e0890a", color: "#fff", border: "none", borderRadius: 7, padding: "6px 9px", cursor: "pointer" }}>
                    🐚{p.bomal}{p.bonus ? ` ${p.bonus}` : ""}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#a89878", marginBottom: 16 }}>※ 충전(현금 결제)은 별도 연동 예정. 보말은 성장·이벤트로도 모을 수 있어요.</div>
          </>
        )}

        {SHOP_CATEGORIES.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#7a5a2a" }}>{cat.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {SHOP_ITEMS.filter((i) => i.category === cat.id).map((item) => {
                const has = owned.has(item.id);
                return (
                  <div key={item.id} style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 10, padding: 10, textAlign: "center", position: "relative" }}>
                    {item.badge && <span style={{ position: "absolute", top: 6, right: 6, fontSize: 9, background: "#ff7aa2", color: "#fff", borderRadius: 5, padding: "1px 5px" }}>{item.badge}</span>}
                    <div style={{ fontSize: 34 }}>{item.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, margin: "4px 0" }}>{item.name}</div>
                    <button onClick={() => buy(item.id, item.name)} disabled={has || busy} style={{ width: "100%", fontSize: 12, background: has ? "#e8e2d4" : "#5b9e3f", color: has ? "#9a8" : "#fff", border: "none", borderRadius: 7, padding: "6px 0", cursor: has ? "default" : "pointer", fontWeight: 700 }}>
                      {has ? "보유중 ✓" : `🐚 ${item.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#3a332a", color: "#fff", borderRadius: 999, padding: "9px 20px", fontSize: 13, boxShadow: "0 2px 10px rgba(0,0,0,.3)", zIndex: 100 }}>{toast}</div>
      )}
    </div>
  );
}
