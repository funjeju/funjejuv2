import "server-only";
import sharp from "sharp";
import { getAdminDb, uploadPublicImage } from "@/lib/firebase-admin";
import { fetchVisitjejuSpots } from "@/lib/visitjeju-spots";
import { deriveRegion, deriveThemes, type RegionKey, type ThemeKey } from "@/lib/spot-guide";
import { ATTRACTIONS_COLL, type Attraction } from "@/lib/attractions-store";

/**
 * 비짓제주 관광지(c1)를 Firestore `attractions`에 적재.
 * - 사실만 저장(명칭·주소·좌표·소개원문) + 좌표→권역, 키워드→테마 분류.
 * - 대표 이미지는 우리 스토리지로 복사(검색 최적화: 자체 도메인 호스팅·압축).
 * - 중복: app_config/spot_ingest { cursorPage, ingested[] }.
 */

const STATE = ["app_config", "spot_ingest"] as const;

type IngestState = { cursorPage: number; ingested: string[] };

async function getState(): Promise<IngestState> {
  const snap = await getAdminDb().collection(STATE[0]).doc(STATE[1]).get();
  const d = snap.exists ? (snap.data() as Partial<IngestState>) : {};
  return { cursorPage: d.cursorPage ?? 1, ingested: Array.isArray(d.ingested) ? d.ingested : [] };
}
async function saveState(s: IngestState): Promise<void> {
  await getAdminDb().collection(STATE[0]).doc(STATE[1]).set(
    { cursorPage: s.cursorPage, ingested: s.ingested.slice(-5000) }, { merge: true },
  );
}

/** 비짓제주 이미지를 받아 압축 후 우리 스토리지로 복사. 실패 시 "" */
async function copyImage(contentsid: string, url?: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return "";
    const raw = Buffer.from(await res.arrayBuffer());
    let out: Buffer = raw;
    try {
      out = await sharp(raw).resize(1200, 900, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    } catch { /* sharp 실패 시 원본 업로드 */ }
    return await uploadPublicImage(`spots/${contentsid}.jpg`, out, "image/jpeg");
  } catch {
    return "";
  }
}

export type SpotIngestResult = { added: { id: string; title: string; region: RegionKey; themes: ThemeKey[] }[]; scanned: number; skipped: number };

/** 신규 관광지 n개 적재 (이미지 복사 포함) */
export async function ingestDailySpots(n = 20): Promise<SpotIngestResult> {
  const db = getAdminDb();
  const state = await getState();
  const ingestedSet = new Set(state.ingested);

  const added: SpotIngestResult["added"] = [];
  let scanned = 0, skipped = 0;
  let page = state.cursorPage;
  let pageCount = 1;
  let guard = 0;

  while (added.length < n && guard < 25) {
    guard++;
    const { items, pageCount: pc } = await fetchVisitjejuSpots(page);
    pageCount = pc;
    for (const s of items) {
      scanned++;
      if (ingestedSet.has(s.contentsid)) { skipped++; continue; }
      ingestedSet.add(s.contentsid);
      if (!s.address || !s.title) { skipped++; continue; }
      // 가볼만한곳 아닌 업체성 항목 제외(교통·렌터카·법인 등)
      if (/고속|운수|렌터카|렌트카|콜택시|\(주\)|주식회사|여행사|항공/.test(s.title)) { skipped++; continue; }
      try {
        const region = deriveRegion(s.lat, s.lng);
        const themes = deriveThemes(`${s.title} ${s.intro} ${s.tag ?? ""}`);
        const image = await copyImage(s.contentsid, s.imageUrl);
        const id = `vj_${s.contentsid}`;
        const doc: Attraction = {
          contentsid: s.contentsid,
          title: s.title,
          address: s.address,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          intro: s.intro.slice(0, 400),
          region,
          themes,
          image,
          imageUrl: s.imageUrl ?? "",
          source: "visitjeju",
          createdAt: new Date(),
        };
        await db.collection(ATTRACTIONS_COLL).doc(id).set(doc, { merge: true });
        added.push({ id, title: s.title, region, themes });
        if (added.length >= n) break;
      } catch {
        skipped++;
      }
    }
    if (page >= pageCount) page = 1; else page++;
    if (guard > 1 && page === state.cursorPage) break;
  }

  await saveState({ cursorPage: page, ingested: [...ingestedSet] });
  return { added, scanned, skipped };
}
