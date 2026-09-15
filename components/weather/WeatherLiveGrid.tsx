"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TideInfo, Weather } from "@/lib/weather";

type Region = { name: string; sub: string; lat: number; lng: number };
type WeatherResult = { weather: Weather | null; tide: TideInfo | null };

const REGIONS: Region[] = [
  { name: "제주시", sub: "시청·노형·연동", lat: 33.4996, lng: 126.5312 },
  { name: "서귀포시", sub: "서귀포 시내·중앙", lat: 33.2542, lng: 126.5600 },
  { name: "애월", sub: "애월읍·곽지·한담", lat: 33.4628, lng: 126.3097 },
  { name: "성산", sub: "성산일출봉·섭지코지", lat: 33.4587, lng: 126.9425 },
  { name: "중문", sub: "중문관광단지·색달", lat: 33.2447, lng: 126.4120 },
  { name: "한림·협재", sub: "협재해변·한림항", lat: 33.3940, lng: 126.2400 },
  { name: "우도", sub: "우도·종달", lat: 33.5040, lng: 126.9510 },
  { name: "한라산", sub: "어리목·1100고지", lat: 33.3617, lng: 126.5292 },
];

const hhmm = (iso: string) => iso.slice(11, 16);

export function WeatherLiveGrid() {
  const [data, setData] = useState<Record<string, WeatherResult>>({});
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.all(REGIONS.map(async (region) => {
        try {
          const res = await fetch(`/api/weather?lat=${region.lat}&lng=${region.lng}`);
          if (!res.ok) throw new Error("weather request failed");
          return [region.name, await res.json() as WeatherResult] as const;
        } catch {
          return [region.name, { weather: null, tide: null }] as const;
        }
      }));
      if (!cancelled) {
        setData(Object.fromEntries(results));
        setUpdatedAt(new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
        }).format(new Date()));
      }
    }

    void load();
    // API 응답은 CDN에서 60초 캐시된다. 활성 화면은 5분마다 갱신해
    // 페이지 ISR을 재생성하지 않으면서 API 호출도 과도해지지 않게 한다.
    const timer = window.setInterval(() => { void load(); }, 5 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return (
    <>
      <p className="mb-3 text-xs text-text-secondary">📍 기준: {updatedAt ? `${updatedAt} (KST)` : "불러오는 중"} · Open-Meteo · 1분 CDN 캐시</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {REGIONS.map((region) => {
          const entry = data[region.name];
          const weather = entry?.weather;
          const tide = entry?.tide;
          return (
            <Link key={region.name} href="/cctv" className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card transition-colors hover:border-brand-orange/40">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-black text-text-primary">{region.name}</p>
                <span className="text-2xl">{weather?.emoji ?? "🌡️"}</span>
              </div>
              <p className="text-[11px] text-text-secondary">{region.sub}</p>
              {weather ? (
                <>
                  <p className="mt-2 text-2xl font-black text-text-primary">{weather.temperature}°C</p>
                  <p className="text-xs font-semibold text-text-secondary">{weather.description} · 체감 {weather.apparentTemp}°</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-text-secondary">
                    <span>💨 {weather.windLabel} {weather.windSpeed}m/s</span>
                    <span>💧 습도 {weather.humidity}%</span>
                    <span>{weather.precipitation > 0 ? `🌧 비 ${weather.precipitation}mm` : `🌧 강수확률 ${weather.precipProbability}%`}</span>
                    <span>{tide ? `${tide.rising ? "🌊 밀물" : "🏖 썰물"} ${tide.currentCm}cm` : `${weather.tideEmoji} ${weather.tide}`}</span>
                  </div>
                  {tide && tide.events.length > 0 && <p className="mt-1.5 truncate text-[10px] font-medium text-ocean-blue">{tide.events.map((event) => `${event.type === "high" ? "만조" : "간조"} ${hhmm(event.time)}(${event.heightCm}cm)`).join(" · ")}</p>}
                </>
              ) : <p className="mt-3 text-xs text-text-secondary">날씨 정보를 가져오는 중…</p>}
              <p className="mt-3 text-[11px] font-bold text-brand-orange">실시간 CCTV로 보기 →</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
