import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getContentBySlug } from "@/lib/contents";
import type { Content } from "@/types/content";

export const runtime = "nodejs";

// ── 브랜드 ──
const ORANGE = "#ff5722";
const NAVY = "#1a3a8a";
const YELLOW = "#ffd600";
const W = 1080;
const H = 1350; // 4:5

// ── 폰트: public/fonts 를 자기 오리진에서 fetch (서버리스 fs 트레이싱 회피) + 메모리 캐시 ──
const fontCache: Record<string, ArrayBuffer> = {};
async function loadFont(origin: string, file: string): Promise<ArrayBuffer> {
  if (fontCache[file]) return fontCache[file];
  const res = await fetch(`${origin}/fonts/${file}`);
  const buf = await res.arrayBuffer();
  fontCache[file] = buf;
  return buf;
}

// 카드 1장 데이터
type Card =
  | { kind: "cover"; title: string; subtitle?: string; image?: string }
  | { kind: "card"; n: number; heading: string; body: string; image?: string; chip?: string }
  | { kind: "cta"; title: string; sub?: string };

function absUrl(origin: string, src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http")) return src;
  return `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Content → 카드 배열 (0=표지, 1..n=본문, 마지막=CTA) */
function buildCards(c: Content, origin: string): Card[] {
  const cards: Card[] = [];
  cards.push({ kind: "cover", title: c.title, subtitle: c.subtitle, image: absUrl(origin, c.coverImage) });
  c.sections.forEach((s, i) => {
    cards.push({
      kind: "card",
      n: i + 1,
      heading: s.heading,
      body: s.body,
      image: absUrl(origin, s.image),
      chip: s.category || c.region || undefined,
    });
  });
  cards.push({ kind: "cta", title: "실시간 영상·전체 위치는\n펀제주에서", sub: "funjeju.com" });
  return cards;
}

function Footer({ idx, total }: { idx: number; total: number }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", alignItems: "center", color: "#fff", fontSize: 30, fontWeight: 800 }}>
        <span style={{ color: ORANGE }}>Fun</span>
        <span style={{ color: "#fff" }}>jeju</span>
      </div>
      <div style={{ display: "flex", color: "#fff", fontSize: 26, fontWeight: 700, opacity: 0.85 }}>{`${idx + 1} / ${total}`}</div>
    </div>
  );
}

function renderCard(card: Card, idx: number, total: number) {
  // 공통 컨테이너
  const base = { width: W, height: H, display: "flex", position: "relative" as const, fontFamily: "Pretendard" };

  if (card.kind === "cover") {
    return (
      <div style={{ ...base, flexDirection: "column", background: NAVY }}>
        {card.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} width={W} height={H} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.82) 100%)", display: "flex" }} />
        <div style={{ position: "absolute", top: 56, left: 56, display: "flex", alignItems: "center", background: ORANGE, borderRadius: 999, padding: "10px 26px", color: "#fff", fontSize: 30, fontWeight: 800 }}>🍊 제주 큐레이션</div>
        <div style={{ position: "absolute", left: 56, right: 56, bottom: 150, display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#fff", fontSize: 78, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1, whiteSpace: "pre-wrap", display: "flex" }}>{card.title}</div>
          {card.subtitle && <div style={{ color: YELLOW, fontSize: 38, fontWeight: 700, marginTop: 24 }}>{card.subtitle}</div>}
        </div>
        <div style={{ position: "absolute", right: 56, bottom: 96, color: "#fff", fontSize: 30, fontWeight: 700, opacity: 0.9, display: "flex" }}>밀어서 보기 →</div>
        <Footer idx={idx} total={total} />
      </div>
    );
  }

  if (card.kind === "cta") {
    return (
      <div style={{ ...base, flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(145deg, ${ORANGE} 0%, ${NAVY} 100%)` }}>
        <div style={{ fontSize: 64, marginBottom: 20, display: "flex" }}>📺</div>
        <div style={{ color: "#fff", fontSize: 72, fontWeight: 800, textAlign: "center", lineHeight: 1.25, whiteSpace: "pre-wrap", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {card.title.split("\n").map((t, i) => <span key={i}>{t}</span>)}
        </div>
        <div style={{ marginTop: 48, background: "#fff", borderRadius: 999, padding: "20px 48px", color: NAVY, fontSize: 42, fontWeight: 800, display: "flex" }}>{card.sub}</div>
        <Footer idx={idx} total={total} />
      </div>
    );
  }

  // body card — 상단 사진 + 하단 텍스트
  return (
    <div style={{ ...base, flexDirection: "column", background: "#fff" }}>
      <div style={{ width: W, height: 760, display: "flex", position: "relative", background: "#e9eef5" }}>
        {card.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} width={W} height={760} style={{ objectFit: "cover" }} alt="" />
        )}
        <div style={{ position: "absolute", top: 36, left: 36, display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 999, background: ORANGE, color: "#fff", fontSize: 40, fontWeight: 800 }}>{card.n}</div>
        {card.chip && (
          <div style={{ position: "absolute", bottom: 28, left: 36, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.6)", borderRadius: 999, padding: "10px 24px", color: "#fff", fontSize: 28, fontWeight: 700 }}>📍 {card.chip}</div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 56px 96px" }}>
        <div style={{ color: NAVY, fontSize: 60, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1 }}>{card.heading}</div>
        <div style={{ color: "#33405a", fontSize: 36, fontWeight: 500, lineHeight: 1.5, marginTop: 24 }}>{card.body}</div>
      </div>
      <Footer idx={idx} total={total} />
    </div>
  );
}

// 데모용 샘플 (템플릿 검수)
function demoCards(img?: string): Card[] {
  return [
    { kind: "cover", title: "제주 별미,\n빈대떡과 사름덜", subtitle: "현지인 단골 한 상", image: img },
    { kind: "card", n: 1, heading: "사름덜", body: "돌판에 갓 부친 빈대떡과 제철 나물 한 상. 막걸리 한 사발이 절로 생각나는 집.", image: img, chip: "제주 한림" },
    { kind: "cta", title: "실시간 영상·전체 위치는\n펀제주에서", sub: "funjeju.com" },
  ];
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const slug = req.nextUrl.searchParams.get("slug");
  const i = Number(req.nextUrl.searchParams.get("i") ?? "0");
  const demo = req.nextUrl.searchParams.get("demo");

  let cards: Card[];
  if (demo) {
    const img = req.nextUrl.searchParams.get("img") ?? undefined;
    cards = demoCards(absUrl(origin, img));
  } else if (slug) {
    const content = await getContentBySlug(slug);
    if (!content) return new Response("not found", { status: 404 });
    cards = buildCards(content, origin);
  } else {
    return new Response("slug required", { status: 400 });
  }

  const idx = Math.max(0, Math.min(i, cards.length - 1));
  const card = cards[idx];

  const [reg, bold, xbold] = await Promise.all([
    loadFont(origin, "Pretendard-Regular.otf"),
    loadFont(origin, "Pretendard-Bold.otf"),
    loadFont(origin, "Pretendard-ExtraBold.otf"),
  ]);

  return new ImageResponse(renderCard(card, idx, cards.length), {
    width: W,
    height: H,
    fonts: [
      { name: "Pretendard", data: reg, weight: 500, style: "normal" },
      { name: "Pretendard", data: bold, weight: 700, style: "normal" },
      { name: "Pretendard", data: xbold, weight: 800, style: "normal" },
    ],
  });
}
