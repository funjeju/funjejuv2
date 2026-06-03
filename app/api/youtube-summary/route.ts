import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `너는 제주 여행 유튜브를 분석해서 핵심 스팟을 뽑아주는 큐레이터야.

영상에서 다음을 추출해:
1. 전체 요약 (3-4문장, 친근한 반말)
2. 등장하는 제주 장소들 (이름, 카테고리, 한줄설명, 영상 등장 시점)
3. 추천 코스 순서 (영상의 흐름대로)

[규칙]
- 제주가 아닌 장소는 제외
- 정확한 장소명만 (확실치 않으면 빼)
- 시간은 "MM:SS" 형식
- 카테고리: 해변/오름/카페/맛집/관광지/액티비티/숙소 중 하나`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "영상 제목" },
    summary: { type: Type.STRING, description: "3-4문장 요약" },
    duration: { type: Type.STRING, description: "영상 길이 MM:SS" },
    spots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          timestamp: { type: Type.STRING, description: "MM:SS" },
          emoji: { type: Type.STRING, description: "장소 분위기 이모지 1개" },
        },
        required: ["name", "category", "description", "timestamp", "emoji"],
      },
    },
    course: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "장소명 배열 (영상 순서대로)",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "영상 키워드 3-5개",
    },
  },
  required: ["title", "summary", "duration", "spots", "course", "tags"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  const { url } = (await req.json()) as { url: string };

  if (!url || !/youtube\.com|youtu\.be/.test(url)) {
    return NextResponse.json({ error: "올바른 유튜브 URL을 입력해주세요" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: url, mimeType: "video/*" } },
            { text: "이 제주 여행 유튜브 영상을 분석해서 JSON 스키마에 맞게 추출해줘." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "분석 실패" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    console.error("YouTube summary error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
