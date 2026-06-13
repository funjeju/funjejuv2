"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";

type RestaurantHit = { id: string; title: string; region: string; menu: string; address?: string };
type ContentHit = { type: "webzine" | "briefing"; slug: string; title: string; subtitle: string };
type CctvHit = { id: string; name: string; region: string };
type SearchData = { restaurants: RestaurantHit[]; contents: ContentHit[]; cctvs: CctvHit[] };

const SUGGESTIONS = ["흑돼지", "애월 카페", "오설록", "한라산", "성산 일출봉", "함덕"];
const RECENT_KEY = "funjeju_recent_searches";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData>({ restaurants: [], contents: [], cctvs: [] });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function saveRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 8);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }

  // 디바운스 검색
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setData({ restaurants: [], contents: [], cctvs: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setData(await res.json());
      } catch {
        setData({ restaurants: [], contents: [], cctvs: [] });
      }
      setLoading(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const total = data.restaurants.length + data.contents.length + data.cctvs.length;
  const searching = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 md:py-6">
      {/* Search input */}
      <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card focus-within:border-brand-orange transition-colors">
        <span className="text-xl text-text-secondary">🔍</span>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveRecent(query); }}
          placeholder="맛집·웹진·CCTV 등 제주 전체 검색"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-text-secondary hover:text-text-primary">
            ✕
          </button>
        )}
      </div>

      {searching ? (
        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-text-primary">
            &ldquo;{query.trim()}&rdquo; 검색 결과 <span className="text-brand-orange">{total}개</span>
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 text-sm font-bold text-text-primary">검색 결과가 없어요</p>
              <p className="mt-1 text-xs text-text-secondary">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 도민맛집 */}
              {data.restaurants.length > 0 && (
                <Group title="🍽️ 도민맛집" count={data.restaurants.length}>
                  {data.restaurants.map((r) => (
                    <Link key={r.id} href={`/food/${r.id}`} className="block rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card hover:bg-bg-secondary transition-colors">
                      <p className="text-[10px] text-brand-orange">{r.region} · {r.menu}</p>
                      <p className="text-sm font-bold text-text-primary">{r.title}</p>
                      {r.address && <p className="line-clamp-1 text-xs text-text-secondary">{r.address}</p>}
                    </Link>
                  ))}
                </Group>
              )}

              {/* 웹진/데일리 */}
              {data.contents.length > 0 && (
                <Group title="📖 웹진·데일리" count={data.contents.length}>
                  {data.contents.map((c) => (
                    <Link key={`${c.type}-${c.slug}`} href={`/${c.type === "briefing" ? "daily" : "webzine"}/${c.slug}`} className="block rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card hover:bg-bg-secondary transition-colors">
                      <p className="text-[10px] text-brand-navy">{c.type === "briefing" ? "🌅 데일리제주" : "📖 웹진"}</p>
                      <p className="line-clamp-1 text-sm font-bold text-text-primary">{c.title}</p>
                      {c.subtitle && <p className="line-clamp-1 text-xs text-text-secondary">{c.subtitle}</p>}
                    </Link>
                  ))}
                </Group>
              )}

              {/* CCTV */}
              {data.cctvs.length > 0 && (
                <Group title="📷 실시간 CCTV" count={data.cctvs.length}>
                  {data.cctvs.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-ocean-blue">{c.region} · CCTV</p>
                        <p className="text-sm font-bold text-text-primary">{c.name}</p>
                      </div>
                      <Link href={`/cctv/${c.id}`} className="shrink-0 rounded-full bg-brand-navy px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-navy/90 transition-colors">보기</Link>
                      <CctvFavoriteButton id={c.id} label={false} />
                    </div>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 최근 검색어 */}
          {recent.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-text-primary">최근 검색어</p>
                <button type="button" onClick={clearRecent} className="text-xs text-text-secondary hover:text-text-primary">전체 삭제</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => setQuery(r)}
                    className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary transition-colors">
                    🕐 {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 추천 검색어 */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-text-primary">💡 추천 검색어</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setQuery(s)}
                  className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-text-secondary">{title} <span className="text-brand-orange">{count}</span></p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
