import "server-only";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";

/**
 * 틀린그림찾기 변형 생성 — gpt-image-2에게 통째로 틀린그림 생성 위임.
 * 마커(정답 좌표)는 빈 배열로 반환 → 어드민이 직접 찾아서 마킹.
 */

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export type VariantResult = {
  variantBase64: string;
  origBase64: string;
  mimeType: string;
  markers: { x: number; y: number }[];
  notes: string[];
};

const MAX_WIDTH = 1024;

export async function generateVariant(opts: {
  origBase64: string;
  mimeType: string;
  count: number;
  level?: string;
  extra?: string;
}): Promise<VariantResult> {
  let base = sharp(Buffer.from(opts.origBase64, "base64"));
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("이미지를 읽을 수 없습니다");
  if (meta.width > MAX_WIDTH) base = base.resize(MAX_WIDTH);
  const origPng = await base.png().toBuffer();

  const levelGuide = opts.level === "subtle"
    ? "미묘하고 어려운 차이"
    : opts.level === "strong"
      ? "눈에 잘 띄는 확실한 차이"
      : "적당한 난이도의 차이";

  const prompt = `이 이미지로 틀린그림찾기 게임을 만들어야 합니다.
이 이미지와 거의 동일하되, 정확히 ${opts.count}곳만 다른 변형 이미지를 생성하세요.

규칙:
- 전체적인 구도, 배경, 색감, 분위기는 원본과 최대한 동일하게 유지
- ${opts.count}곳만 자연스럽게 변경 (색상 변경, 객체 제거, 객체 추가, 크기 변경, 방향 반전 등 고전 틀린그림찾기 유형)
- 변경은 ${levelGuide}로
- 사람 얼굴은 건드리지 않기
- 변경 부분이 너무 작거나 미미하면 안 됨 — 주의 깊게 보면 찾을 수 있는 수준
${opts.extra ? `- 추가 요청: ${opts.extra}` : ""}`;

  const res = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: await toFile(origPng, "image.png", { type: "image/png" }),
    prompt,
    n: 1,
    size: "auto",
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("변형 이미지 생성 실패");

  const [origJpeg, variantJpeg] = await Promise.all([
    sharp(origPng).jpeg({ quality: 88 }).toBuffer(),
    sharp(Buffer.from(b64, "base64")).jpeg({ quality: 88 }).toBuffer(),
  ]);

  return {
    variantBase64: variantJpeg.toString("base64"),
    origBase64: origJpeg.toString("base64"),
    mimeType: "image/jpeg",
    markers: [],
    notes: [],
  };
}
