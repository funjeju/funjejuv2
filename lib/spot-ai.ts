import "server-only";
import OpenAI, { toFile } from "openai";

/**
 * 원본 이미지 → "정확히 N군데만 다른" 변형 이미지 생성 (gpt-image-2, images/edits).
 * 어드민이 원본만 올리면 AI가 틀린그림을 만들어 줌. (실패 시 어드민이 직접 2장 업로드 폴백)
 *
 * gpt-image-2 (2026-04 출시): 한글 텍스트 ~99% 정확 + thinking 편집 →
 * 메뉴판·간판 텍스트 변형, "정확히 N군데만" 같은 세밀 편집에 유리.
 */

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const LEVEL: Record<string, string> = {
  subtle: "매우 미세하게",
  medium: "보통 수준으로",
  strong: "뚜렷하게",
};

export async function generateVariant(opts: {
  origBase64: string;
  mimeType: string;
  count: number;
  level?: string;
  extra?: string;
}): Promise<string> {
  const level = LEVEL[opts.level ?? "medium"] ?? "보통 수준으로";
  const prompt = `이 이미지와 거의 똑같되 정확히 ${opts.count}군데만 ${level} 변경한 이미지를 만드세요.
변경 방식: 색상·형태·개수·크기를 조합해 사용하세요.
전체 구도·스타일·해상도·비율·배경은 절대 바꾸지 마세요. 변경은 ${opts.count}군데로 제한하세요.${opts.extra ? `\n추가 지시: ${opts.extra}` : ""}`;

  const bytes = Buffer.from(opts.origBase64, "base64");
  const file = await toFile(bytes, "image.png", { type: opts.mimeType || "image/png" });

  const res = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: file,
    prompt,
    n: 1,
    size: "auto", // 원본 비율 유지
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("변형 이미지 생성 실패");
  return b64; // data URL 없는 순수 base64
}
