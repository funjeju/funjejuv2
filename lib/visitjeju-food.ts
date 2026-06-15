import "server-only";

/**
 * 비짓제주 OpenAPI — 음식점(category=c4) 목록 페처.
 * 사실(상호·주소·좌표·전화·소개·이미지)만 가져오고, 소개문은 적재 단계에서 펀제주 문장으로 각색한다.
 */

const BASE = "https://api.visitjeju.net/vsjApi/contents/searchList";

export type VisitjejuFood = {
  contentsid: string;
  title: string;
  address: string;     // 도로명 우선
  lat?: number;
  lng?: number;
  phone?: string;
  intro: string;       // 비짓제주 소개 원문 (→ 각색 소스)
  tag?: string;
  region1?: string;    // 제주시/서귀포시
  region2?: string;    // 제주시내/구좌·조천 등
  imageUrl?: string;
};

type ApiItem = {
  contentsid?: string;
  title?: string;
  address?: string;
  roadaddress?: string;
  latitude?: number;
  longitude?: number;
  phoneno?: string;
  introduction?: string;
  tag?: string;
  region1cd?: { label?: string };
  region2cd?: { label?: string };
  repPhoto?: { photoid?: { imgpath?: string } };
};

function apiKey(): string {
  const k = process.env.VISITJEJU_API_KEY;
  if (!k) throw new Error("VISITJEJU_API_KEY 환경변수 미설정");
  return k;
}

/** 음식점 목록 한 페이지 (pageSize=100) */
export async function fetchVisitjejuFoods(page: number): Promise<{ items: VisitjejuFood[]; pageCount: number }> {
  const url = `${BASE}?apiKey=${apiKey()}&locale=kr&category=c4&page=${page}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!res.ok) throw new Error(`visitjeju API ${res.status}`);
  const data = (await res.json()) as { items?: ApiItem[]; pageCount?: number };
  const items: VisitjejuFood[] = (data.items ?? [])
    .filter((it) => it.contentsid && it.title)
    .map((it) => ({
      contentsid: it.contentsid!,
      title: (it.title ?? "").trim(),
      address: (it.roadaddress || it.address || "").trim(),
      lat: typeof it.latitude === "number" ? it.latitude : undefined,
      lng: typeof it.longitude === "number" ? it.longitude : undefined,
      phone: it.phoneno && it.phoneno !== "*" ? it.phoneno : undefined,
      intro: (it.introduction ?? "").trim(),
      tag: it.tag,
      region1: it.region1cd?.label,
      region2: it.region2cd?.label,
      imageUrl: it.repPhoto?.photoid?.imgpath,
    }));
  return { items, pageCount: data.pageCount ?? 1 };
}
