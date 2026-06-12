import "server-only";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";

/**
 * 틀린그림찾기 변형 생성 — "영역 먼저, 편집은 그 안에서만" 파이프라인.
 *
 * 통째 재생성(기존)은 전 픽셀이 드리프트해 정답 위치를 알 수 없는 구조적 문제가 있다.
 * 대신:
 *  1) gpt-5-mini 비전이 고전 틀린그림 룰(recolor/remove/duplicate/resize/flip)로
 *     변경 영역 N개의 바운딩박스 + 편집 지시문을 고른다
 *  2) 그 영역만 뚫린 마스크로 gpt-image-2 images/edits 호출
 *  3) 편집 결과에서 영역만 잘라 원본 위에 합성 → 영역 밖은 원본과 픽셀 단위 동일
 *  4) 영역별 픽셀 diff로 "실제로 바뀌었는지" 검증, 안 바뀐 영역은 1회 재시도 후 제외
 *  5) 성공 영역 중심점 = 정답 마커 (어드민은 검수만)
 */

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// ── 타입 ────────────────────────────────────────────────────
type PctRegion = { x: number; y: number; w: number; h: number; type: string; edit: string };
type PxRegion = { left: number; top: number; width: number; height: number };

export type VariantResult = {
  /** 합성된 변형 이미지 (png base64) */
  variantBase64: string;
  /** 정규화된 원본 (png base64) — 변형과 픽셀 단위로 짝이 맞는 버전. 반드시 이걸 저장해야 함 */
  origBase64: string;
  /** 정답 좌표 (% — 영역 중심점) */
  markers: { x: number; y: number }[];
  /** 검수용 — 각 정답이 무엇이 어떻게 바뀐 것인지 */
  notes: string[];
};

const MAX_WIDTH = 1600; // 원본 정규화 상한 (저장·전송 비용)

// ── 1단계: 비전 모델이 변경 영역을 고른다 ──────────────────
const LEVEL_GUIDE: Record<string, string> = {
  subtle: "어려움 — 영역은 작게(이미지 폭의 4~9%), recolor 위주로 미묘한 톤 변화. 한눈에 안 띄어야 함",
  medium: "보통 — 영역은 이미지 폭의 7~14%, recolor/remove/duplicate를 골고루",
  strong: "쉬움 — 영역은 이미지 폭의 12~22%, remove/duplicate/resize 같은 뚜렷한 변화 위주",
};

async function pickRegions(opts: {
  origDataUrl: string;
  count: number;
  level: string;
  extra?: string;
}): Promise<PctRegion[]> {
  const guide = LEVEL_GUIDE[opts.level] ?? LEVEL_GUIDE.medium;
  const prompt = `당신은 틀린그림찾기 출제 전문가입니다. 이 이미지에서 변경할 영역 ${opts.count}개를 고르세요.

변경 유형(고전 틀린그림찾기 룰) — 골고루 섞어 쓰세요:
- recolor: 객체 하나의 색을 자연스러운 다른 색으로 (예: 분홍 꽃 → 흰 꽃, 파란 지붕 → 빨간 지붕). 반드시 객체 "전체"의 색이 바뀌어야 하므로 박스가 객체를 통째로 덮을 수 있는 작은 객체에만 사용
- remove: 작은 객체 하나를 지우고 주변 배경으로 메움 (예: 새 한 마리, 창문 하나)
- duplicate: 근처에 있는 객체와 똑같은 것을 빈 자리에 하나 더 (도장툴). 이때 박스는 복제본이 "들어갈 빈 공간"으로 잡고, edit에 어떤 객체를 복제할지 명시.
  복제 박스는 반드시 원본 객체 "바로 옆, 같은 높이(같은 y대)"에 잡아서 같은 표면/배경 위에 놓이게 할 것 (물 위 배는 물 위에, 모래 위 조개는 모래 위에).
  하늘에 배를 띄우는 식의 비상식적 배치 금지. 확실한 빈 공간이 없으면 duplicate 대신 다른 유형을 선택
- resize: 객체 하나를 눈에 띄게 크게/작게
- flip: 객체 하나의 좌우 방향을 반대로

영역 선정 규칙:
- 박스는 대상 객체 "전체"를 여유 있게 감싸야 함 (객체보다 15~25% 크게). 객체 일부만 걸치면 절대 안 됨
- 박스끼리 겹치지 않게, 이미지 가장자리에서 3% 이상 안쪽으로
- 경계가 뚜렷한 "독립된 객체" 단위로 (하늘 한가운데 같은 막연한 영역 금지)
- 사람 얼굴과 이미지의 핵심 주제 전체는 건드리지 않기
- 글자·텍스트는 별도 요청이 있을 때만
- 난이도: ${guide}
- edit는 마스크 영역 안에 무엇을 그릴지 한국어 명령문으로 구체적으로 (주변 화풍과 어울리게)${opts.extra ? `\n- 추가 요청: ${opts.extra}` : ""}

JSON으로만 답하세요:
{"regions":[{"x":75,"y":8,"w":12,"h":10,"type":"remove","edit":"오른쪽 위 새 두 마리를 지우고 하늘로 채워라"}]}
x,y는 박스 좌상단, w,h는 폭·높이. 모두 이미지 대비 % (0~100).`;

  const res = await getOpenAI().chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: opts.origDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { regions?: PctRegion[] };
  const regions: PctRegion[] = [];
  for (const r of raw.regions ?? []) {
    if (![r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && isFinite(n))) continue;
    const w = Math.min(Math.max(r.w, 4), 30);
    const h = Math.min(Math.max(r.h, 4), 30);
    const x = Math.min(Math.max(r.x, 1), 99 - w);
    const y = Math.min(Math.max(r.y, 1), 99 - h);
    // 기존 박스와 심하게 겹치면 제외
    const overlaps = regions.some(
      (p) => x < p.x + p.w && p.x < x + w && y < p.y + p.h && p.y < y + h
    );
    if (overlaps) continue;
    regions.push({ x, y, w, h, type: r.type ?? "edit", edit: String(r.edit ?? "자연스럽게 변경") });
    if (regions.length >= opts.count) break;
  }
  if (regions.length === 0) throw new Error("변경 영역 선정 실패 — 다시 시도해 주세요");
  return regions;
}

// ── sharp 헬퍼 ──────────────────────────────────────────────
/** %→px 변환. 비전 모델 박스가 객체를 꽉 못 덮는 경우가 있어 사방 12% 패딩 */
function toPx(r: PctRegion, w: number, h: number): PxRegion {
  const padX = (r.w / 100) * w * 0.12;
  const padY = (r.h / 100) * h * 0.12;
  const left = Math.max(0, Math.round((r.x / 100) * w - padX));
  const top = Math.max(0, Math.round((r.y / 100) * h - padY));
  return {
    left,
    top,
    width: Math.max(8, Math.min(w - left, Math.round((r.w / 100) * w + padX * 2))),
    height: Math.max(8, Math.min(h - top, Math.round((r.h / 100) * h + padY * 2))),
  };
}

/** OpenAI용 마스크: 전체 불투명 + 편집 영역만 투명 구멍 */
async function buildApiMask(w: number, h: number, regions: PxRegion[]): Promise<Buffer> {
  const holes = regions.map((r) => ({
    input: {
      create: { width: r.width, height: r.height, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    },
    left: r.left,
    top: r.top,
    blend: "dest-out" as const,
  }));
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite(holes)
    .png()
    .toBuffer();
}

/**
 * base(원본) 위에, edited에서 "영역 안에서 실제로 달라진 픽셀만" 붙인다.
 * 영역 전체를 사각형으로 붙이면 편집 모델의 미묘한 배경 톤 차이가 패치 자국으로 보임 →
 * 픽셀 diff(>18)만 alpha로 살리면 톤 오프셋은 버려지고 진짜 변경(객체)만 남는다.
 * 변경이 없던(실패한) 영역은 아무것도 안 붙으므로 유령 패치도 생기지 않는다.
 */
async function compositeRegions(
  basePng: Buffer,
  editedPng: Buffer,
  w: number,
  h: number,
  regions: PxRegion[]
): Promise<Buffer> {
  const editedRgb = await sharp(editedPng).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const baseRgb = await sharp(basePng).removeAlpha().raw().toBuffer();

  const mask = Buffer.alloc(w * h); // 1채널: 붙일 픽셀만 255
  for (const r of regions) {
    const yEnd = Math.min(r.top + r.height, h);
    const xEnd = Math.min(r.left + r.width, w);
    for (let y = r.top; y < yEnd; y++) {
      for (let x = r.left; x < xEnd; x++) {
        const i = (y * w + x) * 3;
        const d = Math.max(
          Math.abs(baseRgb[i] - editedRgb[i]),
          Math.abs(baseRgb[i + 1] - editedRgb[i + 1]),
          Math.abs(baseRgb[i + 2] - editedRgb[i + 2])
        );
        if (d > 18) mask[y * w + x] = 255;
      }
    }
  }

  // 블러로 가장자리 페더링 (경계 1~2px 자연스럽게)
  // 주의: blur가 1채널 raw를 3채널로 바꿔버리므로 extractChannel로 다시 1채널 확보
  const feathered = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
    .blur(1.8)
    .extractChannel(0)
    .raw()
    .toBuffer();

  const cutout = await sharp(editedRgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(feathered, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
  return sharp(basePng).composite([{ input: cutout, blend: "over" }]).png().toBuffer();
}

/** 영역이 실제로 바뀌었는지 — 픽셀 4% 이상이 눈에 띄게(채널차 >14) 달라야 성공 */
async function regionChanged(aPng: Buffer, bPng: Buffer, r: PxRegion): Promise<boolean> {
  const a = await sharp(aPng).extract(r).removeAlpha().raw().toBuffer();
  const b = await sharp(bPng).extract(r).removeAlpha().raw().toBuffer();
  let changed = 0;
  const total = a.length / 3;
  for (let i = 0; i + 2 < a.length; i += 3) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > 14) changed++;
  }
  return changed / total > 0.04;
}

// ── 2~3단계: 마스크 편집 → 합성 ─────────────────────────────
function positionWord(r: PctRegion): string {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const hPos = cx < 33 ? "왼쪽" : cx < 66 ? "가운데" : "오른쪽";
  const vPos = cy < 33 ? "상단" : cy < 66 ? "중단" : "하단";
  return `${vPos} ${hPos}`;
}

async function editPass(
  basePng: Buffer,
  w: number,
  h: number,
  regions: PctRegion[],
  emphasize: boolean
): Promise<Buffer> {
  const px = regions.map((r) => toPx(r, w, h));
  const mask = await buildApiMask(w, h, px);
  const list = regions
    .map((r, i) => `${i + 1}. (${positionWord(r)} 영역) ${r.edit}`)
    .join("\n");
  const prompt = `틀린그림찾기 게임용 편집입니다. 마스크로 지정된(투명한) 영역만 수정하고, 그 외에는 아무것도 바꾸지 마세요.

각 영역별 지시:
${list}

수정 결과는 원본의 화풍·조명·질감·색감과 완벽하게 어울려서, 편집 흔적 없이 자연스러워야 합니다.
각 영역에서 지시된 "대상 객체"만 바꾸고, 영역 안의 배경(바탕)은 원본과 완전히 동일하게 유지하세요.${
    emphasize ? "\n중요: 변경 사항이 반드시 눈으로 식별 가능해야 합니다. 영역을 원본 그대로 두지 마세요." : ""
  }`;

  const res = await getOpenAI().images.edit({
    model: "gpt-image-2",
    image: await toFile(basePng, "image.png", { type: "image/png" }),
    mask: await toFile(mask, "mask.png", { type: "image/png" }),
    prompt,
    n: 1,
    size: "auto",
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지 편집 실패");
  return compositeRegions(basePng, Buffer.from(b64, "base64"), w, h, px);
}

// ── 메인 ────────────────────────────────────────────────────
export async function generateVariant(opts: {
  origBase64: string;
  mimeType: string;
  count: number;
  level?: string;
  extra?: string;
}): Promise<VariantResult> {
  // 원본 정규화: png + 폭 상한 — 이게 저장될 "원본"이자 합성 베이스
  let base = sharp(Buffer.from(opts.origBase64, "base64"));
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("이미지를 읽을 수 없습니다");
  if (meta.width > MAX_WIDTH) base = base.resize(MAX_WIDTH);
  const origPng = await base.png().toBuffer();
  const { width: w = 0, height: h = 0 } = await sharp(origPng).metadata();

  // 1) 변경 영역 선정
  const regions = await pickRegions({
    origDataUrl: `data:image/png;base64,${origPng.toString("base64")}`,
    count: opts.count,
    level: opts.level ?? "medium",
    extra: opts.extra,
  });

  // 2) 마스크 편집 + 합성
  let variant = await editPass(origPng, w, h, regions, false);

  // 3) 검증 — 안 바뀐 영역은 한 번 더 (변형본을 베이스로, 성공분 유지)
  const check = await Promise.all(regions.map((r) => regionChanged(origPng, variant, toPx(r, w, h))));
  const failed = regions.filter((_, i) => !check[i]);
  if (failed.length > 0) {
    try {
      variant = await editPass(variant, w, h, failed, true);
    } catch {
      /* 재시도 실패 시 성공분만 사용 */
    }
  }

  // 4) 최종 성공 영역만 정답으로
  const finalCheck = await Promise.all(regions.map((r) => regionChanged(origPng, variant, toPx(r, w, h))));
  const ok = regions.filter((_, i) => finalCheck[i]);
  if (ok.length === 0) throw new Error("변경이 적용된 영역이 없습니다 — 다시 시도해 주세요");

  // 5) 검증 실패 영역의 잔여 픽셀 제거 — 성공 영역만 원본 위에 최종 합성
  if (ok.length < regions.length) {
    variant = await compositeRegions(origPng, variant, w, h, ok.map((r) => toPx(r, w, h)));
  }

  const TYPE_LABEL: Record<string, string> = {
    recolor: "색상 변경",
    remove: "제거",
    duplicate: "복제(도장툴)",
    resize: "크기 변경",
    flip: "방향 반전",
  };

  return {
    variantBase64: variant.toString("base64"),
    origBase64: origPng.toString("base64"),
    markers: ok.map((r) => ({
      x: Math.round((r.x + r.w / 2) * 10) / 10,
      y: Math.round((r.y + r.h / 2) * 10) / 10,
    })),
    notes: ok.map((r) => `[${TYPE_LABEL[r.type] ?? r.type}] ${r.edit}`),
  };
}
