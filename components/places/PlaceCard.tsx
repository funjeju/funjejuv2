import Link from "next/link";
import Image from "next/image";
import { getCategoryMeta } from "@/constants/places-meta";

export type PlaceCardData = {
  id: string;
  place_name: string;
  region: string;
  categories: string[];
  categories_kr: string[];
  description: string;
  imageUrl: string;
  withPets: boolean;
  withKids: boolean;
  tags: string[];
  lat: number;
  lng: number;
};

export function PlaceCard({ place }: { place: PlaceCardData }) {
  const primaryCat = place.categories[0];
  const meta = primaryCat ? getCategoryMeta(primaryCat) : undefined;

  return (
    <Link
      href={`/places/${place.id}`}
      className="group flex overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-all hover:shadow-soft hover:border-brand-orange/30 sm:flex-col"
    >
      {/* 이미지 */}
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-bg-secondary sm:aspect-[4/3] sm:w-full">
        {place.imageUrl ? (
          <Image
            src={place.imageUrl}
            alt={place.place_name}
            fill
            sizes="(max-width: 640px) 96px, 320px"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            {meta?.emoji ?? "📍"}
          </div>
        )}
        {/* 카테고리 뱃지 */}
        {meta && (
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
            {meta.emoji} {meta.label}
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-bold text-text-primary group-hover:text-brand-orange transition-colors">
          {place.place_name}
        </h3>
        <p className="mt-0.5 text-[11px] text-text-secondary">📍 {place.region}</p>
        {place.description && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-text-secondary">
            {place.description}
          </p>
        )}
        {/* 속성 뱃지 */}
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {place.withPets && (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
              🐶 반려동물 OK
            </span>
          )}
          {place.withKids && (
            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
              👨‍👩‍👧 아이 OK
            </span>
          )}
          {place.categories_kr.slice(0, 2).map((c) => (
            <span key={c} className="rounded-full bg-bg-secondary px-1.5 py-0.5 text-[9px] text-text-secondary">
              {c}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
