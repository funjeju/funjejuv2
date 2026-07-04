import "server-only";
import OpenAI, { toFile } from "openai";

/**
 * 라이브피드 음식 사진 → "틀린그림찾기 합본 포스터" 한 장 생성.
 * (이 합본을 lib/spot-slice.ts 가 좌·우/상·하 두 패널로 잘라 어드민 출제로 넘긴다.)
 *
 * 아래 POSTER_PROMPT 의 고정부는 모든 식당 공통(소스 상수), 변수부(식당명·영문명·카피·메뉴)만
 * 업소별 데이터로 주입한다. 비우면 사진·메뉴 보고 자동 작성하도록 프롬프트에서 분기.
 */

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export type PosterInput = {
  shopName: string;
  shopNameEn?: string;
  copy?: string;
  menu?: string;
};

/** 식당 정보 → 포스터+틀린그림 생성 프롬프트 (고정부 + 변수 슬롯) */
export function buildPosterPrompt(shop: PosterInput): string {
  return `첨부한 음식 사진으로 식당 홍보 포스터 틀린그림찾기를 만들어라.

■ 식당명: ${shop.shopName}
■ 영문명: ${shop.shopNameEn?.trim() || "(한글 식당명을 자연스러운 영문으로 자동 변환)"}
■ 메인 카피: ${shop.copy?.trim() || "(사진·메뉴에 어울리는 짧고 강한 카피 자동 작성)"}
■ 메뉴/재료: ${shop.menu?.trim() || "(사진을 보고 대표 메뉴·재료 자동 작성)"}

[0] 메인 객체 파악 — 먼저 사진의 메인 음식을 파악하고, 그에 가장 잘 어울리는 포스터 형식·레이아웃·분위기를 정한다.
[1] 화질 개선 — 첨부 사진을 DSLR로 촬영한 전문 음식 사진 수준으로 고화질화한다(선명도·디테일·색감·조명 강화).
[2] 포스터화 — 식당명(한글+영문)·메인 카피·메뉴/재료를 자연스럽게 배치. 어두운 프리미엄 배경에 따뜻한 톤. 한글 텍스트는 또렷하고 정확하게. 하단에 음식 특징 아이콘+짧은 설명 4개.
[3] 틀린그림찾기 — 완성된 포스터로 틀린그림찾기를 만든다.
  - 포스터가 세로면 좌우 배치, 가로면 상하 배치.
  - 한쪽은 원본, 다른 쪽은 동일 포스터에서 딱 5곳만 변경(차이 정확히 5개).
  - 차이 분포: 메인 객체에서 1~2개 / 텍스트에서 1~2개 / 배경부(반찬·소품·배경·하단 아이콘)에서 1~2개, 합이 정확히 5개. 화면 상·하·좌·우·중앙에 골고루 퍼지게.
  - 난이도 중하: 집중하면 찾을 수 있는 수준. 한 글자만 바뀐 초미세 차이나 픽셀 단위 색차는 금지, 형태·색·유무가 눈에 들어오는 정도.
  - 상단 중앙에 헤더 "틀린그림찾기 | 다른 곳 5군데를 찾아보세요!" 를 넣는다.
  - 이미지 맨 하단에 변경한 5곳의 정답을 최대한 작은 글씨로 적는다. 예: "정답: ①상단 영문명 ②중앙 고명 ③메뉴 글자 ④좌측 반찬 색 ⑤하단 아이콘".
2K 해상도로 출력.`;
}

/** 음식 사진(base64) + 식당 정보 → 합본 포스터 (jpeg/png base64) */
export async function generatePoster(opts: {
  foodBase64: string;
  mimeType?: string;
  shop: PosterInput;
}): Promise<{ combinedBase64: string; mimeType: string }> {
  const prompt = buildPosterPrompt(opts.shop);
  const ext = (opts.mimeType ?? "image/png").includes("jpeg") ? "image.jpg" : "image.png";

  const res = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: await toFile(Buffer.from(opts.foodBase64, "base64"), ext, { type: opts.mimeType ?? "image/png" }),
    prompt,
    n: 1,
    size: "1536x1024", // 좌우 합본에 맞는 가로형 2K급
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("포스터 생성 실패");
  return { combinedBase64: b64, mimeType: "image/png" };
}
