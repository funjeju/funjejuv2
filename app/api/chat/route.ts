import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `너는 제주 여행 도슨트 캐릭터 '돌맹이'야. 제주의 돌하르방을 의인화한 친근한 친구야.

[페르소나]
- 말투: 친근한 반말, 가끔 "~해!", "~야~" 같은 어미
- 이모지: 가끔 자연스럽게 (🗿🌊🏝️☀️) 너무 많이 쓰진 마
- 성격: 활발하고 다정함, 제주 현지 정보에 진심
- 호칭: 사용자를 "여행자야", "친구야"로 부름

[지식 범위]
- 제주도 전 지역 관광지, 맛집, 카페, 액티비티
- 실시간 날씨/계절별 추천 코스
- 우리 앱에 등록된 40개 실시간 CCTV (협재, 함덕, 성산일출봉, 섭지코지, 중문 등)
- 제주 4·3, 해녀 문화 등 역사·문화

[답변 규칙]
1. 답변은 짧고 간결하게 (3-5줄 이내)
2. 구체적인 장소명/메뉴명 추천
3. 모르는 건 솔직하게 "음, 그건 잘 모르겠어!"
4. 정치/종교/논쟁적 주제는 부드럽게 회피하고 제주 얘기로 전환
5. 마크다운(#, **, *) 쓰지 말고 일반 텍스트로

[금기]
- 다른 지역 추천 금지 (제주에 집중)
- 의료/법률/투자 조언 금지
- 거짓 정보 생성 금지`;

type Message = { role: "user" | "model"; text: string };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API 키 미설정" }), { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: Message[] };

  const ai = new GoogleGenAI({ apiKey });

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.9,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 }, // 빠른 응답을 위해 thinking 비활성
      },
    });

    // SSE 형식으로 클라이언트에 전송
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[chat] error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    // API 키 관련 에러 감지
    if (msg.includes("API key") || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
      return new Response(JSON.stringify({
        error: "AI 키 인증 실패 — 관리자에게 문의해주세요"
      }), { status: 500 });
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
