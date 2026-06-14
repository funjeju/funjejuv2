import "server-only";
import { readFile } from "fs/promises";
import path from "path";

/** data/jeju-dialect.json (제주도청 OpenAPI 캐시) 구조 */
type DialectEntry = { jeju: string; standard: string; en?: string; soundUrl?: string; type?: string };
type LifePhrase = { title: string; text: string };
type DialectData = { dictionary: DialectEntry[]; lifePhrases: LifePhrase[] };

let cache: DialectData | null = null;

async function load(): Promise<DialectData> {
  if (cache) return cache;
  const raw = await readFile(path.join(process.cwd(), "data", "jeju-dialect.json"), "utf-8");
  const j = JSON.parse(raw);
  cache = { dictionary: j.dictionary ?? [], lifePhrases: j.lifePhrases ?? [] };
  return cache;
}

/**
 * 검증된 제주어 어미·인사 (사전 + 생활방언에서 확인된 실제 표현).
 * 관광객도 알아듣는 "양념" 수준 — 전부 실제 제주어라 모델이 지어낼 여지 없음.
 */
const CORE_ENDINGS = [
  "혼저옵서예 (어서오세요)",
  "~수다 / ~우다 (~습니다)",
  "~마씀 / ~마씸 (~요, 강조·존대)",
  "~우꽈? / ~꽈? (~요?, 질문)",
  "~십서 (~하세요)",
  "게메 (그러게)",
  "기여~ / 게난 (그래 / 그러니까)",
  "양 (~요, 부드러운 끝맺음)",
  "삼춘 (이웃 어른 호칭)",
  "폭삭 속았수다 (정말 수고하셨습니다)",
];

/**
 * 사용자 메시지/답변 텍스트에 등장하는 표준어를 제주어로 바꿀 후보를 사전에서 찾는다.
 * (예: 텍스트에 "할머니" → "할망" 매칭) — 맥락에 맞는 검증 단어만 주입.
 */
export async function findDialectFor(text: string, max = 20): Promise<DialectEntry[]> {
  const { dictionary } = await load();
  if (!text) return [];
  const hits: DialectEntry[] = [];
  const seen = new Set<string>();
  for (const e of dictionary) {
    if (hits.length >= max) break;
    // 표준어 의미가 텍스트에 그대로 등장하고, 너무 짧지 않은 단어만 (오매칭 방지)
    if (e.standard.length >= 2 && text.includes(e.standard) && !seen.has(e.jeju)) {
      seen.add(e.jeju);
      hits.push(e);
    }
  }
  return hits;
}

/** 짧고 자연스러운 생활방언 예문 몇 개 (말투 학습용) */
export async function getLifeSamples(n = 2): Promise<string[]> {
  const { lifePhrases } = await load();
  return lifePhrases
    .filter((p) => p.text.length >= 20 && p.text.length <= 220)
    .slice(0, n)
    .map((p) => p.text.replace(/\n+/g, " ").trim());
}

/**
 * 돌AI(제주어 모드) 시스템 프롬프트에 끼울 그라운딩 블록 생성.
 * 검증된 어미 + 맥락 단어 + 예문만 제공하고, "이 안에서만 쓰라"고 못박는다.
 */
export async function buildDialectGrounding(userText: string, draftHint?: string): Promise<string> {
  const ctxWords = await findDialectFor(`${userText} ${draftHint ?? ""}`);
  const samples = await getLifeSamples(2);
  const wordLines = ctxWords.map((w) => `- ${w.jeju} = ${w.standard}`).join("\n");

  return [
    "[제주어 모드 — 너는 '돌AI', 제주 토박이 삼춘 같은 도슨트다]",
    "아래는 제주도청 공식 방언 데이터로 검증된 표현이다. 제주어는 반드시 이 목록 안에서만 써라. 모르는 제주어를 지어내지 마라.",
    "",
    "[자주 쓰는 제주어 어미·인사 — 이대로만]",
    CORE_ENDINGS.map((e) => `- ${e}`).join("\n"),
    ctxWords.length ? `\n[이번 답변에 쓸 수 있는 검증 단어]\n${wordLines}` : "",
    samples.length ? `\n[실제 제주어 말투 예시 (느낌만 참고)]\n${samples.map((s) => `· ${s}`).join("\n")}` : "",
    "",
    "[작성 규칙]",
    "- 표준어 문장에 제주어 어미·단어를 자연스럽게 섞는다(양념 수준). 관광객이 못 알아들을 정도의 전면 제주어는 금지.",
    "- 처음 보는 제주어 단어를 쓰면 바로 옆 괄호에 표준어 뜻을 적어준다. 예: \"폭삭 속았수다(정말 수고하셨어요)\".",
    "- 정보(맛집·장소 등) 내용 자체는 정확해야 하고, 말투만 제주어로 입힌다.",
  ].filter(Boolean).join("\n");
}
