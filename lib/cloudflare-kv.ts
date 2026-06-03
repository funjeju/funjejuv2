/**
 * Cloudflare KV REST API 클라이언트 (서버 전용)
 * Worker 내부가 아닌 Next.js 서버에서 KV를 읽고 쓰는 용도
 */

const BASE = "https://api.cloudflare.com/client/v4";

function headers() {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

const accountId = () => process.env.CLOUDFLARE_ACCOUNT_ID!;
const nsId = () => process.env.CLOUDFLARE_KV_NAMESPACE_ID!;

export type CctvEntry = {
  id: string;
  name: string;
  region: string;
  category: string;
  originUrl: string;   // HTTP 원본 (서버에서만 관리)
  active: boolean;
  addedAt: string;
};

/** KV에서 전체 CCTV 목록 가져오기 */
export async function listCctvEntries(): Promise<CctvEntry[]> {
  const res = await fetch(
    `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${nsId()}/keys`,
    { headers: headers() }
  );
  const { result } = await res.json() as { result: { name: string }[] };
  if (!result?.length) return [];

  const entries = await Promise.all(
    result.map(async ({ name }) => {
      const val = await getCctvEntry(name);
      return val ? { ...val, id: name } : null;
    })
  );
  return entries.filter(Boolean) as CctvEntry[];
}

/** KV에서 단일 CCTV 가져오기 */
export async function getCctvEntry(id: string): Promise<CctvEntry | null> {
  const res = await fetch(
    `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${nsId()}/values/${id}`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  try {
    return await res.json() as CctvEntry;
  } catch {
    return null;
  }
}

/** KV에 CCTV 추가/수정 */
export async function setCctvEntry(id: string, entry: Omit<CctvEntry, "id">): Promise<void> {
  await fetch(
    `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${nsId()}/values/${id}`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(entry),
    }
  );
}

/** KV에서 CCTV 삭제 */
export async function deleteCctvEntry(id: string): Promise<void> {
  await fetch(
    `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${nsId()}/values/${id}`,
    { method: "DELETE", headers: headers() }
  );
}

/** active 상태만 토글 */
export async function toggleCctvActive(id: string, active: boolean): Promise<void> {
  const entry = await getCctvEntry(id);
  if (!entry) return;
  await setCctvEntry(id, { ...entry, active });
}
