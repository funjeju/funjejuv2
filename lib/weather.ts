/**
 * Open-Meteo Weather API (API 키 불필요, 무료, 무제한)
 * https://open-meteo.com/
 */

export type Weather = {
  temperature: number;        // 현재 기온 (°C)
  apparentTemp: number;        // 체감온도
  humidity: number;            // 습도 (%)
  windSpeed: number;           // 풍속 (m/s)
  precipitation: number;       // 강수량 (mm)
  precipProbability: number;   // 강수확률 (%) — 현재 시각 기준
  weatherCode: number;         // WMO 날씨 코드
  isDay: boolean;
  description: string;         // 한글 날씨 설명
  emoji: string;               // 날씨 이모지
  congestion: "한산" | "보통" | "혼잡"; // (deprecated — UI에서 미사용)
  congestionEmoji: string;
  windLabel: string;           // 약풍/적당/강풍
  tide: string;                // 물때 (예: "7물", "조금", "사리")
  tideEmoji: string;
  tideDetail: string;          // 짧은 설명 (물살 세기)
};

// WMO Weather interpretation codes
function interpretCode(code: number, isDay: boolean): { description: string; emoji: string } {
  if (code === 0) return { description: "맑음", emoji: isDay ? "☀️" : "🌙" };
  if (code <= 2) return { description: "구름 조금", emoji: isDay ? "🌤️" : "☁️" };
  if (code === 3) return { description: "흐림", emoji: "☁️" };
  if (code >= 45 && code <= 48) return { description: "안개", emoji: "🌫️" };
  if (code >= 51 && code <= 55) return { description: "이슬비", emoji: "🌦️" };
  if (code >= 56 && code <= 57) return { description: "어는비", emoji: "🌧️" };
  if (code >= 61 && code <= 65) return { description: "비", emoji: "🌧️" };
  if (code >= 66 && code <= 67) return { description: "어는비", emoji: "🌧️" };
  if (code >= 71 && code <= 75) return { description: "눈", emoji: "🌨️" };
  if (code === 77) return { description: "싸락눈", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { description: "소나기", emoji: "🌧️" };
  if (code >= 85 && code <= 86) return { description: "눈 소나기", emoji: "🌨️" };
  if (code === 95) return { description: "천둥번개", emoji: "⛈️" };
  if (code >= 96 && code <= 99) return { description: "우박 천둥", emoji: "⛈️" };
  return { description: "알 수 없음", emoji: "🌡️" };
}

function getWindLabel(windSpeed: number): string {
  if (windSpeed < 2) return "약풍";
  if (windSpeed < 5) return "적당";
  if (windSpeed < 10) return "강풍";
  return "매우 강함";
}

/**
 * 물때 계산 (음력 기반 — 제주 7물때식)
 * 기준 합삭(신월): 2000-01-06 18:14 KST / 삭망월 29.530589일
 * 음력일 1일 = 7물 (제주·서해안식)
 */
function calcTide(now: Date): { tide: string; emoji: string; detail: string } {
  const epoch = Date.UTC(2000, 0, 6, 9, 14); // 2000-01-06 18:14 KST = 09:14 UTC
  const synodic = 29.530589;
  const days = (now.getTime() - epoch) / 86400000;
  const lunarAge = ((days % synodic) + synodic) % synodic;
  const lunarDay = Math.floor(lunarAge) + 1; // 음력일 (1~30)

  // 제주 7물때식: 음력 1일 = 7물
  const mul = ((lunarDay - 1 + 6) % 15) + 1; // 1~15

  // 이름 매핑: 15물때 체계 (1~13물, 조금, 무시)
  let name: string;
  let emoji: string;
  let detail: string;
  if (mul === 14) {
    name = "조금"; emoji = "🌗"; detail = "물살 가장 약함";
  } else if (mul === 15) {
    name = "무시"; emoji = "🌗"; detail = "물살 약함";
  } else {
    name = `${mul}물`;
    if (mul >= 6 && mul <= 9) { emoji = "🌊"; detail = "물살 강함 (사리)"; }
    else if (mul >= 4 && mul <= 11) { emoji = "🌊"; detail = "물살 보통"; }
    else { emoji = "🌙"; detail = "물살 약함"; }
  }
  return { tide: name, emoji, detail };
}

function estimateCongestion(
  weatherCode: number,
  hour: number,
  isWeekend: boolean
): { level: Weather["congestion"]; emoji: string } {
  // 비/눈/안개면 한산
  if (weatherCode >= 45) return { level: "한산", emoji: "🟢" };

  // 새벽/늦은 밤
  if (hour < 8 || hour >= 21) return { level: "한산", emoji: "🟢" };

  // 점심~오후 + 주말 = 혼잡
  if (isWeekend && hour >= 11 && hour <= 17) return { level: "혼잡", emoji: "🔴" };

  // 평일 점심
  if (!isWeekend && hour >= 12 && hour <= 14) return { level: "보통", emoji: "🟡" };

  // 일출/일몰
  if (hour <= 9 || hour >= 18) return { level: "보통", emoji: "🟡" };

  return { level: isWeekend ? "보통" : "한산", emoji: isWeekend ? "🟡" : "🟢" };
}

/** 위경도로 현재 날씨 가져오기 */
export async function fetchWeather(lat: number, lng: number): Promise<Weather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "Asia/Seoul");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("forecast_days", "1");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 600 }, // 10분 캐시
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        precipitation: number;
        weather_code: number;
        is_day: number;
        time?: string;
      };
      hourly?: { time: string[]; precipitation_probability: number[] };
    };

    const c = data.current;
    // 현재 시각의 강수확률 (hourly에서 현재 시 매칭)
    let precipProbability = 0;
    if (data.hourly?.time?.length) {
      const nowHour = (c.time ?? "").slice(0, 13); // YYYY-MM-DDTHH
      const idx = data.hourly.time.findIndex((t) => t.slice(0, 13) === nowHour);
      const probs = data.hourly.precipitation_probability ?? [];
      precipProbability = idx >= 0 ? (probs[idx] ?? 0) : (probs[0] ?? 0);
    }
    const isDay = c.is_day === 1;
    const { description, emoji } = interpretCode(c.weather_code, isDay);

    const now = new Date();
    const dow = now.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const cong = estimateCongestion(c.weather_code, now.getHours(), isWeekend);
    const tideInfo = calcTide(now);

    return {
      temperature: Math.round(c.temperature_2m),
      apparentTemp: Math.round(c.apparent_temperature),
      humidity: Math.round(c.relative_humidity_2m),
      windSpeed: Math.round(c.wind_speed_10m * 10) / 10,
      precipitation: c.precipitation,
      precipProbability,
      weatherCode: c.weather_code,
      isDay,
      description,
      emoji,
      congestion: cong.level,
      congestionEmoji: cong.emoji,
      windLabel: getWindLabel(c.wind_speed_10m),
      tide: tideInfo.tide,
      tideEmoji: tideInfo.emoji,
      tideDetail: tideInfo.detail,
    };
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────
 * 조위(만조·간조) — Open-Meteo Marine API (API 키 불필요)
 * sea_level_height_msl(평균해수면 기준 m) 시계열에서 극값을 찾아 만조/간조 시각·높이 산출.
 * ────────────────────────────────────────────── */
export type TideEvent = { type: "high" | "low"; time: string; heightCm: number };
export type TideInfo = {
  currentCm: number;       // 현재 수위 (cm, 평균해수면 기준)
  rising: boolean;         // 밀물(true)/썰물(false)
  events: TideEvent[];     // 오늘 만조·간조 (시간순)
  next?: TideEvent;        // 지금 이후 첫 만조/간조
};

function kstParts(): { date: string; hourKey: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  let hh = g("hour"); if (hh === "24") hh = "00";
  const date = `${g("year")}-${g("month")}-${g("day")}`;
  return { date, hourKey: `${date}T${hh}` };
}

export async function fetchTide(lat: number, lng: number): Promise<TideInfo | null> {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("timezone", "Asia/Seoul");
  url.searchParams.set("forecast_days", "2");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json() as { hourly?: { time: string[]; sea_level_height_msl: (number | null)[] } };
    const time = data.hourly?.time ?? [];
    const h = data.hourly?.sea_level_height_msl ?? [];
    if (time.length < 3 || h.length < 3) return null;

    const { date, hourKey } = kstParts();

    // 극값 탐색 → 만조(high)/간조(low)
    const all: TideEvent[] = [];
    for (let i = 1; i < h.length - 1; i++) {
      const prev = h[i - 1], cur = h[i], next = h[i + 1];
      if (prev == null || cur == null || next == null) continue;
      if (cur > prev && cur >= next) all.push({ type: "high", time: time[i], heightCm: Math.round(cur * 100) });
      else if (cur < prev && cur <= next) all.push({ type: "low", time: time[i], heightCm: Math.round(cur * 100) });
    }

    // 현재 수위·밀물/썰물
    let curIdx = time.findIndex((t) => t.slice(0, 13) === hourKey);
    if (curIdx < 0) curIdx = 0;
    const curVal = h[curIdx] ?? 0;
    const nextVal = h[curIdx + 1] ?? curVal;
    const currentCm = Math.round((curVal ?? 0) * 100);
    const rising = nextVal > curVal;

    const events = all.filter((e) => e.time.slice(0, 10) === date);
    const next = all.find((e) => e.time > hourKey + ":00");

    return { currentCm, rising, events, next };
  } catch {
    return null;
  }
}
