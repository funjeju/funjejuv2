import { isLaunchCameraVisible } from "@/lib/cctv-launch-policy";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GROUP_HUB } from "@/types/cctv-location";
import { listLocationsByGroup } from "@/lib/cctv-location";
import { getCctvById } from "@/lib/firestore-cctv-server";

export const revalidate = false; // 영구 캐시 — CCTV 수정 시 revalidateCctv가 테마 허브 무효화(admin/cctv). 봇 크롤 ISR Write 0
export const dynamicParams = false;

const SITE = "https://funjeju.com";

// slug → group 역매핑
function groupBySlug(slug: string): string | null {
  const e = Object.entries(GROUP_HUB).find(([, v]) => v.slug === slug);
  return e ? e[0] : null;
}

export function generateStaticParams() {
  return Object.values(GROUP_HUB).map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = groupBySlug(slug);
  if (!group) return { title: "페이지를 찾을 수 없습니다 | 펀제주" };
  const hub = GROUP_HUB[group];
  const url = `${SITE}/cctv/theme/${slug}`;
  const title = `${hub.title} | 지금 제주 날씨 - 펀제주`;
  const description = `${hub.desc}. ${hub.title} 장소 정보. 공개 영상은 최근 재생 확인 목록에서 확인하세요.`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: "펀제주", images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: hub.title }] },
    keywords: [hub.title, "제주 날씨", "제주 실시간 cctv", "제주 라이브캠"],
  };
}

export default async function ThemeHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = groupBySlug(slug);
  if (!group) notFound();
  const hub = GROUP_HUB[group];
  const locs = await listLocationsByGroup(group);
  // 카메라 이름 매핑
  const reviewed = await Promise.all(locs.map(async (loc) => {
    const camera = await getCctvById(loc.id);
    return camera && await isLaunchCameraVisible(camera) ? { loc, name: camera.name } : null;
  }));
  const items = reviewed.filter((item): item is NonNullable<typeof item> => item !== null);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.title,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: `${it.loc.formal} 장소 안내`, url: `${SITE}/cctv/${it.loc.id}` })),
  };

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav aria-label="breadcrumb" className="mb-3 text-xs text-text-secondary">
        <Link href="/cctv" className="hover:text-text-primary">실시간 CCTV</Link> › <span className="font-bold text-text-primary">{hub.title}</span>
      </nav>

      <h1 className="text-xl font-black text-text-primary">{hub.emoji} {hub.title} — 지금 제주 날씨 바로 확인</h1>
      <p className="mt-2 text-sm leading-7 text-text-secondary">{hub.desc}. 아래 링크는 장소 정보입니다. 영상은 최근 재생 확인을 마친 카메라만 공개합니다.</p>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-secondary">준비 중입니다.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map(({ loc, name }) => (
            <Link key={loc.id} href={`/cctv/${loc.id}`} className="block rounded-2xl border border-border-soft bg-bg-card p-4 hover:border-brand-navy">
              <h2 className="text-sm font-bold text-text-primary">{name} 장소 안내</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-text-secondary">{loc.weatherNote}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/cctv" className="text-xs font-bold text-brand-orange">← 전체 CCTV 보기</Link>
      </div>
    </div>
  );
}
