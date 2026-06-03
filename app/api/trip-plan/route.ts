import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `너는 제주 여행 전문 플래너 '돌맹이'야. 사용자의 저장 스팟과 스타일에 맞춰 최적 동선의 일정을 짜줘.

[규칙]
- 동선 효율 최우선 (제주 동/서/남/북 권역별로 묶기)
- 시간대별로 자연스럽게 (오전 가벼움 → 점심 → 오후 활동 → 저녁 식사 → 노을/야경)
- 이동시간 고려해서 무리하지 않게
- 친근한 반말 멘트로 한 줄씩 코멘트
- 점심/저녁 식사 자리는 반드시 포함
- 마지막에 총평 한마디`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "일정 제목" },
    overview: { type: Type.STRING, description: "전체 컨셉 1-2문장" },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          theme: { type: Type.STRING, description: "그 날의 컨셉" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "HH:MM" },
                spot: { type: Type.STRING, description: "장소 이름" },
                category: { type: Type.STRING, description: "해변/오름/카페/맛집/관광지/이동" },
                emoji: { type: Type.STRING },
                comment: { type: Type.STRING, description: "돌맹이의 친근한 한 줄 멘트" },
                duration: { type: Type.STRING, description: "체류 시간 예: 1시간" },
              },
              required: ["time", "spot", "category", "emoji", "comment", "duration"],
            },
          },
        },
        required: ["day", "theme", "items"],
      },
    },
    tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "여행 팁 2-3개",
    },
    closing: { type: Type.STRING, description: "돌맹이의 마무리 한마디" },
  },
  required: ["title", "overview", "days", "tips", "closing"],
};

type Request = {
  spots: string[];
  style: string;
  days: number;
  travelers: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });

  const { spots, style, days, travelers } = (await req.json()) as Request;

  if (!spots?.length) {
    return NextResponse.json({ error: "저장한 스팟이 없어요" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `다음 조건으로 제주 여행 일정 짜줘:

- 저장 스팟: ${spots.join(", ")}
- 여행 스타일: ${style}
- 기간: ${days}일
- 인원: ${travelers}

저장한 스팟을 최대한 포함하되, 동선이 맞으면 비슷한 권역의 다른 추천 스팟도 자유롭게 추가해도 돼.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.8,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text;
    if (!text) return NextResponse.json({ error: "일정 생성 실패" }, { status: 500 });

    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    console.error("Trip plan error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
