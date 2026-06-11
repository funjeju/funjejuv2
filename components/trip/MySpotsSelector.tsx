"use client";

import { useEffect, useMemo, useRef } from "react";
import { loadKakaoSdk, type KakaoMap, type KakaoOverlay } from "@/components/trip/TripResultMap";
import { CATEGORY_EMOJI, type MySpot } from "@/types/my-spot";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

const CATEGORY_COLOR: Record<string, string> = {
  맛집: "#c44545", 카페: "#a06d3a", 여행지: "#16a34a", 숙소: "#2563eb",
};

/** 선택 스팟 분포 분석 → 제안 메시지 */
function analyzeSpread(selected: MySpot[], days: number): string[] {
  if (selected.length === 0) return [];
  const msgs: string[] = [];

  const east = selected.filter((s) => s.lng >= 126.7);
  const west = selected.filter((s) => s.lng <= 126.35);
  const lodgings = selected.filter((s) => s.category === "숙소");

  if (lodgings.length > 0) {
    const l = lodgings[0];
    msgs.push(`🏨 숙소 '${l.name}'(${l.direction}쪽) 기준으로 동선을 짜드릴게요.`);
  }

  if (east.length > 0 && west.length > 0) {
    if (days <= 1) {
      msgs.push(
        `⚠️ 동쪽 ${east.length}곳·서쪽 ${west.length}곳으로 많이 흩어져 있어요. 당일치기엔 한쪽만 고르는 걸 추천! (동서 횡단은 차로 1시간 30분+)`
      );
    } else {
      msgs.push(
        `💡 동쪽 ${east.length}곳·서쪽 ${west.length}곳이라, 하루는 동쪽(${east.slice(0, 3).map((s) => s.name).join(", ")}${east.length > 3 ? " 외" : ""}), 하루는 서쪽(${west.slice(0, 3).map((s) => s.name).join(", ")}${west.length > 3 ? " 외" : ""})으로 나누면 동선이 깔끔해요.`
      );
    }
  } else if (selected.length >= 2) {
    const dir = east.length > 0 ? "동쪽" : west.length > 0 ? "서쪽" : "비슷한 권역";
    msgs.push(`✓ 스팟들이 ${dir}에 모여 있어서 동선 짜기 좋아요!`);
  }

  if (selected.length > days * 4) {
    msgs.push(`⚠️ ${days}일 일정에 ${selected.length}곳은 빡빡해요. 핵심만 남기는 것도 방법!`);
  }

  return msgs;
}

type Props = {
  spots: MySpot[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  days: number;
};

export function MySpotsSelector({ spots, selectedIds, onToggle, days }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);

  const selected = useMemo(() => spots.filter((s) => selectedIds.has(s.id)), [spots, selectedIds]);
  const suggestions = useMemo(() => analyzeSpread(selected, days), [selected, days]);

  // 마이스팟 지도 (클릭으로 선택 토글)
  useEffect(() => {
    if (!KAKAO_KEY || !containerRef.current || spots.length === 0) return;
    let cancelled = false;

    (async () => {
      const kakao = await loadKakaoSdk();
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(33.38, 126.55),
          level: 10,
        });
      }
      const map = mapRef.current;
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];

      const bounds = new kakao.maps.LatLngBounds();
      for (const spot of spots) {
        const isSelected = selectedIds.has(spot.id);
        const pos = new kakao.maps.LatLng(spot.lat, spot.lng);
        bounds.extend(pos);

        const el = document.createElement("div");
        el.style.cssText = "position:relative;cursor:pointer;";
        el.innerHTML = `
          <div style="
            display:flex;align-items:center;justify-content:center;
            width:26px;height:26px;border-radius:9999px;
            background:${isSelected ? CATEGORY_COLOR[spot.category] ?? "#555" : "#9ca3af"};
            opacity:${isSelected ? 1 : 0.55};
            color:white;font-size:13px;
            border:2px solid white;
            box-shadow:0 2px 5px rgba(0,0,0,0.4);
            transition:transform .15s;
          ">${CATEGORY_EMOJI[spot.category]}</div>
          <div class="ms-label" style="
            position:absolute;left:50%;bottom:calc(100% + 4px);
            transform:translateX(-50%);
            background:rgba(0,0,0,0.85);color:white;
            padding:2px 7px;border-radius:9999px;
            font-size:10px;font-weight:700;white-space:nowrap;
            pointer-events:none;opacity:0;transition:opacity .15s;
          ">${spot.name}${isSelected ? " ✓" : ""}</div>
        `;
        const dot = el.firstElementChild as HTMLDivElement;
        const label = el.querySelector(".ms-label") as HTMLDivElement;
        el.onmouseenter = () => { dot.style.transform = "scale(1.2)"; label.style.opacity = "1"; };
        el.onmouseleave = () => { dot.style.transform = "scale(1)"; label.style.opacity = "0"; };
        el.onclick = () => onToggle(spot.id);

        const overlay = new kakao.maps.CustomOverlay({
          position: pos, content: el, xAnchor: 0.5, yAnchor: 0.5, clickable: true,
          zIndex: isSelected ? 3 : 2,
        });
        overlay.setMap(map);
        overlaysRef.current.push(overlay);
      }

      map.relayout();
      if (!bounds.isEmpty()) map.setBounds(bounds);
    })();

    return () => { cancelled = true; };
  }, [spots, selectedIds, onToggle]);

  if (spots.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-text-secondary">
        📍 내 마이스팟 — 지도나 목록에서 눌러서 일정에 넣고 빼세요 ({selected.length}/{spots.length} 선택)
      </p>
      <div
        ref={containerRef}
        className="h-[200px] w-full overflow-hidden rounded-xl border border-border-soft bg-bg-secondary"
      />
      <div className="flex flex-wrap gap-1.5">
        {spots.map((s) => {
          const on = selectedIds.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={[
                "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                on
                  ? "text-white"
                  : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange",
              ].join(" ")}
              style={on ? { background: CATEGORY_COLOR[s.category] ?? "#555" } : undefined}
            >
              {CATEGORY_EMOJI[s.category]} {s.name}
              <span className={on ? "" : "opacity-50"}>{on ? "✓" : "+"}</span>
            </button>
          );
        })}
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-1 rounded-xl bg-brand-yellow/20 p-2.5">
          {suggestions.map((m, i) => (
            <p key={i} className="text-[11px] leading-5 text-text-primary">{m}</p>
          ))}
        </div>
      )}
    </div>
  );
}
