"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * 간단 다국어 (i18n) — 클라이언트 전용, localStorage + 브라우저 언어 자동감지.
 * 서버 컴포넌트는 한국어로 정적/ISR 렌더(SEO 유지) → 클라이언트에서 토글 시 번역.
 * 외국인 진입점(CCTV·내비)을 우선 번역. 한국어가 원본/폴백.
 */

export const LANGS = ["ko", "en", "ja", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

type Entry = Partial<Record<Lang, string>>;

// key → 언어별 문자열. ko 는 항상 존재(원본/폴백).
const DICT: Record<string, Entry> = {
  // ── 사이드바 태그라인 / 검색 ────────────────────────────
  "app.tagline": { ko: "제주가 더 FUN해지는 여행", en: "Jeju, made more FUN", ja: "もっと楽しい済州の旅", zh: "让济州更有趣的旅行" },
  "search.placeholder": { ko: "제주에서 검색...", en: "Search Jeju...", ja: "済州を検索...", zh: "搜索济州..." },
  "auth.login": { ko: "구글로 로그인", en: "Sign in with Google", ja: "Googleでログイン", zh: "用Google登录" },

  // ── 내비게이션 (href 기준) ──────────────────────────────
  "nav./": { ko: "홈", en: "Home", ja: "ホーム", zh: "首页" },
  "nav./cctv": { ko: "실시간 CCTV", en: "Live CCTV", ja: "ライブCCTV", zh: "实时监控" },
  "nav./weather": { ko: "제주 날씨", en: "Jeju Weather", ja: "済州の天気", zh: "济州天气" },
  "nav./feed": { ko: "라이브 피드", en: "Live Feed", ja: "ライブフィード", zh: "实时动态" },
  "nav./food": { ko: "도민맛집", en: "Local Eats", ja: "地元グルメ", zh: "本地美食" },
  "nav./jeju-ai": { ko: "제주여행 AI", en: "Jeju Travel AI", ja: "済州旅行AI", zh: "济州旅行AI" },
  "nav./magazine": { ko: "제주 매거진", en: "Jeju Magazine", ja: "済州マガジン", zh: "济州杂志" },
  "nav./game/spot": { ko: "틀린그림찾기", en: "Spot the Difference", ja: "間違い探し", zh: "找不同" },
  "nav./youtube": { ko: "제주tube", en: "JejuTube", ja: "済州tube", zh: "济州tube" },
  "nav./minihome": { ko: "미니홈피", en: "Minihompy", ja: "ミニホムピ", zh: "迷你小窝" },
  "nav./mypage": { ko: "마이페이지", en: "My Page", ja: "マイページ", zh: "我的" },

  // ── 하단 내비 (짧은 라벨) ───────────────────────────────
  "tab./": { ko: "홈", en: "Home", ja: "ホーム", zh: "首页" },
  "tab./cctv": { ko: "CCTV", en: "CCTV", ja: "CCTV", zh: "监控" },
  "tab./feed": { ko: "피드", en: "Feed", ja: "フィード", zh: "动态" },
  "tab./game/spot": { ko: "틀린그림찾기", en: "Game", ja: "ゲーム", zh: "游戏" },
  "tab./mypage": { ko: "마이", en: "My", ja: "マイ", zh: "我的" },
  "tab.feed.upload": { ko: "올리기", en: "Post", ja: "投稿", zh: "发布" },

  // ── CCTV 라이브 정보 위젯 ───────────────────────────────
  "cctv.liveInfo": { ko: "🌡️ 현장 실시간 정보", en: "🌡️ Live Conditions", ja: "🌡️ 現地リアルタイム情報", zh: "🌡️ 现场实时信息" },
  "cctv.updateNote": { ko: "Open-Meteo · 10분마다 갱신", en: "Open-Meteo · every 10 min", ja: "Open-Meteo · 10分ごとに更新", zh: "Open-Meteo · 每10分钟更新" },
  "cctv.weather": { ko: "날씨", en: "Weather", ja: "天気", zh: "天气" },
  "cctv.tide": { ko: "물때", en: "Tide", ja: "潮汐", zh: "潮汐" },
  "cctv.wind": { ko: "바람", en: "Wind", ja: "風", zh: "风" },
  "cctv.noWeather": { ko: "날씨 정보를 가져올 수 없어요", en: "Weather data unavailable", ja: "天気情報を取得できません", zh: "无法获取天气信息" },
  "cctv.rainWarn": { ko: "강수 — 우산 챙기세요!", en: "Rain — bring an umbrella!", ja: "降雨 — 傘をお忘れなく！", zh: "有降雨 — 记得带伞！" },

  // ── 날씨 설명 (WMO 코드) ────────────────────────────────
  "wx.clear": { ko: "맑음", en: "Clear", ja: "晴れ", zh: "晴" },
  "wx.partly": { ko: "구름 조금", en: "Partly cloudy", ja: "晴れ時々曇り", zh: "多云" },
  "wx.cloudy": { ko: "흐림", en: "Cloudy", ja: "曇り", zh: "阴" },
  "wx.fog": { ko: "안개", en: "Fog", ja: "霧", zh: "雾" },
  "wx.drizzle": { ko: "이슬비", en: "Drizzle", ja: "霧雨", zh: "毛毛雨" },
  "wx.rain": { ko: "비", en: "Rain", ja: "雨", zh: "雨" },
  "wx.snow": { ko: "눈", en: "Snow", ja: "雪", zh: "雪" },
  "wx.showers": { ko: "소나기", en: "Showers", ja: "にわか雨", zh: "阵雨" },
  "wx.thunder": { ko: "천둥번개", en: "Thunderstorm", ja: "雷雨", zh: "雷暴" },
  "wx.unknown": { ko: "알 수 없음", en: "Unknown", ja: "不明", zh: "未知" },

  // ── 풍속 라벨 ───────────────────────────────────────────
  "wind.calm": { ko: "약풍", en: "Calm", ja: "弱風", zh: "微风" },
  "wind.moderate": { ko: "적당", en: "Moderate", ja: "適度", zh: "适中" },
  "wind.strong": { ko: "강풍", en: "Strong", ja: "強風", zh: "强风" },
  "wind.verystrong": { ko: "매우 강함", en: "Very strong", ja: "非常に強い", zh: "非常强" },
};

/** WMO 날씨 코드 → 번역 키 */
export function weatherKey(code: number): string {
  if (code === 0) return "wx.clear";
  if (code <= 2) return "wx.partly";
  if (code === 3) return "wx.cloudy";
  if (code >= 45 && code <= 48) return "wx.fog";
  if (code >= 51 && code <= 57) return "wx.drizzle";
  if (code >= 61 && code <= 67) return "wx.rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "wx.snow";
  if (code >= 80 && code <= 82) return "wx.showers";
  if (code >= 95) return "wx.thunder";
  return "wx.unknown";
}

/** 풍속(m/s) → 번역 키 */
export function windKey(windSpeed: number): string {
  if (windSpeed < 2) return "wind.calm";
  if (windSpeed < 5) return "wind.moderate";
  if (windSpeed < 10) return "wind.strong";
  return "wind.verystrong";
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx>({ lang: "ko", setLang: () => {}, t: (k) => k });

const STORAGE_KEY = "fj_lang";

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "ko";
  const n = navigator.language.toLowerCase();
  if (n.startsWith("ko")) return "ko";
  if (n.startsWith("ja")) return "ja";
  if (n.startsWith("zh")) return "zh";
  if (n.startsWith("en")) return "en";
  return "en"; // 그 외 외국어는 영어로
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // SSR/첫 렌더는 항상 ko → 하이드레이션 불일치 방지. 마운트 후 실제 언어 적용.
  const [lang, setLangState] = useState<Lang>("ko");

  useEffect(() => {
    let initial: Lang | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && (LANGS as readonly string[]).includes(saved)) initial = saved;
    } catch {}
    if (!initial) initial = detectBrowserLang();
    if (initial !== "ko") setLangState(initial);
    try { document.documentElement.lang = initial; } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    try { document.documentElement.lang = l; } catch {}
  }, []);

  const t = useCallback(
    (key: string) => {
      const e = DICT[key];
      if (!e) return key;
      return e[lang] ?? e.ko ?? key;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** 짧게 t 만 필요할 때 */
export function useT() {
  return useContext(I18nContext).t;
}
