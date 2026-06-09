/**
 * Cloudflare KV 동기화 헬퍼
 * 어드민에서 CCTV 추가/수정/삭제 시 Worker가 사용하는 KV에도 즉시 반영.
 *
 * Firestore = master, KV = 빠른 조회용 캐시.
 * Firestore 변경 → KV 동기 PUT/DELETE.
 */

import "server-only";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KV_NS_ID   = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;

const KV_BASE = ACCOUNT_ID && KV_NS_ID
  ? `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NS_ID}/values`
  : "";

type CctvKVData = {
  name?: string;
  region?: string;
  category?: string;
  originUrl: string;
  active: boolean;
  addedAt?: string;
};

/** KV에 CCTV 등록/업데이트 */
export async function syncCctvToKV(id: string, data: CctvKVData): Promise<boolean> {
  if (!KV_BASE || !API_TOKEN) {
    console.warn("[KV sync] Cloudflare 환경변수 누락 — KV 동기화 스킵");
    return false;
  }
  if (!data.originUrl) {
    console.warn(`[KV sync] ${id}: originUrl 없음, 스킵`);
    return false;
  }

  try {
    const res = await fetch(`${KV_BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name:     data.name,
        region:   data.region,
        category: data.category,
        originUrl: data.originUrl,
        active:   data.active,
        addedAt:  data.addedAt ?? new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[KV sync] ${id} 실패:`, res.status, text.slice(0, 200));
      return false;
    }
    console.log(`[KV sync] ✅ ${id}`);
    return true;
  } catch (e) {
    console.error(`[KV sync] ${id} 에러:`, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** KV에서 CCTV 삭제 */
export async function deleteCctvFromKV(id: string): Promise<boolean> {
  if (!KV_BASE || !API_TOKEN) return false;

  try {
    const res = await fetch(`${KV_BASE}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok && res.status !== 404) {
      console.error(`[KV sync] ${id} 삭제 실패:`, res.status);
      return false;
    }
    console.log(`[KV sync] 🗑 ${id}`);
    return true;
  } catch (e) {
    console.error(`[KV sync] ${id} 삭제 에러:`, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** KV 동기화 가능 여부 (환경변수 체크) */
export function isKVSyncEnabled(): boolean {
  return Boolean(KV_BASE && API_TOKEN);
}
