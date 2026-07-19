import "server-only";
import OpenAI, { toFile } from "openai";

/**
 * 라이브피드 음식 사진 → "식당 홍보 포스터 1장" 생성 (원본 음식 유지 + 보정 + 포스터화).
 *
 * ⚠️ 핵심: 사진 속 실제 음식은 그대로 두고 화질만 개선 + 포스터 디자인만 입힌다.
 *   음식을 새로 그리거나 바꾸지 않는다. (합본을 통째로 그리면 없는 패널을 새로 그려야 해서
 *   음식이 재생성됨 → 진짜 그 집 요리가 아니게 됨.)
 *
 * 프롬프트 = [스타일 슬롯] + [불변 코어]:
 *  - 스타일 슬롯: POSTER_STYLES 프리셋(색감·타이포·무드·레이아웃 자유) — feedId 해시로 로테이션.
 *  - 불변 코어: 원본 음식 절대 보존 + 화질 보정 + 상호·카피·메뉴·아이콘 배치.
 *
 * 틀린그림(변형 5곳)은 이 포스터를 lib/spot-ai.ts 의 generateVariant(영역 우선 마스크 편집)에
 * 넘겨 만든다 — 원본 픽셀을 보존한 채 5곳만 바꾸고 정답 마커까지 자동 반환.
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

export type PosterStyle = {
  id: string;
  name: string;       // 게임 문서에 기록되는 한글 이름 (성과 추적용)
  direction: string;  // 프롬프트 스타일 슬롯에 주입되는 지침 (2~3줄, 짧게)
};

export const POSTER_STYLES: PosterStyle[] = [
  {
    id: "dark-premium",
    name: "다크 프리미엄",
    direction:
      "어두운 프리미엄 다이닝 — 딥 차콜 배경, 따뜻한 앰버 조명, 골드 포인트, 고급 레스토랑 무드. 정갈하고 묵직한 타이포.",
  },
  {
    id: "bright-minimal",
    name: "밝은 미니멀",
    direction:
      "밝은 미니멀 — 크림·화이트 배경, 넉넉한 여백, 얇은 산세리프, 파스텔 포인트 컬러 1~2개, 산뜻한 브런치 카페 무드.",
  },
  {
    id: "retro-ad",
    name: "레트로 옛날광고",
    direction:
      "레트로 옛날 광고 — 아이보리 단색 배경, 굵은 옛날 간판체와 클래식 세리프, 빨강·남색 포인트, 라벨·도장·리본 장식, 7080 전단 무드.",
  },
  {
    id: "neon-night",
    name: "네온 나이트",
    direction:
      "네온 나이트 — 짙은 남보라 배경에 네온사인 컬러(핑크·시안·라임) 포인트, 빛나는 튜브 사인 느낌의 제목, 야시장·펍의 흥겨운 밤 무드.",
  },
  {
    id: "pop-art",
    name: "컬러 팝아트",
    direction:
      "컬러 팝아트 — 채도 높은 원색 배경(노랑·빨강·하늘 등), 굵은 검정 외곽선, 만화식 효과(집중선·말풍선 카피), 유쾌하고 경쾌한 무드.",
  },
  {
    id: "jeju-sea",
    name: "제주 바다감성",
    direction:
      "제주 감성 — 청록 바다·모래 베이지 톤의 밝은 배경, 손그림 일러스트 요소(파도·귤·현무암 등), 여행 엽서 같은 다정한 무드.",
  },
  {
    id: "euro-classic",
    name: "빈티지 유럽카페",
    direction:
      "빈티지 유럽 비스트로 — 버건디·올리브·크림 팔레트, 클래식 세리프, 금색 라인 장식, 고풍스럽고 우아한 무드.",
  },
  {
    id: "magazine",
    name: "모던 매거진",
    direction:
      "모던 매거진 — 밝은 배경에 대형 컬러 타이포그래피, 과감한 화보식 구도, 세련된 잡지 커버 무드.",
  },
];

/** feedId 등 시드 문자열 → 결정적 스타일 선택 (같은 피드=같은 스타일, 피드별로 골고루 분산) */
export function pickPosterStyle(seed: string): PosterStyle {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return POSTER_STYLES[h % POSTER_STYLES.length];
}

/** 식당 정보 + 스타일 프리셋 → 포스터 1장 생성 프롬프트 (원본 음식 보존을 최우선 강제). */
export function buildPosterPrompt(shop: PosterInput, style: PosterStyle): string {
  return `첨부한 이 음식 사진 "그 자체"를 사용해 식당 홍보 포스터 1장을 만들어라.

■ 식당명: ${shop.shopName}
■ 영문명: ${shop.shopNameEn?.trim() || "(한글 식당명을 자연스러운 영문으로 자동 변환)"}
■ 메인 카피: ${shop.copy?.trim() || "(사진·메뉴에 어울리는 짧고 강한 카피 자동 작성)"}
■ 메뉴/재료: ${shop.menu?.trim() || "(사진을 보고 대표 메뉴·재료 자동 작성)"}

【절대 규칙 — 반드시 지켜라】
- 사진 속 실제 음식(요리 종류·플레이팅·그릇·담긴 모양·재료·구도)은 원본 그대로 유지한다.
- 다른 음식으로 바꾸거나, 없는 재료·고명·반찬을 새로 만들어 넣지 마라. 음식은 "그 집의 진짜 그 요리"여야 한다.
- 하는 일은 딱 둘: (1) 화질 개선 — 선명도·디테일·색감·조명을 DSLR 촬영 수준으로 보정. (2) 아래 스타일로 포스터 디자인 입히기.

【포스터 디자인】
★ 스타일 지침: ${style.direction}
- 레이아웃(제목·카피·메뉴·장식의 배치)은 스타일에 가장 어울리게 자유롭게 구성한다. 매번 같은 구도를 쓰지 마라.
- 식당명(한글+영문)은 눈에 띄게 크게 1회. 메인 카피와 메뉴/재료도 자연스럽게 배치. 한글 텍스트는 또렷하고 정확하게(오탈자 없이).
- 하단에 음식 특징 아이콘 + 짧은 설명 4개.
- 세로형 포스터. 2K 해상도.`;
}

/** 음식 사진(base64) + 식당 정보 → 포스터 1장 (png base64). 원본 음식 유지 + 보정 + 포스터화. */
export async function generatePoster(opts: {
  foodBase64: string;
  mimeType?: string;
  shop: PosterInput;
  /** 미지정 시 기본 다크 프리미엄 */
  style?: PosterStyle;
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<{ posterBase64: string; mimeType: string; styleName: string }> {
  const style = opts.style ?? POSTER_STYLES[0];
  const prompt = buildPosterPrompt(opts.shop, style);
  const ext = (opts.mimeType ?? "image/png").includes("jpeg") ? "image.jpg" : "image.png";

  const res = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: await toFile(Buffer.from(opts.foodBase64, "base64"), ext, { type: opts.mimeType ?? "image/png" }),
    prompt,
    n: 1,
    size: "1024x1536",
    ...(opts.quality ? { quality: opts.quality } : {}),
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("포스터 생성 실패");
  return { posterBase64: b64, mimeType: "image/png", styleName: style.name };
}
