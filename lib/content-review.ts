import "server-only";
import { generateJSON, generateWithSearch } from "@/lib/biz/gemini";
import { createContent } from "@/lib/contents";
import type { Content, ContentSection } from "@/types/content";

/**
 * 2차 검수팀(AI) — 원고팀이 만든 draft를 발행 전에 검증.
 * 흐름: precheck(룰) + aiReview(검색 그라운딩 사실검증) → 통과만 발행, 반려는 draft 보류(이슈 첨부).
 * 반려본은 어드민이 자연어 지시를 주면 reviseWithNote로 AI가 반영 재작성.
 */

function bodyLen(c: Content): number {
  return (c.intro || "").length + (c.sections || []).reduce((a, s) => a + (s.body || "").length, 0);
}

/** 1층 룰체크 (무료·즉시) — 명백한 결함 */
export function precheck(c: Content): string[] {
  const issues: string[] = [];
  if (!c.title?.trim()) issues.push("제목 없음");
  if ((c.intro || "").trim().length < 30) issues.push("도입부(intro)가 너무 짧음");
  if ((c.sections?.length ?? 0) < 3) issues.push("본문 섹션이 3개 미만");
  if (bodyLen(c) < 600) issues.push("전체 본문이 너무 짧음(600자 미만)");
  const noImg = (c.sections || []).filter((s) => !s.image).length;
  if (c.sections?.length && noImg === c.sections.length) issues.push("섹션 이미지가 하나도 없음");
  return issues;
}

/** 2층 AI 검수 — 구글 검색으로 지리·사실·최신성 검증. 실패(과부하 등) 시 통과 처리(파이프라인 보호) */
export async function aiReview(c: Content): Promise<{ ok: boolean; issues: string[]; skipped?: boolean }> {
  const body = (c.sections || []).map((s) => `### ${s.heading}\n${s.body}`).join("\n\n");
  const prompt = `너는 제주 여행 콘텐츠 팩트체크 검수자다. 아래 글을 구글 검색으로 사실 확인해 검수해라.

[검수 기준 — 명백한 오류만 잡는다. 애매하거나 경미하면 무조건 PASS]
1. 지리 정합성: 제목/소개의 권역(동/서/남/북·중산간)·시기와 장소가 "명백히" 어긋나는가. (예: 추자도를 '서쪽'이라 함, 서귀포 장소를 '제주시 북쪽'이라 함 — 이런 명확한 위치 오류만)
2. 폐업/존재: 폐업했거나 실존하지 않는 장소를 소개하는가.
3. 명백한 날조: 데이터에 없는 구체 요금·운영시간·수상이력을 단정해 지어냈는가.
※ 문체·SEO·과장표현·소요시간 추정·주관적 묘사는 보지 마라. "오해 소지" 수준은 PASS. 확실한 사실/위치 오류만 FAIL.

[글]
제목: ${c.title}
소개: ${c.intro}
${body}

[출력 규칙]
- 문제 없으면 첫 줄에 정확히 "PASS" 한 단어만.
- 문제 있으면 첫 줄 "FAIL", 다음 줄부터 "- (문제): (어떻게 고칠지 지시)" 형식으로 최대 4개.`;

  try {
    const r = await generateWithSearch(prompt);
    const text = (r.text || "").trim();
    const first = text.split("\n")[0].toUpperCase();
    if (first.includes("PASS") && !first.includes("FAIL")) return { ok: true, issues: [] };
    const issues = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("-")).map((l) => l.replace(/^[-•]\s*/, "")).slice(0, 4);
    if (issues.length === 0 && !first.includes("FAIL")) return { ok: true, issues: [] }; // 모호하면 통과
    return { ok: false, issues: issues.length ? issues : ["검수팀이 사실 오류를 지적했으나 상세 미확인 — 수동 확인 필요"] };
  } catch {
    return { ok: true, issues: [], skipped: true }; // 검수 불가(과부하) → 발행 막지 않음
  }
}

export type ReviewOutcome = { published: boolean; verdict: "approved" | "flagged"; issues: string[]; id: string; slug: string };

/**
 * 이미지 엣지캐시 프리워밍 — 발행 직후 Next 이미지 최적화(webp·리사이즈) 결과를
 * 미리 한번 요청해 Vercel 엣지에 적재 → 첫 방문자가 콜드 비용을 안 떠안음.
 * 베스트에포트(실패 무시).
 */
async function warmImages(origin: string, imgs: (string | undefined)[]): Promise<void> {
  const urls = [...new Set(imgs.filter((u): u is string => !!u))].slice(0, 7);
  await Promise.allSettled(
    urls.flatMap((u, i) => {
      const ws = i === 0 ? [1080, 640] : [640]; // 커버는 큰사이즈도, 나머지는 본문폭만
      return ws.map((w) =>
        fetch(`${origin}/_next/image?url=${encodeURIComponent(u)}&w=${w}&q=75`, { signal: AbortSignal.timeout(15000) }).catch(() => undefined),
      );
    }),
  );
}

/** 검수 게이트 — 통과만 발행, 반려는 draft 보류(이슈 첨부). origin 주면 발행 후 이미지 프리워밍. */
export async function publishWithReview(draft: Content, origin?: string): Promise<ReviewOutcome> {
  const now = new Date().toISOString();
  const pre = precheck(draft);
  let issues = pre;
  let verdict: "approved" | "flagged" = "approved";

  if (pre.length > 0) {
    verdict = "flagged";
  } else {
    const r = await aiReview(draft);
    issues = r.issues;
    verdict = r.ok ? "approved" : "flagged";
  }

  draft.review = { verdict, issues, reviewedAt: now, rounds: 1 };
  if (verdict === "approved") {
    draft.status = "published";
    draft.publishedAt = now;
  } else {
    draft.status = "draft";
  }
  await createContent(draft);
  if (verdict === "approved" && origin) {
    await warmImages(origin, [draft.coverImage, ...(draft.sections || []).map((s) => s.image)]);
  }
  return { published: verdict === "approved", verdict, issues, id: draft.id, slug: draft.slug };
}

/* ── 관리자 프롬프트 재작성 ────────────────────────────── */
type ReviseAI = {
  title: string; subtitle: string; intro: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[]; keywords: string[];
};

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/**
 * 반려본을 어드민 자연어 지시대로 AI가 재작성 (사실 기반·구조 유지).
 * id·slug·type·이미지·extraLd·sourceIds는 보존. status는 draft로 두고 어드민이 발행.
 */
export async function reviseWithNote(c: Content, note: string): Promise<Content> {
  const cur = {
    title: c.title, subtitle: c.subtitle, intro: c.intro,
    sections: (c.sections || []).map((s) => ({ heading: s.heading, body: s.body })),
    faqs: c.faqs ?? [], keywords: c.keywords ?? [],
  };
  const prompt = `다음은 제주 여행 글이다. "관리자 수정 지시"를 정확히 반영해 같은 JSON 구조로 재작성하라.
- 지시와 무관한 부분은 최대한 그대로 유지.
- 없는 장소·사실을 새로 지어내지 마라. 잘못된 장소를 빼라고 하면 해당 섹션을 제거하면 된다(섹션 수 줄어도 됨).
- 섹션 heading은 가능하면 원본과 같게 유지(이미지 매칭용).

[관리자 수정 지시]
${note}

[현재 글 JSON]
${JSON.stringify(cur)}

반환 JSON: { "title", "subtitle", "intro", "sections":[{"heading","body"}], "faqs":[{"q","a"}], "keywords":[] }`;

  const ai = await generateJSON<ReviseAI>("너는 제주 여행 매거진 에디터다. 관리자 지시를 반영해 사실 기반으로 글을 재작성한다. 유효한 JSON만 반환.", prompt);

  // 이미지 보존: heading 매칭 우선, 실패 시 인덱스
  const oldByHeading = new Map((c.sections || []).map((s) => [norm(s.heading), s]));
  const sections: ContentSection[] = (ai.sections ?? []).map((s, i) => {
    const old = oldByHeading.get(norm(s.heading)) ?? c.sections?.[i];
    return { heading: s.heading || old?.heading || "", body: s.body || "", image: old?.image, category: old?.category, restaurantId: old?.restaurantId };
  });

  const cover = sections.find((s) => s.image)?.image ?? c.coverImage;
  return {
    ...c,
    title: ai.title || c.title,
    subtitle: ai.subtitle || c.subtitle,
    intro: ai.intro || c.intro,
    sections: sections.length ? sections : c.sections,
    faqs: (ai.faqs ?? c.faqs ?? []).filter((f) => f?.q && f?.a),
    keywords: ai.keywords?.length ? ai.keywords : c.keywords,
    coverImage: cover,
    status: "draft",
    review: { verdict: "flagged", issues: c.review?.issues ?? [], reviewedAt: new Date().toISOString(), rounds: (c.review?.rounds ?? 1) + 1, adminNote: note },
  };
}
