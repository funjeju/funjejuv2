import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `너는 인스타그램 감성 카피라이터야. 제주 여행 사진을 보고 인스타에 어울리는 짧고 감각적인 한 줄 문구를 만들어줘.

[규칙]
- 정확히 10~20자 (공백 포함)
- 한국어, 반말 또는 명사형
- 인스타그램 감성 (시적·감성적·여운)
- 해시태그 없이 문구만
- 따옴표·이모지·마침표 없이
- 진부한 표현 금지 ("힐링이다", "행복해" 같은 클리셰)

[예시]
좋은 예: "바람이 머무는 자리", "여기, 제주의 시간", "파도가 그린 그림", "노을 한 잔 어때요"
나쁜 예: "오늘도 제주에서 힐링!", "제주 바다 너무 예뻐요 ㅎㅎ"

[출력]
JSON 형식으로만 응답해. 다른 설명 금지.
{ "copy": "여기에 한 줄 문구만", "category": "자연 | 카페 | 맛집 | 액티비티 | 숙소 중 하나" }`;

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
            { text: "이 사진을 보고 인스타 감성 카피와 카테고리를 만들어줘. JSON으로만 응답해." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as const,
          properties: {
            copy: { type: "string" as const },
            category: { type: "string" as const },
          },
          required: ["copy", "category"],
        },
        temperature: 1.0,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "AI 응답 실패" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    console.error("[feed-copy] error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("API key") || msg.includes("403")) {
      return NextResponse.json({ error: "AI 키 인증 실패" }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
