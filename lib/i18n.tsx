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

  // ── 공통 ────────────────────────────────────────────────
  "common.more": { ko: "더보기 →", en: "More →", ja: "もっと見る →", zh: "更多 →" },
  "common.viewAll": { ko: "전체보기", en: "View all", ja: "すべて見る", zh: "查看全部" },
  "auth.logout": { ko: "로그아웃", en: "Log out", ja: "ログアウト", zh: "退出" },
  "auth.loginShort": { ko: "로그인", en: "Sign in", ja: "ログイン", zh: "登录" },

  // ── 내비 추가 ───────────────────────────────────────────
  "nav./card": { ko: "카드뉴스", en: "Card News", ja: "カードニュース", zh: "卡片新闻" },

  // ── 사이드바 마스코트 ───────────────────────────────────
  "sidebar.greeting": { ko: "안녕하세요!", en: "Hello!", ja: "こんにちは！", zh: "您好！" },
  "sidebar.docent": { ko: "제주 여행 AI 도슨트", en: "Jeju Travel AI Guide", ja: "済州旅行AIガイド", zh: "济州旅行AI向导" },
  "sidebar.haveFun": { ko: "오늘도 즐거운 여행 되세요!", en: "Have a great trip today!", ja: "今日も良い旅を！", zh: "祝您旅途愉快！" },
  "sidebar.askDocent": { ko: "도슨트에게 물어보기 💬", en: "Ask the guide 💬", ja: "ガイドに聞く 💬", zh: "向向导提问 💬" },

  // ── 플로팅 챗봇 ─────────────────────────────────────────
  "chat.float": { ko: "무엇이든 물어보살 🔮", en: "Ask me anything 🔮", ja: "何でも聞いてね 🔮", zh: "什么都可以问我 🔮" },

  // ── 홈 ──────────────────────────────────────────────────
  "home.hero.title": { ko: "제주, 지금 이 순간을 담다", en: "Jeju, captured right now", ja: "済州、今この瞬間を", zh: "济州，定格此刻" },
  "home.hero.sub": { ko: "실시간 제주, 당신의 여행이 콘텐츠가 되는 곳", en: "Live Jeju — where your trip becomes content", ja: "リアルタイム済州 — あなたの旅がコンテンツになる場所", zh: "实时济州 — 让你的旅行成为内容" },
  "home.hero.weatherBadge": { ko: "☀️ 좋은 날씨", en: "☀️ Nice weather", ja: "☀️ 良い天気", zh: "☀️ 好天气" },
  "home.section.spot": { ko: "🔍 제주 틀린그림찾기", en: "🔍 Spot the Difference", ja: "🔍 済州まちがい探し", zh: "🔍 济州找不同" },
  "home.section.webzine": { ko: "📖 제주 여행 웹진", en: "📖 Jeju Travel Webzine", ja: "📖 済州旅行ウェブマガジン", zh: "📖 济州旅行杂志" },
  "home.mascot.title": { ko: "안녕! 나는 제주 여행 AI 도슨트야 😎", en: "Hi! I'm your Jeju travel AI guide 😎", ja: "やあ！済州旅行AIガイドだよ 😎", zh: "嗨！我是济州旅行AI向导 😎" },
  "home.mascot.sub": { ko: "지금 어디야? 내가 딱 맞는 여행을 추천해줄게!", en: "Where are you? I'll recommend the perfect trip!", ja: "今どこ？ぴったりの旅をおすすめするよ！", zh: "你在哪？我来推荐最合适的行程！" },
  "home.chip.weather": { ko: "지금 날씨에 좋은 코스", en: "Best for today's weather", ja: "今日の天気に合うコース", zh: "适合今天天气的路线" },
  "home.chip.kids": { ko: "아이랑 가기 좋은 곳", en: "Great with kids", ja: "子連れにおすすめ", zh: "适合带孩子" },
  "home.chip.rainy": { ko: "비 오는 날 추천 장소", en: "Rainy-day picks", ja: "雨の日のおすすめ", zh: "雨天推荐" },
  "home.chip.solo": { ko: "혼자 여행 코스 추천", en: "Solo travel routes", ja: "一人旅コース", zh: "独自旅行路线" },
  "home.planner.title": { ko: "AI 여행 일정 만들기", en: "Make an AI trip plan", ja: "AI旅行プランを作成", zh: "制作AI行程" },
  "home.planner.sub": { ko: "나만의 맞춤 여행 일정을 AI가 설계해드려요!", en: "AI designs your custom trip itinerary!", ja: "あなただけの旅程をAIが設計！", zh: "AI为你定制专属行程！" },
  "home.planner.cta": { ko: "일정 만들기 →", en: "Plan now →", ja: "プラン作成 →", zh: "开始制定 →" },

  // ── 게임 배너 ───────────────────────────────────────────
  "game.banner.title": { ko: "🔍 틀린그림찾기 · 최근 게시물", en: "🔍 Spot the Difference · Recent", ja: "🔍 まちがい探し · 最近", zh: "🔍 找不同 · 最近" },
  "game.diff": { ko: "틀린곳", en: "Diffs", ja: "違い", zh: "不同处" },
  "game.plays": { ko: "회 플레이", en: "plays", ja: "回プレイ", zh: "次游玩" },
  "game.banner.cta": { ko: "눌러서 틀린그림 찾고 보상 받기 🎁", en: "Tap to play & earn rewards 🎁", ja: "タップして遊んで報酬ゲット 🎁", zh: "点击游玩领奖励 🎁" },

  // ── CCTV 상세 크롬 ──────────────────────────────────────
  "cctv.badge.youtube": { ko: "YouTube 라이브", en: "YouTube Live", ja: "YouTubeライブ", zh: "YouTube直播" },
  "cctv.badge.connected": { ko: "연결됨", en: "Connected", ja: "接続中", zh: "已连接" },
  "cctv.badge.notset": { ko: "미설정", en: "Not set", ja: "未設定", zh: "未设置" },
  "cctv.tag.live": { ko: "실시간", en: "Live", ja: "ライブ", zh: "实时" },
  "cctv.askAi": { ko: "돌AI에게 물어보기", en: "Ask Dol AI", ja: "Dol AIに聞く", zh: "问Dol AI" },
  "cctv.askAi.sub": { ko: "이 장소 주변 맛집·카페·코스를 AI가 추천해드려요", en: "AI recommends nearby eats, cafés & routes", ja: "周辺のグルメ・カフェ・コースをAIが提案", zh: "AI推荐周边美食·咖啡·路线" },
  "cctv.askAi.cta": { ko: "채팅 시작하기 →", en: "Start chat →", ja: "チャット開始 →", zh: "开始聊天 →" },
  "cctv.nearby": { ko: "주변 CCTV", en: "Nearby CCTV", ja: "周辺CCTV", zh: "周边CCTV" },
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

/**
 * 서버 컴포넌트에서도 번역 텍스트를 렌더하는 다리.
 * 서버는 ko로 SSR(SEO 유지) → 클라이언트에서 선택 언어로 하이드레이션.
 * 예) <T k="home.hero.title" />
 */
export function T({ k }: { k: string }) {
  const t = useT();
  return <>{t(k)}</>;
}
