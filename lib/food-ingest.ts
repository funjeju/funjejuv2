import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { loadAllRestaurants } from "@/lib/restaurants";
import { generateJSON } from "@/lib/biz/gemini";
import { fetchVisitjejuFoods, type VisitjejuFood } from "@/lib/visitjeju-food";

/**
 * 비짓제주 음식점(c4)을 매일 N개씩 도민맛집 DB(Firestore `restaurants`)에 적재.
 * - 사실(상호·주소·좌표·전화)은 그대로, 소개문은 펀제주 문장으로 각색(복붙 금지).
 * - 중복 제거: 이미 적재한 contentsid + 기존 맛집 상호.
 * - 적재 상태: app_config/food_ingest { cursorPage, ingested: string[] }.
 */

const STATE = ["app_config", "food_ingest"] as const;

function normalizeTitle(t: string): string {
  return t.replace(/\s+/g, "").replace(/[()（）]/g, "").toLowerCase();
}

type IngestState = { cursorPage: number; ingested: string[] };

async function getState(): Promise<IngestState> {
  const snap = await getAdminDb().collection(STATE[0]).doc(STATE[1]).get();
  const d = snap.exists ? (snap.data() as Partial<IngestState>) : {};
  return { cursorPage: d.cursorPage ?? 1, ingested: Array.isArray(d.ingested) ? d.ingested : [] };
}

async function saveState(s: IngestState): Promise<void> {
  // ingested는 너무 커지지 않게 최근 3000개만 유지
  const trimmed = s.ingested.slice(-3000);
  await getAdminDb().collection(STATE[0]).doc(STATE[1]).set({ cursorPage: s.cursorPage, ingested: trimmed }, { merge: true });
}

/** 기존 맛집 상호 집합 (json 589 + Firestore 신규) */
async function existingTitles(): Promise<Set<string>> {
  const db = getAdminDb();
  const [json, fsSnap] = await Promise.all([
    loadAllRestaurants(),
    db.collection("restaurants").get(),
  ]);
  const set = new Set<string>();
  for (const r of json) set.add(normalizeTitle(r.title));
  for (const doc of fsSnap.docs) {
    const t = (doc.data() as { title?: string }).title;
    if (t) set.add(normalizeTitle(t));
  }
  return set;
}

type RewriteResult = { content: string; menu: string; region: string };

const SYS = `너는 제주 도민맛집 에디터다. 주어진 음식점 사실 정보로 펀제주 고유의 소개글을 새로 쓴다.
규칙:
- 사실(상호·주소·메뉴·특징)은 입력에만 근거. 없는 메뉴·수상·가격을 지어내지 마라.
- 원문 소개 문장을 그대로 베끼지 말고 펀제주 말투로 완전히 새로 써라(중복 콘텐츠 방지).
- content: 2~3문단, 250~450자. 1)어떤 곳·위치 2)대표 메뉴·특징 3)방문 팁. 담백하고 정보성 있게.
- menu: 업종/대표메뉴를 한 단어로 (예: 갈치요리, 흑돼지, 카페, 해물탕, 국수). 모르면 "맛집".
- region: 주소에서 추출한 읍·면·동 기준 짧은 지역명 (예: 구좌, 애월, 한경, 서귀포, 제주시내).
- 유효한 JSON만 반환.`;

async function rewrite(f: VisitjejuFood): Promise<RewriteResult> {
  const prompt = `다음 제주 음식점 정보로 도민맛집 소개를 JSON으로 작성하라.
상호: ${f.title}
주소: ${f.address}
지역: ${[f.region1, f.region2].filter(Boolean).join(" ")}
태그: ${f.tag ?? ""}
비짓제주 소개(참고용 사실, 베끼지 말 것): ${f.intro}

형식: { "content": "2~3문단 각색 소개", "menu": "업종 한 단어", "region": "짧은 지역명" }`;
  return generateJSON<RewriteResult>(SYS, prompt);
}

export type IngestResult = { added: { id: string; title: string }[]; scanned: number; skipped: number };

/** 신규 음식점 n개 적재 */
export async function ingestDailyFoods(n = 3): Promise<IngestResult> {
  const db = getAdminDb();
  const state = await getState();
  const ingestedSet = new Set(state.ingested);
  const titles = await existingTitles();

  const added: { id: string; title: string }[] = [];
  let scanned = 0, skipped = 0;
  let page = state.cursorPage;
  let pageCount = 1;
  let guard = 0;

  while (added.length < n && guard < 30) {
    guard++;
    const { items, pageCount: pc } = await fetchVisitjejuFoods(page);
    pageCount = pc;
    for (const f of items) {
      scanned++;
      if (ingestedSet.has(f.contentsid)) { skipped++; continue; }
      ingestedSet.add(f.contentsid); // 스캔한 건 다시 안 보게 기록(중복·실패 포함)
      if (titles.has(normalizeTitle(f.title))) { skipped++; continue; } // 기존 맛집 중복
      if (!f.address) { skipped++; continue; }
      try {
        const ai = await rewrite(f);
        const id = `vj_${f.contentsid}`;
        await db.collection("restaurants").doc(id).set({
          title: f.title,
          region: ai.region || f.region2 || f.region1 || "제주",
          menu: ai.menu || "맛집",
          address: f.address,
          phone: f.phone ?? "",
          hours: "",
          description: ai.content,
          imageUrl: f.imageUrl ?? "",
          options: [],
          lat: f.lat ?? null,
          lng: f.lng ?? null,
          source: "visitjeju",
          contentsid: f.contentsid,
          needsReview: true,
          createdAt: new Date(),
        }, { merge: true });
        titles.add(normalizeTitle(f.title));
        added.push({ id, title: f.title });
        if (added.length >= n) break;
      } catch {
        skipped++;
      }
    }
    if (page >= pageCount) page = 1; else page++;
    if (guard > 1 && page === state.cursorPage) break; // 한 바퀴 돌면 중단
  }

  await saveState({ cursorPage: page, ingested: [...ingestedSet] });
  return { added, scanned, skipped };
}
