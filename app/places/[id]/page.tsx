import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getPlaceById, getNearbyPlaces } from "@/lib/firestore-places";
import { getCategoryMeta } from "@/constants/places-meta";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1시간

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) return { title: "장소 없음 | FunJeju" };

  return {
    title: `${place.place_name} - ${place.region} ${place.categories_kr[0] ?? ""} | FunJeju`,
    description: place.description || `${place.region}에 있는 ${place.place_name}. 펀제주에서 제주 여행의 모든 정보를 만나보세요.`,
    openGraph: {
      title: place.place_name,
      description: place.description,
      images: place.imageUrl ? [{ url: place.imageUrl }] : [],
    },
  };
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  const nearby = await getNearbyPlaces(place, 6);
  const primaryCat = place.categories[0];
  const meta = primaryCat ? getCategoryMeta(primaryCat) : undefined;

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      {/* 브레드크럼 */}
      <nav className="px-4 pb-3 md:px-0">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
          <li><Link href="/" className="hover:text-text-primary">홈</Link></li>
          <li>›</li>
          <li><Link href="/places" className="hover:text-text-primary">탐색</Link></li>
          <li>›</li>
          <li className="font-bold text-text-primary truncate max-w-[200px]">{place.place_name}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* 좌측: 메인 정보 */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* 히어로 이미지 */}
          <div className="relative aspect-video overflow-hidden bg-bg-secondary md:rounded-2xl">
            {place.imageUrl ? (
              <Image src={place.imageUrl} alt={place.place_name} fill priority className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">{meta?.emoji ?? "📍"}</div>
            )}
            {meta && (
              <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${meta.color}`}>
                {meta.emoji} {meta.label}
              </span>
            )}
          </div>

          {/* 제목 + 기본 정보 */}
          <div className="px-4 md:px-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ocean-blue">{place.region}</p>
                <h1 className="mt-0.5 text-2xl font-black text-text-primary">{place.place_name}</h1>
                {place.address && (
                  <p className="mt-1 text-xs text-text-secondary">📍 {place.address}</p>
                )}
              </div>
            </div>

            {/* 속성 뱃지 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {place.categories_kr.map((c) => (
                <span key={c} className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                  {c}
                </span>
              ))}
              {place.withPets && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  🐶 반려동물 가능
                </span>
              )}
              {place.withKids && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  👨‍👩‍👧 아이 동반 가능
                </span>
              )}
              {place.admissionFee && (
                <span className="rounded-full bg-jeju-green/10 px-2.5 py-1 text-[11px] font-bold text-jeju-green">
                  💰 {place.admissionFee}
                </span>
              )}
            </div>
          </div>

          {/* 설명 */}
          {place.description && (
            <div className="mx-4 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card md:mx-0">
              <h2 className="mb-2 text-sm font-bold text-text-primary">📝 소개</h2>
              <p className="text-sm leading-7 text-text-primary whitespace-pre-line">{place.description}</p>
            </div>
          )}

          {/* 전문가 팁 */}
          {place.expert_tip && (
            <div className="mx-4 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-5 md:mx-0">
              <h2 className="mb-2 text-sm font-bold text-brand-navy">💡 펀제주 팁</h2>
              <p className="text-sm leading-7 text-text-primary whitespace-pre-line">{place.expert_tip}</p>
            </div>
          )}

          {/* 태그 */}
          {place.tags.length > 0 && (
            <div className="mx-4 md:mx-0">
              <p className="mb-2 text-xs font-bold text-text-secondary">🏷️ 태그</p>
              <div className="flex flex-wrap gap-1">
                {place.tags.map((t) => (
                  <span key={t} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 연락처 */}
          {(place.phone || place.website || place.hours) && (
            <div className="mx-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
              <h2 className="mb-2 text-sm font-bold text-text-primary">ℹ️ 정보</h2>
              <dl className="space-y-1.5 text-xs">
                {place.phone && (
                  <div className="flex gap-2">
                    <dt className="w-16 font-semibold text-text-secondary">전화</dt>
                    <dd><a href={`tel:${place.phone}`} className="text-brand-orange hover:underline">{place.phone}</a></dd>
                  </div>
                )}
                {place.website && (
                  <div className="flex gap-2">
                    <dt className="w-16 font-semibold text-text-secondary">웹사이트</dt>
                    <dd><a href={place.website} target="_blank" rel="noreferrer" className="text-brand-orange hover:underline break-all">{place.website}</a></dd>
                  </div>
                )}
                {place.hours && (
                  <div className="flex gap-2">
                    <dt className="w-16 font-semibold text-text-secondary">영업시간</dt>
                    <dd className="text-text-primary">{place.hours}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* 우측: 지도 + 근처 추천 */}
        <aside className="w-full space-y-4 lg:w-80 lg:shrink-0">
          {/* 위치 */}
          {place.lat && place.lng && (
            <div className="mx-4 overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card md:mx-0">
              <div className="border-b border-border-soft px-4 py-3">
                <h3 className="text-sm font-bold text-text-primary">📍 위치</h3>
                <p className="mt-0.5 text-[10px] text-text-secondary">{place.address || place.region}</p>
              </div>
              <a
                href={`https://map.kakao.com/link/map/${encodeURIComponent(place.place_name)},${place.lat},${place.lng}`}
                target="_blank" rel="noreferrer"
                className="block aspect-video bg-bg-secondary hover:bg-border-soft transition-colors flex items-center justify-center text-center">
                <div>
                  <p className="text-3xl">🗺️</p>
                  <p className="mt-2 text-xs font-bold text-brand-orange">카카오맵에서 보기 →</p>
                </div>
              </a>
            </div>
          )}

          {/* 근처 추천 */}
          {nearby.length > 0 && (
            <div className="mx-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
              <h3 className="mb-3 text-sm font-bold text-text-primary">🌟 {place.region} 다른 곳</h3>
              <div className="space-y-2">
                {nearby.map((n) => (
                  <Link
                    key={n.id}
                    href={`/places/${n.id}`}
                    className="flex items-center gap-2 rounded-xl border border-border-soft bg-bg-secondary p-2 hover:border-brand-orange/40 transition-colors"
                  >
                    {n.imageUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <Image src={n.imageUrl} alt={n.place_name} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg-card text-lg">
                        {getCategoryMeta(n.categories[0])?.emoji ?? "📍"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text-primary">{n.place_name}</p>
                      <p className="text-[10px] text-text-secondary">{n.categories_kr[0] ?? "관광지"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href={`/places?region=${encodeURIComponent(place.region)}`}
                className="mt-3 block text-center text-xs font-bold text-brand-orange hover:underline">
                {place.region} 전체 보기 →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
