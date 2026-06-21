import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicHome } from "@/lib/biz/userhome-store";
import { listGrows } from "@/lib/biz/grow-store";
import { MiniMi } from "@/components/biz/minihompy/MiniMi";
import { VisitGrows } from "@/components/biz/minihompy/VisitGrows";
import { ChatRoom } from "@/components/biz/minihompy/ChatRoom";
import { ROOM_CONCEPTS, MINIMI } from "@/components/biz/minihompy/minimi-config";
import { SHOP_ITEMS } from "@/components/biz/minihompy/shop-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const { uid } = await params;
  const home = await getPublicHome(uid).catch(() => null);
  if (!home) return { title: "미니홈피를 찾을 수 없습니다 | 펀제주" };
  return { title: `${home.displayName}님의 미니홈피 🏠 | 펀제주`, description: `${home.displayName}님의 제주 미니홈피에 놀러오세요!` };
}

export default async function VisitMiniHomePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const home = await getPublicHome(uid).catch(() => null);
  if (!home) notFound();
  const grows = await listGrows(uid).catch(() => []);
  const room = ROOM_CONCEPTS[home.concept];
  const bgImage = home.background === "bg-custom"
    ? (home.customBgUrl || room.bgImage)
    : (home.background && SHOP_ITEMS.find((i) => i.id === home.background)?.asset) || room.bgImage;
  const customSprite = home.specialMinimi ? SHOP_ITEMS.find((i) => i.id === home.specialMinimi)?.asset : undefined;

  return (
    <div style={{ minHeight: "100vh", background: room.pageBg, padding: 16, fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif", color: "#3a332a" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: room.accent, color: "#fff", padding: "8px 14px", borderRadius: "10px 10px 0 0", fontSize: 14 }}>
          <span style={{ fontWeight: 700 }}>🏠 {home.displayName}님의 미니홈피</span>
          <span style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
            <span>Lv.{home.level}</span>
            <Link href="/minihome/map" style={{ color: "#fff", textDecoration: "underline" }}>지도</Link>
            <Link href="/minihome/me" style={{ color: "#fff", textDecoration: "underline" }}>내 홈피</Link>
          </span>
        </div>

        <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderTop: 0, borderRadius: "0 0 12px 12px", padding: 14 }}>
          <div style={{ position: "relative", height: 300, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", background: bgImage ? `center/cover no-repeat url(${bgImage}), ${room.bg}` : room.bg }}>
            <div style={{ position: "absolute", bottom: 14, left: "46%" }}>
              <MiniMi kind={home.minimi} name={home.displayName} customSprite={customSprite} />
            </div>
            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>{room.emoji} {room.label} · {MINIMI[home.minimi].label} 미니미</div>
          </div>

          <VisitGrows ownerUid={uid} grows={grows} />
          <ChatRoom ownerUid={uid} accent={room.accent} />
        </div>
      </div>
    </div>
  );
}
