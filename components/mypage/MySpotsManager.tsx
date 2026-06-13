"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { addMySpot, listMySpots, deleteMySpot } from "@/lib/my-spots";
import {
  MY_SPOT_CATEGORIES, CATEGORY_EMOJI, DIRECTION_EMOJI,
  type MySpot, type MySpotCategory,
} from "@/types/my-spot";

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

type PlaceResult = { name: string; address: string; category: string; lat: number; lng: number };

function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!KAKAO_REST_KEY) return [];
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`제주 ${query}`)}&size=7&rect=126.1,33.1,127.0,33.65`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      documents?: Array<{ place_name: string; road_address_name?: string; address_name?: string; category_name?: string; x: string; y: string }>;
    };
    return (data.documents ?? [])
      .map((d) => ({
        name: d.place_name,
        address: d.road_address_name || d.address_name || "",
        category: d.category_name ?? "",
        lat: Number(d.y),
        lng: Number(d.x),
      }))
      .filter((d) => inJeju(d.lat, d.lng));
  } catch {
    return [];
  }
}

/** 카카오 카테고리 → 마이스팟 카테고리 추정 */
function guessCategory(kakaoCategory: string): MySpotCategory {
  if (kakaoCategory.includes("카페")) return "카페";
  if (kakaoCategory.includes("음식점")) return "맛집";
  if (kakaoCategory.includes("숙박")) return "숙소";
  return "여행지";
}

export function MySpotsManager() {
  const { user } = useAuth();
  const [spots, setSpots] = useState<MySpot[]>([]);
  const [filter, setFilter] = useState<MySpotCategory | "전체">("전체");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<PlaceResult | null>(null); // 카테고리 확정 대기

  useEffect(() => {
    if (!user) { setSpots([]); return; }
    listMySpots(user.uid).then(setSpots).catch(() => setSpots([]));
  }, [user]);

  async function handleSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setPendingPlace(null);
    setResults(await searchPlaces(q));
    setSearching(false);
  }

  async function confirmAdd(place: PlaceResult, category: MySpotCategory) {
    if (!user) return;
    setPendingPlace(null);
    setResults(null);
    setQuery("");
    try {
      await addMySpot(user.uid, {
        name: place.name, category,
        lat: place.lat, lng: place.lng, address: place.address,
      });
      setSpots(await listMySpots(user.uid));
    } catch { /* 다음 로드에서 동기화 */ }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setSpots((prev) => prev.filter((s) => s.id !== id));
    try { await deleteMySpot(user.uid, id); } catch { /* ignore */ }
  }

  const visible = filter === "전체" ? spots : spots.filter((s) => s.category === filter);

  return (
    <section className="mx-4 mb-5 md:mx-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          📍 마이스팟
          <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
            {spots.length}
          </span>
        </h2>
        <span className="text-[10px] text-text-secondary">여행 설계할 때 동선에 반영돼요</span>
      </div>

      <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        {/* 검색 추가 — input에 min-w-0를 줘야 좁은 화면에서 버튼이 안 잘림 */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
            placeholder="이름·주소 검색 (카카오맵)"
            style={{ fontSize: "10px" }}
            className="min-w-0 flex-1 rounded-xl border border-border-soft bg-bg-secondary px-2.5 py-2 outline-none focus:border-brand-orange"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            style={{ fontSize: "10px" }}
            className="shrink-0 rounded-xl bg-brand-navy px-2.5 py-2 font-bold text-white hover:bg-brand-navy/90 disabled:opacity-40 transition-colors"
          >
            {searching ? "검색…" : "🔍 검색"}
          </button>
        </div>

        {/* 검색 결과 */}
        {results !== null && !pendingPlace && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border-soft">
            {results.length === 0 ? (
              <p className="p-3 text-[11px] text-text-secondary">검색 결과가 없어요</p>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.name}-${r.lat}`}
                  type="button"
                  onClick={() => setPendingPlace(r)}
                  className="flex w-full items-center gap-2 border-b border-border-soft px-3 py-2.5 text-left last:border-b-0 hover:bg-brand-orange/5 transition-colors"
                >
                  <span>{CATEGORY_EMOJI[guessCategory(r.category)]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-text-primary">{r.name}</span>
                    <span className="block truncate text-[10px] text-text-secondary">{r.address}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-brand-orange">+ 추가</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* 카테고리 확정 */}
        {pendingPlace && (
          <div className="mt-2 rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3">
            <p className="text-xs font-bold text-text-primary">{pendingPlace.name}</p>
            <p className="mb-2 text-[10px] text-text-secondary">{pendingPlace.address}</p>
            <p className="mb-1.5 text-[10px] font-medium text-text-secondary">어떤 카테고리로 저장할까요?</p>
            <div className="flex flex-wrap gap-1.5">
              {MY_SPOT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => confirmAdd(pendingPlace, c)}
                  className={[
                    "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                    guessCategory(pendingPlace.category) === c
                      ? "bg-brand-orange text-white"
                      : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange hover:text-brand-orange",
                  ].join(" ")}
                >
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPendingPlace(null)}
                className="rounded-full px-3 py-1.5 text-[11px] text-text-secondary hover:text-live-red"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 필터 + 목록 */}
        {spots.length > 0 && (
          <>
            <div className="mt-3 flex flex-wrap gap-1">
              {(["전체", ...MY_SPOT_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  style={{ fontSize: "12px" }}
                  className={[
                    "rounded-full px-2 py-0.5 font-bold transition-colors",
                    filter === c ? "bg-brand-navy text-white" : "bg-bg-secondary text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {c === "전체" ? "전체" : `${CATEGORY_EMOJI[c]} ${c}`}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1.5">
              {visible.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-bg-secondary/50 px-3 py-2">
                  <span className="text-base">{CATEGORY_EMOJI[s.category]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-text-primary">{s.name}</p>
                    <p className="truncate text-[10px] text-text-secondary">{s.address}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-bg-card px-2 py-0.5 text-[9px] font-bold text-text-secondary">
                    {DIRECTION_EMOJI[s.direction]} {s.direction}쪽
                  </span>
                  {s.source === "jejutube" && (
                    <span className="shrink-0 rounded-full bg-red-600/10 px-2 py-0.5 text-[9px] font-bold text-red-600">▶ 제주tube</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="shrink-0 text-xs text-text-secondary hover:text-live-red transition-colors"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {spots.length === 0 && results === null && (
          <p className="mt-3 text-center text-[11px] leading-5 text-text-secondary">
            가고 싶은 맛집·카페·여행지·숙소를 검색해서 저장해두세요.<br />
            AI 여행 일정을 짤 때 동선에 자동으로 반영돼요! 🗿
          </p>
        )}
      </div>
    </section>
  );
}
