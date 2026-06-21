import Link from "next/link";
import type { SiteSchema } from "@/lib/biz/types";
import { buildBizFaqs, buildBizSeoText, bizRegion } from "@/lib/biz/seo";

/**
 * 비즈 홈피 하단 SEO/AEO 보강 + 펀제주 유입 섹션.
 * - 키워드 밀도 높은 SEO 본문(자수 보강)
 * - 구조화 데이터 기반 FAQ(AEO)
 * - 펀제주 핵심 페이지로 진입 버튼(개별 홈피 → 펀제주 송객)
 * 모든 비즈 페이지에 렌더 시점 적용(기존·신규 전부, 재생성 불필요).
 */
export function BizSeoSection({ site }: { site: SiteSchema }) {
  const m = site.merchantInfo;
  const region = bizRegion(m.address);
  const faqs = buildBizFaqs(site);
  const seoText = buildBizSeoText(site);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      {/* SEO 본문 (자수·키워드 보강) */}
      <div className="rounded-2xl border border-gray-100 bg-white/60 p-5">
        <h2 className="text-base font-bold text-gray-800">제주 {region} {m.category} {m.name} 안내</h2>
        <p className="mt-2 text-sm leading-7 text-gray-600">{seoText}</p>
      </div>

      {/* FAQ (AEO) */}
      {faqs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-bold text-gray-800">자주 묻는 질문</h2>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-800">Q. {f.q}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 펀제주 진입 (개별 홈피 → 펀제주 송객) */}
      <div className="mt-8 rounded-2xl bg-gradient-to-br from-sky-50 to-orange-50 p-5 text-center">
        <p className="text-sm font-black text-gray-800">🍊 제주 여행 중이신가요?</p>
        <p className="mt-1 text-xs text-gray-600">제주 실시간 날씨·CCTV와 도민맛집을 펀제주에서 확인하세요.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href="https://funjeju.com/cctv" className="rounded-xl bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:text-brand-navy">📷 실시간 날씨·CCTV</Link>
          <Link href="https://funjeju.com/food" className="rounded-xl bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:text-brand-navy">🍽️ 도민맛집</Link>
          <Link href="https://funjeju.com/magazine" className="rounded-xl bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:text-brand-navy">📖 제주 매거진</Link>
          <Link href="https://funjeju.com/qna" className="rounded-xl bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:text-brand-navy">💬 제주 Q&A</Link>
        </div>
        <Link href="https://funjeju.com" className="mt-3 inline-block text-[11px] font-bold text-brand-orange">펀제주 홈으로 →</Link>
      </div>
    </section>
  );
}
