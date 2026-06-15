import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `너는 제주 로컬 브랜드의 카피라이터다. 감성 글쓰기와 마케팅 후킹을 둘 다 할 줄 안다.
주어진 사진 1장을 깊게 관찰해서, 그 사진에서만 나올 수 있는 '한 줄'을 뽑아낸다.

[작업 순서 — 반드시 순서대로 사고]
1) 관찰(observation): 사진을 구체적으로 읽는다. 피사체가 무엇인지, 빛/시간대(아침·한낮·노을·밤), 색감, 계절·날씨, 질감, 분위기, 사람의 행동이나 음식/음료의 상태까지. 추측이 아니라 '보이는 것'을 적는다.
2) 카테고리 판별: 자연 | 카페 | 맛집 | 액티비티 | 숙소 중 하나.
3) 톤 분기:
   - "자연"이면 → 감성 100%. 시적·여운 있는 명사형. 풍경이 주는 감정을 건드린다.
   - 그 외(카페·맛집·액티비티·숙소)이면 → 마케팅 70% + 감성 30%. 가고 싶게 만드는 후킹. 사진 속 구체적 디테일(메뉴·뷰·공간감)을 미끼로 건다. 단, 광고처럼 "예약!", "할인" 같은 직접 호객은 금지.
4) 후보(candidates) 3개를 서로 다른 결로 만든다. 그중 가장 사진에 밀착되고 후킹이 강한 하나를 copy로 고른다.

[카피 규칙]
- 정확히 10~22자 (공백 포함)
- 한국어, 반말 또는 명사형
- 해시태그·따옴표·이모지·마침표 없이 문구만
- 클리셰 금지: "힐링이다", "행복해", "너무 예뻐요", "인생샷", "여기가 제주" 류 전면 금지
- 사진과 무관한 범용 문구 금지. 이 사진이 아니면 못 쓸 한 줄을 만든다.

[예시]
자연(감성): "노을이 바다를 데우는 시간", "바람만 아는 돌담길"
카페(마케팅70+30): "통창 너머로 한라산이 통째로", "이 라떼 한 잔이면 오전이 길어진다"
맛집(마케팅70+30): "돌판에 올라온 흑돼지, 기름이 노래한다", "줄 서는 이유는 이 국물이다"

[출력]
JSON으로만 응답. 다른 설명 금지.
{ "observation": "사진 관찰 요약", "candidates": ["후보1","후보2","후보3"], "copy": "최종 한 줄", "category": "자연|카페|맛집|액티비티|숙소" }`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  try {
    const { imageBase64, mimeType } = (await req.json()) as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "이미지가 필요해요" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mimeType ?? "image/jpeg", data: imageBase64 } },
            { text: "이 사진을 관찰→카테고리 판별→톤 분기→후보3개→베스트 선택 순으로 처리해서 JSON으로만 응답해." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as const,
          properties: {
            observation: { type: "string" as const },
            candidates: { type: "array" as const, items: { type: "string" as const } },
            copy: { type: "string" as const },
            category: { type: "string" as const },
          },
          required: ["copy", "category"],
        },
        temperature: 1.0,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 512 },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "AI 응답 실패" }, { status: 500 });
    }

    const parsed = JSON.parse(text) as { copy?: string; category?: string; candidates?: string[]; observation?: string };
    // 클라이언트는 copy/category만 쓰지만, candidates도 함께 내려 어드민/재생성에서 활용 가능
    return NextResponse.json({ copy: parsed.copy, category: parsed.category, candidates: parsed.candidates ?? [] });
  } catch (e) {
    console.error("[feed-copy] error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("API key") || msg.includes("403")) {
      return NextResponse.json({ error: "AI 키 인증 실패" }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
