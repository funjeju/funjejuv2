import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getContentBySlug } from "@/lib/contents";
import { getRestaurant, formatHours } from "@/lib/restaurants";
import type { Content } from "@/types/content";

type SpotInfo = { address?: string; menu?: string; hours?: string; prices?: string };

export const runtime = "nodejs";

// ── 브랜드 ──
const ORANGE = "#ff5722";
const NAVY = "#1a3a8a";
const YELLOW = "#ffd600";
const W = 1080;
const H = 1080; // 1:1 정사각 (세로사진 규격화·하단 여백 최소화)

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
  | { kind: "card"; n: number; heading: string; body: string; image?: string; chip?: string; info?: SpotInfo }
  | { kind: "cta"; title: string; sub?: string };

function absUrl(origin: string, src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http")) return src;
  return `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Content → 카드 배열 (0=표지, 1..n=본문, 마지막=CTA) — 맛집/스팟이면 기본정보 동봉 */
async function buildCards(c: Content, origin: string): Promise<Card[]> {
  // 맛집 섹션의 기본정보(주소·업종·영업시간·가격)를 id로 1회씩 조회 (중복 제거)
  const ids = [...new Set(c.sections.map((s) => s.restaurantId).filter(Boolean) as string[])];
  const infoMap = new Map<string, SpotInfo>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await getRestaurant(id);
        if (!r) return;
        const hours = r.hours ? formatHours(r.hours) : "";
        infoMap.set(id, {
          address: r.address || undefined,
          menu: r.menu || undefined,
          hours: hours && hours !== "정보 없음" ? hours : undefined,
          prices: r.prices || undefined,
        });
      } catch { /* 정보 없으면 패널 생략 */ }
    })
  );

  const cards: Card[] = [];
  cards.push({ kind: "cover", title: c.title, subtitle: c.subtitle, image: absUrl(origin, c.coverImage) });
  c.sections.forEach((s, i) => {
    const info = s.restaurantId ? infoMap.get(s.restaurantId) : undefined;
    const hasInfo = info && (info.address || info.menu || info.hours || info.prices);
    cards.push({
      kind: "card",
      n: i + 1,
      heading: s.heading,
      body: s.body,
      image: absUrl(origin, s.image),
      chip: s.category || c.region || undefined,
      ...(hasInfo ? { info } : {}),
    });
  });
  cards.push({ kind: "cta", title: "실시간 영상·전체 위치는\n펀제주에서", sub: "funjeju.com" });
  return cards;
}

function Footer({ idx, total, mascot }: { idx: number; total: number; mascot: string }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 88, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 44px", background: "rgba(0,0,0,0.22)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascot} width={58} height={58} style={{ marginRight: 14, objectFit: "contain" }} alt="" />
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ color: ORANGE, fontSize: 32, fontWeight: 800 }}>Fun</span>
          <span style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>jeju</span>
          <span style={{ color: "#fff", fontSize: 24, fontWeight: 600, opacity: 0.82, marginLeft: 16 }}>funjeju.com</span>
        </div>
      </div>
      <div style={{ display: "flex", color: "#fff", fontSize: 26, fontWeight: 700, opacity: 0.85 }}>{`${idx + 1} / ${total}`}</div>
    </div>
  );
}

function renderCard(card: Card, idx: number, total: number, mascot: string) {
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
        <div style={{ position: "absolute", left: 48, right: 48, bottom: 132, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.5)", borderRadius: 28, padding: "30px 38px" }}>
          <div style={{ color: "#fff", fontSize: 78, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1, whiteSpace: "pre-wrap", display: "flex" }}>{card.title}</div>
          {card.subtitle && <div style={{ color: YELLOW, fontSize: 38, fontWeight: 700, marginTop: 20 }}>{card.subtitle}</div>}
        </div>
        <div style={{ position: "absolute", right: 56, bottom: 112, color: "#fff", fontSize: 30, fontWeight: 700, opacity: 0.9, display: "flex" }}>밀어서 보기 →</div>
        <Footer idx={idx} total={total} mascot={mascot} />
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
        <Footer idx={idx} total={total} mascot={mascot} />
      </div>
    );
  }

  // body card — 상단 사진 + 하단(제목 + [기본정보 패널] + 말풍선 소개 + 우하단 마스코트)
  const hasInfo = !!card.info && (card.info.address || card.info.menu || card.info.hours || card.info.prices);
  const imgH = hasInfo ? 460 : 560;        // 정사각(1080) 기준 — 정보 있으면 사진 더 줄임
  const mascotSize = hasInfo ? 200 : 260;  // 정보 있으면 마스코트 축소
  return (
    <div style={{ ...base, flexDirection: "column", background: "#fff" }}>
      <div style={{ width: W, height: imgH, display: "flex", position: "relative", background: "#e9eef5" }}>
        {card.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} width={W} height={imgH} style={{ objectFit: "cover" }} alt="" />
        )}
        <div style={{ position: "absolute", top: 36, left: 36, display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 999, background: ORANGE, color: "#fff", fontSize: 40, fontWeight: 800 }}>{card.n}</div>
        {card.chip && (
          <div style={{ position: "absolute", bottom: 28, left: 36, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.6)", borderRadius: 999, padding: "10px 24px", color: "#fff", fontSize: 28, fontWeight: 700 }}>📍 {card.chip}</div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 52px 96px" }}>
        <div style={{ color: NAVY, fontSize: 54, fontWeight: 800, lineHeight: 1.16, letterSpacing: -1, display: "flex" }}>{card.heading}</div>

        {/* 맛집/스팟 기본정보 패널 — 확보된 정보만 (빈 가운데를 채움) */}
        {hasInfo && <InfoPanel info={card.info!} />}

        <div style={{ flex: 1, minHeight: 12, display: "flex" }} />

        {/* 말풍선(소개글) + 우하단 마스코트 */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "relative", flex: 1, display: "flex", background: "#f1f5fb", border: "3px solid #e1e8f3", borderRadius: 32, padding: "26px 32px", marginRight: 18 }}>
            <div style={{ color: "#33405a", fontSize: hasInfo ? 30 : 34, fontWeight: 500, lineHeight: 1.45, display: "flex" }}>{card.body}</div>
            {/* 말풍선 꼬리 (마스코트 쪽) */}
            <div style={{ position: "absolute", right: -17, bottom: 56, width: 28, height: 28, background: "#f1f5fb", borderRight: "3px solid #e1e8f3", borderTop: "3px solid #e1e8f3", transform: "rotate(45deg)" }} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascot} width={mascotSize} height={mascotSize} style={{ objectFit: "contain", flexShrink: 0 }} alt="" />
        </div>
      </div>
      <Footer idx={idx} total={total} mascot={mascot} />
    </div>
  );
}

/** 맛집/스팟 기본정보 패널 (확보된 항목만 행으로) */
function InfoPanel({ info }: { info: SpotInfo }) {
  const rows: { icon: string; label: string; value: string }[] = [];
  if (info.address) rows.push({ icon: "📍", label: "주소", value: info.address });
  if (info.menu)    rows.push({ icon: "🍽️", label: "메뉴", value: info.menu });
  if (info.hours)   rows.push({ icon: "🕐", label: "영업", value: info.hours });
  if (info.prices)  rows.push({ icon: "💰", label: "가격", value: info.prices });
  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12, background: "#f7f9fc", border: "2px solid #e6ebf4", borderRadius: 24, padding: "22px 28px" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", fontSize: 28 }}>
          <span style={{ width: 42, display: "flex" }}>{r.icon}</span>
          <span style={{ width: 96, color: "#8a93a6", fontWeight: 700, display: "flex", flexShrink: 0 }}>{r.label}</span>
          <span style={{ flex: 1, color: "#2b3550", fontWeight: 600, lineHeight: 1.35, display: "flex" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// 데모용 샘플 (템플릿 검수)
function demoCards(img?: string): Card[] {
  return [
    { kind: "cover", title: "제주 별미,\n빈대떡과 사름덜", subtitle: "현지인 단골 한 상", image: img },
    { kind: "card", n: 1, heading: "사름덜", body: "돌판에 갓 부친 빈대떡과 제철 나물 한 상. 막걸리 한 사발이 절로 생각나는 집.", image: img, chip: "제주 한림",
      info: { address: "제주시 한림읍 한림로 100", menu: "빈대떡·제철나물", hours: "10:00 - 21:00", prices: "1~2만원대" } },
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
    cards = await buildCards(content, origin);
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

  const mascot = `${origin}/dolmangyi.png`;

  return new ImageResponse(renderCard(card, idx, cards.length, mascot), {
    width: W,
    height: H,
    fonts: [
      { name: "Pretendard", data: reg, weight: 500, style: "normal" },
      { name: "Pretendard", data: bold, weight: 700, style: "normal" },
      { name: "Pretendard", data: xbold, weight: 800, style: "normal" },
    ],
    // 발행된 카드는 사실상 정적 — 브라우저/CDN 캐시로 캐러셀 이동시 재렌더 제거
    headers: {
      "cache-control": demo
        ? "public, max-age=60"
        : "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
