import "server-only";
import OpenAI, { toFile } from "openai";

/**
 * 라이브피드 음식 사진 → "틀린그림찾기 합본 포스터" 한 장 생성.
 * (이 합본을 lib/spot-slice.ts 가 좌·우/상·하 두 패널로 잘라 어드민 출제로 넘긴다.)
 *
 * 프롬프트는 [스타일 슬롯] + [불변 코어] 구조:
 *  - 스타일 슬롯: POSTER_STYLES 프리셋(색감·타이포·무드·레이아웃 자유) — feedId 해시로 로테이션돼
 *    검정 일변도·구조 획일화를 깬다.
 *  - 불변 코어: 슬라이서가 기대하는 합본 계약(상단 헤더 띠 / 동일 크기 두 패널 + 가는 구분선 /
 *    하단 고딕 정답 캡션)과 틀린그림 규칙(5곳 정도·난이도 중하·골고루 분포·그레인 질감 금지).
 *    ※ 개수는 "5곳 정도"로만 유도 — 정확 개수는 관리자가 검수 때 찾은 만큼 마킹한다.
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

/** 식당 정보 + 스타일 프리셋 → 포스터+틀린그림 생성 프롬프트 (스타일 슬롯 + 불변 코어) */
export function buildPosterPrompt(shop: PosterInput, style: PosterStyle): string {
  return `첨부한 음식 사진으로 식당 홍보 포스터 틀린그림찾기를 만들어라.

■ 식당명: ${shop.shopName}
■ 영문명: ${shop.shopNameEn?.trim() || "(한글 식당명을 자연스러운 영문으로 자동 변환)"}
■ 메인 카피: ${shop.copy?.trim() || "(사진·메뉴에 어울리는 짧고 강한 카피 자동 작성)"}
■ 메뉴/재료: ${shop.menu?.trim() || "(사진을 보고 대표 메뉴·재료 자동 작성)"}

[1] 화질 개선 — 첨부 사진을 DSLR로 촬영한 전문 음식 사진 수준으로 고화질화한다(선명도·디테일·색감·조명 강화).

[2] 포스터 디자인 — 아래 스타일 지침을 따르고, 레이아웃(제목·카피·메뉴·장식의 배치 구조)은 스타일에 가장 어울리게 자유롭게 구성한다. 매번 똑같은 구도를 쓰지 마라.
  ★ 스타일 지침: ${style.direction}
  - 식당명은 포스터마다 1회, 눈에 띄게 크게. 메인 카피와 메뉴/재료도 자연스럽게 배치. 한글 텍스트는 또렷하고 정확하게.
  - 차이를 숨길 수 있는 그림 요소(소품·장식·아이콘·재료 그래픽 등)를 6개 이상 화면 곳곳에 분산 배치한다.
  - 배경과 표면은 매끈하고 균일하게. 필름 그레인·미세 노이즈·종이 질감 같은 픽셀 단위 랜덤 질감은 금지(복제 시 전면이 달라 보이게 되므로).

[3] 틀린그림찾기 합본 — 완성된 포스터로 틀린그림찾기를 만든다.
  - 포스터가 세로면 좌우 배치, 가로면 상하 배치. 두 패널은 테두리·프레임·그림자 없이 정확히 같은 크기로 복제하고, 두 패널 사이에는 배경과 대비되는 가는 구분선을 넣는다.
  - 한쪽은 원본, 다른 쪽은 동일한 포스터에서 5곳 정도만 변경한다. 변경한 곳 외의 나머지는 완전히 동일해야 한다.
  - 차이는 그림 요소와 텍스트에 골고루 섞고, 화면 상·하·좌·우·중앙에 널리 퍼지게 한다.
  - 난이도 중하: 집중하면 찾을 수 있는 수준. 한 글자만 바뀐 초미세 차이나 픽셀 단위 색차는 금지, 형태·색·유무가 눈에 들어오는 정도.
  - 상단 중앙에 전체 폭의 가로 띠로 헤더 "틀린그림찾기 | 다른 곳 5군데를 찾아보세요!" 를 수평 글씨로 넣는다.
  - 이미지 맨 하단에 전체 폭의 가로 띠로, 변경한 곳들의 정답을 읽기 쉬운 고딕체 작은 글씨로 적는다(캡션에는 스타일 장식을 적용하지 않는다). 예: "정답: ①상단 글자 ②중앙 음식 고명 ③좌측 소품 색 ④우측 장식 추가 ⑤하단 요소 제거".
2K 해상도로 출력.`;
}

/** 음식 사진(base64) + 식당 정보 → 합본 포스터 (jpeg/png base64) */
export async function generatePoster(opts: {
  foodBase64: string;
  mimeType?: string;
  shop: PosterInput;
  /** 미지정 시 기존과 동일한 다크 프리미엄 */
  style?: PosterStyle;
}): Promise<{ combinedBase64: string; mimeType: string; styleName: string }> {
  const style = opts.style ?? POSTER_STYLES[0];
  const prompt = buildPosterPrompt(opts.shop, style);
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
  return { combinedBase64: b64, mimeType: "image/png", styleName: style.name };
}
