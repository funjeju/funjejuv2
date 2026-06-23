import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * 비즈 홈페이지 생성용 Gemini 헬퍼 (aiweb 이식)
 *
 * aiweb 원본은 구 SDK(@google/generative-ai) 기반이었으나,
 * funjeju 표준인 신 SDK(@google/genai)로 포팅했다.
 * - generateJSON: 시스템 프롬프트 + JSON 응답
 * - searchBusinessInfo: 구글 검색 그라운딩으로 실제 가게 정보 수집 (날조 방지)
 * - analyzeImageJSON: 메뉴판 OCR
 */

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

const MODEL = "gemini-2.5-flash";

function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]) as T;
    throw new Error("AI returned invalid JSON");
  }
}

// 일시적 과부하(503/UNAVAILABLE/overloaded·429)면 잠깐 쉬었다 재시도 — 자동발행 크론이 한 슬롯 통째로 날리지 않게.
function isTransient(e: unknown): boolean {
  const s = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return s.includes("503") || s.includes("unavailable") || s.includes("overloaded") || s.includes("high demand") || s.includes("429") || s.includes("rate");
}

export async function generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const attempts = 4;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await getAI().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const text = res.text;
      if (!text) throw new Error("AI returned empty response");
      return parseJSON<T>(text);
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1 && isTransient(e)) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1))); // 1.5s·3s·4.5s 백오프
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Google Search grounding으로 실제 웹 검색 기반 텍스트를 생성한다.
 * (grounding 사용 시 JSON 응답 모드를 못 쓰므로 텍스트로 반환)
 */
export interface SearchResult {
  text: string;
  grounded: boolean;
  sources: string[];
}

export async function generateWithSearch(prompt: string): Promise<SearchResult> {
  const res = await getAI().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { tools: [{ googleSearch: {} }] },
  });
  const text = res.text ?? "";
  const candidate = res.candidates?.[0] as
    | { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }
    | undefined;
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks.map((c) => c.web?.uri || c.web?.title || "").filter(Boolean);
  return { text, grounded: sources.length > 0, sources };
}

export interface BusinessInfo {
  name: string;
  category: string;
  address: string;
  phone: string;
  description: string;
  businessHours: string;
  menuItems: Array<{ name: string; price: number }>;
  reviews: string[];
  vibes: string[];
  found: boolean;
  grounded: boolean;
  sources: string[];
}

/**
 * 상호명(+업종/지역)으로 웹 검색해 실제 가게 정보를 구조화한다.
 * 1단계: Google Search grounding으로 실제 정보 수집(텍스트)
 * 2단계: 수집한 텍스트를 JSON으로 구조화 (없는 값은 빈 값 — 날조 금지)
 */
export async function searchBusinessInfo(
  name: string,
  category?: string,
  region?: string
): Promise<BusinessInfo> {
  const query = [
    `${name}`,
    category || "",
    region || "제주",
    "이 가게를 웹에서 검색해서 주소, 전화번호, 영업시간, 소개, 대표 메뉴와 가격, 손님 후기를 정리해줘.",
    "네이버·인스타그램·카카오맵·블로그 등 검색 결과를 적극 활용해.",
  ]
    .filter(Boolean)
    .join(" ");

  const empty: BusinessInfo = {
    name: "", category: category || "", address: "", phone: "",
    description: "", businessHours: "", menuItems: [], reviews: [], vibes: [],
    found: false, grounded: false, sources: [],
  };

  let search: SearchResult;
  try {
    search = await generateWithSearch(query);
  } catch (err) {
    console.error("[biz] grounding search failed:", err);
    return empty;
  }

  if (!search.text || search.text.trim().length < 10) {
    return { ...empty, grounded: search.grounded, sources: search.sources };
  }

  const STRUCT_PROMPT = `
다음은 웹 검색으로 수집한 가게 정보 텍스트다. 여기서 사실 정보를 추출해 JSON으로 정리하라.
규칙:
- 텍스트에 나온 주소/전화/영업시간/소개는 그대로 사용한다.
- 메뉴는 가격이 명시된 것만 넣는다. 가격을 모르면 그 메뉴는 제외(0 금지).
- 후기는 텍스트에 실제로 인용된 후기 문장만. 없으면 빈 배열.
- 텍스트에 전혀 없는 항목은 빈 값으로 둔다 (지어내지 말 것).

반환 형식 (JSON):
{
  "name": "", "category": "", "address": "", "phone": "",
  "description": "", "businessHours": "",
  "menuItems": [{ "name": "", "price": 0 }],
  "reviews": [],
  "vibes": []
}
`.trim();

  try {
    const data = await generateJSON<Omit<BusinessInfo, "found" | "grounded" | "sources">>(
      STRUCT_PROMPT,
      search.text
    );
    const cleanMenu = (data.menuItems ?? []).filter((m) => m.name && m.price > 0);
    const found = !!(data.name || data.address || data.phone || data.description || cleanMenu.length);
    return {
      ...empty,
      ...data,
      menuItems: cleanMenu,
      category: data.category || category || "",
      found,
      grounded: search.grounded,
      sources: search.sources,
    };
  } catch {
    return { ...empty, grounded: search.grounded, sources: search.sources };
  }
}

export async function analyzeImageJSON<T>(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<T> {
  const res = await getAI().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: "이 이미지를 분석하라." },
        ],
      },
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = res.text;
  if (!text) throw new Error("AI returned empty response");
  return parseJSON<T>(text);
}
