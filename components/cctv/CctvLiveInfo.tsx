"use client";

import { useEffect, useState } from "react";
import type { Weather, TideInfo } from "@/lib/weather";
import { useT, weatherKey, windKey } from "@/lib/i18n";

const hhmm = (iso: string) => iso.slice(11, 16);

/**
 * CCTV 라이브 날씨·조위 위젯 (다국어).
 * 서버에서 fetch 한 weather/tide 데이터를 받아 클라이언트에서 언어별로 렌더.
 * → CCTV 상세는 정적/ISR 유지, 외국인은 토글로 즉시 번역.
 *
 * ⚠️ 서버 prop(weather)이 null이면 ISR 캐시에 실패값이 굳은 상태 → 클라이언트가
 *    /api/weather(항상 라이브)로 재요청해 채운다. "날씨 못 가져옴" 고정 노출 방지.
 */
export function CctvLiveInfo({
  weather: serverWeather,
  tide: serverTide,
  lat,
  lng,
}: {
  weather: Weather | null;
  tide?: TideInfo | null;
  lat?: number;
  lng?: number;
}) {
  const t = useT();
  const [weather, setWeather] = useState(serverWeather);
  const [tide, setTide] = useState<TideInfo | null | undefined>(serverTide);

  // 서버가 null을 내려줬고 좌표가 있으면 클라에서 라이브로 보강
  useEffect(() => {
    if (serverWeather || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    let alive = true;
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { weather?: Weather | null; tide?: TideInfo | null } | null) => {
        if (!alive || !d?.weather) return;
        setWeather(d.weather);
        setTide(d.tide ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [serverWeather, lat, lng]);

  return (
    <div className="mx-4 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4 md:mx-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-brand-navy">{t("cctv.liveInfo")}</p>
        <p className="text-[10px] text-text-secondary">{t("cctv.updateNote")}</p>
      </div>
      {weather ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white px-2 py-2 shadow-card">
              <p className="text-[9px] text-text-secondary">{t("cctv.weather")}</p>
              <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                {weather.emoji} {t(weatherKey(weather.weatherCode))}
              </p>
              <p className="text-[9px] text-text-secondary">{weather.temperature}°C</p>
            </div>
            <div className="rounded-xl bg-white px-2 py-2 shadow-card">
              <p className="text-[9px] text-text-secondary">{t("cctv.tide")}</p>
              {tide ? (
                <>
                  <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                    {tide.rising ? `🌊 ${t("cctv.rising")}` : `🏖 ${t("cctv.falling")}`}
                  </p>
                  <p className="text-[9px] text-text-secondary">{tide.currentCm}cm · {weather.tide}</p>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                    {weather.tideEmoji} {weather.tide}
                  </p>
                  <p className="text-[9px] text-text-secondary">{weather.tideDetail}</p>
                </>
              )}
            </div>
            <div className="rounded-xl bg-white px-2 py-2 shadow-card">
              <p className="text-[9px] text-text-secondary">{t("cctv.wind")}</p>
              <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                💨 {t(windKey(weather.windSpeed))}
              </p>
              <p className="text-[9px] text-text-secondary">{weather.windSpeed}m/s</p>
            </div>
          </div>

          {/* 만조·간조 시각 */}
          {tide && tide.events.length > 0 && (
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-1.5 text-center text-[10px] font-semibold text-ocean-blue">
              {tide.events
                .map((e) => `${e.type === "high" ? t("cctv.tideHigh") : t("cctv.tideLow")} ${hhmm(e.time)} (${e.heightCm}cm)`)
                .join("  ·  ")}
            </p>
          )}

          {/* 강수 */}
          {weather.precipitation > 0 ? (
            <p className="mt-2 rounded-lg bg-blue-100 px-3 py-1.5 text-center text-[11px] font-semibold text-blue-700">
              ☔ {t("cctv.rain")} {weather.precipitation}mm — {t("cctv.rainWarn")}
            </p>
          ) : (
            <p className="mt-2 text-center text-[10px] text-text-secondary">
              🌧 {t("cctv.rainChance")} {weather.precipProbability}%
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-xs text-text-secondary py-3">{t("cctv.noWeather")}</p>
      )}
    </div>
  );
}
