import type { SiteSchema } from "@/lib/biz/types";

/** 주소에서 제주 지역(읍면동/시) 추출 — 없으면 "제주" */
export function bizRegion(address?: string): string {
  if (!address) return "제주";
  const parts = address.split(/\s+/).filter(Boolean);
  // "제주특별자치도 제주시 한림읍 ..." → 한림읍/제주시 우선
  const eupMyeon = parts.find((p) => /(읍|면|동)$/.test(p));
  if (eupMyeon) return eupMyeon.replace(/(읍|면|동)$/, "");
  const si = parts.find((p) => /(시|군)$/.test(p) && !p.includes("자치"));
  return si ? si.replace(/(시|군)$/, "") : "제주";
}

/**
 * 가게 구조화 데이터로 FAQ를 결정적으로 생성 (AI 불필요 · 날조 없음 · 모든 기존 홈피에 즉시 적용).
 * 실제 보유한 정보(영업시간·주소·전화·메뉴)만 질문화.
 */
export function buildBizFaqs(site: SiteSchema): { q: string; a: string }[] {
  const m = site.merchantInfo;
  const region = bizRegion(m.address);
  const faqs: { q: string; a: string }[] = [];

  // 어떤 곳인가 (소개)
  if (m.description) {
    faqs.push({
      q: `${m.name}은(는) 어떤 곳인가요?`,
      a: `${m.name}은(는) 제주 ${region}에 위치한 ${m.category || "가게"}입니다. ${m.description}`.slice(0, 300),
    });
  }
  // 위치/주소
  if (m.address) {
    faqs.push({
      q: `${m.name} 위치(주소)는 어디인가요?`,
      a: `${m.name}의 주소는 ${m.address}입니다. 제주 ${region} 지역에 있습니다.`,
    });
  }
  // 영업시간
  if (m.businessHours) {
    faqs.push({
      q: `${m.name} 영업시간은 어떻게 되나요?`,
      a: `${m.name}의 영업시간은 ${m.businessHours}입니다. 방문 전 영업 여부를 확인하시는 것을 권장합니다.`,
    });
  }
  // 대표 메뉴
  const items = site.menuData?.items ?? [];
  if (items.length > 0) {
    const top = items.slice(0, 3).map((i) => i.name).filter(Boolean).join(", ");
    if (top) faqs.push({ q: `${m.name} 대표 메뉴는 무엇인가요?`, a: `${m.name}의 대표 메뉴로는 ${top} 등이 있습니다.` });
  }
  // 예약·문의
  if (m.phone) {
    faqs.push({
      q: `${m.name} 예약·문의는 어떻게 하나요?`,
      a: `${m.name} 예약·문의는 전화 ${m.phone}으로 가능합니다.`,
    });
  }

  return faqs.slice(0, 6);
}

/** 키워드 밀도 높은 SEO 본문 한 단락 (지역·업종 + 펀제주 유입 맥락) */
export function buildBizSeoText(site: SiteSchema): string {
  const m = site.merchantInfo;
  const region = bizRegion(m.address);
  const cat = m.category || "가게";
  const parts = [
    `${m.name}은(는) 제주 ${region}에 위치한 ${cat}입니다.`,
    m.description ? m.description : "",
    m.businessHours ? `영업시간은 ${m.businessHours}이며,` : "",
    m.address ? `주소는 ${m.address}입니다.` : "",
    `제주 ${region} 여행을 계획 중이시라면, 펀제주에서 제주 실시간 날씨와 CCTV, 도민 추천 맛집을 함께 확인하고 동선을 잡아보세요.`,
  ].filter(Boolean);
  return parts.join(" ");
}
