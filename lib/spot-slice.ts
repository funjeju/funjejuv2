import "server-only";
import OpenAI from "openai";
import sharp from "sharp";
import type { SpotLayout } from "@/types/spot";

/**
 * 틀린그림 "합본 한 장" → 어드민 출제용 두 패널로 자동 슬라이스.
 *
 * 합본 포스터는 [상단 헤더] / [원본·변형 두 패널] / [하단 정답캡션] 3밴드 구조다.
 * 핵심은 "맹목적 50% 컷"이 아니라 OCR 앵커:
 *  1) gpt-5-mini 비전이 헤더 하단선·정답캡션 상단선·두 패널의 분할선·복제축을 % 로 찍어줌
 *  2) 복제축(가로=side / 세로=stack)으로 레이아웃 자동 판별
 *  3) sharp 로 위·아래 밴드를 잘라내고 안쪽을 좌·우(또는 상·하)로 분할
 *  4) 변형 패널을 원본 패널과 동일 해상도로 맞춰 마커 % 좌표가 두 장에서 정렬되게 함
 *  5) 정답캡션 텍스트는 어드민 검수용 체크리스트로 함께 반환 (마커는 비워서 사람이 클릭)
 */

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MAX_WIDTH = 2048; // 2K 합본 입력 상한

export type SliceResult = {
  layout: SpotLayout;
  /** 원본 패널 (좌 또는 상) jpeg base64 */
  origBase64: string;
  /** 변형 패널 (우 또는 하) jpeg base64 — 원본과 동일 해상도 */
  variantBase64: string;
  mimeType: string;
  /** 하단 정답캡션에서 읽어낸 변경 내역 (검수 체크리스트용, 없을 수 있음) */
  answers: string[];
};

type Anchors = {
  axis: "horizontal" | "vertical";
  headerCut: number;   // 상단 헤더 밴드의 하단선 (% of height)
  captionCut: number;  // 하단 정답캡션의 상단선 (% of height, 없으면 100)
  panelCut: number;    // 두 패널 분할선 (분할축 기준 %)
  answers: string[];
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(typeof v === "number" && isFinite(v) ? v : (lo + hi) / 2, lo), hi);

// ── 1단계: 비전이 절단선·복제축을 찍는다 ────────────────────
async function findAnchors(dataUrl: string): Promise<Anchors> {
  const prompt = `이 이미지는 식당 포스터 "틀린그림찾기 합본"이다. 똑같은 포스터가 좌우 또는 상하로 2번 복제돼 있고,
맨 위에는 "틀린그림찾기 …" 헤더 띠, 맨 아래에는 "정답: ①… ②…" 정답 캡션 띠가 전체폭으로 깔려 있다.

다음을 판정해 JSON으로만 답하라.
- axis: 같은 포스터가 "좌우(horizontal)"로 복제됐으면 "horizontal", "상하(vertical)"면 "vertical".
  로고/제목 같은 랜드마크가 두 번 나오는데, 그 두 복제본이 가로로 벌어져 있으면 horizontal, 세로면 vertical.
- headerCut: 상단 헤더 띠의 "아래 경계" 세로 위치 (이미지 높이 대비 %, 0~100). 헤더가 없으면 0.
- captionCut: 하단 정답 캡션 띠의 "위 경계" 세로 위치 (이미지 높이 대비 %, 0~100). 캡션이 없으면 100.
- panelCut: 두 복제 패널을 가르는 분할선의 위치 (%). axis가 horizontal이면 이미지 폭 대비(보통 50 근처),
  vertical이면 헤더와 캡션 사이의 높이 대비. 두 패널 사이의 정확한 경계로.
- answers: 하단 "정답:" 캡션에 적힌 항목들을 ①~⑤ 순서대로 문자열 배열로. 못 읽으면 빈 배열 [].

{"axis":"horizontal","headerCut":6,"captionCut":92,"panelCut":50,"answers":["상단 영문명 변경","고추 슬라이스 추가","…","…","…"]}`;

  const res = await getOpenAI().chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Partial<Anchors>;
  return {
    axis: raw.axis === "vertical" ? "vertical" : "horizontal",
    headerCut: clamp(raw.headerCut ?? 0, 0, 30),
    captionCut: clamp(raw.captionCut ?? 100, 70, 100),
    panelCut: typeof raw.panelCut === "number" ? raw.panelCut : 50,
    answers: Array.isArray(raw.answers) ? raw.answers.map((s) => String(s)).slice(0, 8) : [],
  };
}

// ── 메인 ────────────────────────────────────────────────────
export async function sliceCombined(opts: {
  combinedBase64: string;
  mimeType?: string;
}): Promise<SliceResult> {
  let base = sharp(Buffer.from(opts.combinedBase64, "base64"));
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("합본 이미지를 읽을 수 없습니다");
  if (meta.width > MAX_WIDTH) base = base.resize(MAX_WIDTH);
  const png = await base.png().toBuffer();
  const { width: W = 0, height: H = 0 } = await sharp(png).metadata();

  const a = await findAnchors(`data:image/png;base64,${png.toString("base64")}`);

  // 위·아래 밴드 제거 후 안쪽 영역
  const innerTop = Math.round((a.headerCut / 100) * H);
  const innerBottom = Math.round((a.captionCut / 100) * H);
  const innerH = Math.max(8, innerBottom - innerTop);

  let layout: SpotLayout;
  let origRegion: sharp.Region;
  let varRegion: sharp.Region;

  if (a.axis === "horizontal") {
    layout = "side";
    // 대칭 포스터 → 분할선은 40~60%로 제한(보통 50). 안전 폴백.
    const cutX = Math.round((clamp(a.panelCut, 40, 60) / 100) * W);
    origRegion = { left: 0, top: innerTop, width: cutX, height: innerH };
    varRegion = { left: cutX, top: innerTop, width: W - cutX, height: innerH };
  } else {
    layout = "stack";
    // 분할선은 헤더~캡션 사이로 제한. 폴백은 안쪽 정중앙.
    const mid = innerTop + innerH / 2;
    const rawY = (a.panelCut / 100) * H;
    const cutY = Math.round(clamp(rawY, innerTop + 12, innerBottom - 12) || mid);
    origRegion = { left: 0, top: innerTop, width: W, height: cutY - innerTop };
    varRegion = { left: 0, top: cutY, width: W, height: innerBottom - cutY };
  }

  // 패널 추출
  const origBuf = await sharp(png).extract(origRegion).png().toBuffer();
  let varBuf = await sharp(png).extract(varRegion).png().toBuffer();

  // 변형 패널을 원본 패널과 동일 해상도로 맞춤 → 마커 % 좌표가 두 장에서 정렬됨
  varBuf = await sharp(varBuf)
    .resize(origRegion.width, origRegion.height, { fit: "fill" })
    .png()
    .toBuffer();

  const [origJpeg, varJpeg] = await Promise.all([
    sharp(origBuf).jpeg({ quality: 90 }).toBuffer(),
    sharp(varBuf).jpeg({ quality: 90 }).toBuffer(),
  ]);

  return {
    layout,
    origBase64: origJpeg.toString("base64"),
    variantBase64: varJpeg.toString("base64"),
    mimeType: "image/jpeg",
    answers: a.answers,
  };
}
