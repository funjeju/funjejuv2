import "server-only";
import { generateWithSearch } from "@/lib/biz/gemini";

/**
 * RAG 큐레이션 — 웹검색으로 "그 주제·지역에 실제로 맞는" 스팟만 우리 후보 중에서 선별.
 * (비짓제주 키워드검색이 안 되므로, 새 스팟 발굴 대신 우리 데이터의 적합성·순서를 웹지식으로 검증)
 * 추자도·엉뚱한 지역·주제 불일치를 자동 배제하고, 정확한 시즌/주제 맥락을 함께 반환.
 */

export type RagCandidate = { id: string; title: string; address?: string; intro?: string };

export type RagResult<T> = { picks: T[]; context: string; sources: string[] };

/**
 * @param topicLabel 사람이 읽는 주제 (예: "제주 서쪽 노을·일몰 명소", "7월 제주 물놀이·해변")
 * @param candidates 우리 풀의 후보(이미 지역/테마로 1차 필터된 것)
 * @param min 최소 확정 개수 (미만이면 null → 토픽 스킵)
 */
export async function ragCurate<T extends RagCandidate>(
  topicLabel: string,
  candidates: T[],
  min = 5,
): Promise<RagResult<T> | null> {
  if (candidates.length < min) return null;

  const list = candidates
    .slice(0, 25)
    .map((c) => `[${c.id}] ${c.title}${c.address ? ` (${c.address})` : ""}`)
    .join("\n");

  const prompt = `너는 제주 여행 콘텐츠 큐레이터다. 구글 검색으로 "${topicLabel}"에 대해 실제로 추천되는 곳을 확인하라.
그런 다음 아래 [우리 후보 목록] 중에서 "${topicLabel}"에 **실제로 적합한 곳만** 골라라.
- 주제(예: 노을/물놀이/실내/드라이브)와 지역(예: 동/서/남/북)이 명백히 안 맞는 곳은 제외하라.
- 폐업했거나 이 주제와 무관한 시설(렌터카·업체·전시행사 등)은 제외하라.
- 적합도 높은 순으로 정렬하라.

[우리 후보 목록]
${list}

[출력 형식]
첫 줄: "IDS: id1,id2,id3,..." (적합한 후보의 id만, 적합 순. 없으면 "IDS:")
이후: "CTX: " 뒤에 이 주제의 핵심 맥락 2~3줄 (계절/시기 특징·왜 좋은지, 사실 위주).`;

  let text = "", sources: string[] = [];
  try {
    const r = await generateWithSearch(prompt);
    text = r.text || "";
    sources = r.sources || [];
  } catch {
    return null; // 검증 불가 → 발행 보류(스킵)
  }

  const idLine = text.split("\n").find((l) => /^\s*IDS\s*:/i.test(l)) ?? "";
  const ids = idLine.replace(/^\s*IDS\s*:/i, "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const picks = ids.map((id) => byId.get(id)).filter((c): c is T => !!c);

  const ctxIdx = text.search(/CTX\s*:/i);
  const context = ctxIdx >= 0 ? text.slice(ctxIdx).replace(/^.*?CTX\s*:/i, "").trim().slice(0, 600) : "";

  if (picks.length < min) return null;
  return { picks, context, sources };
}
