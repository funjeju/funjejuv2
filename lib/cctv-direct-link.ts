/** A navigation validator, not a fetch/proxy or proof of source availability.
 * The caller must first apply the authoritative published-camera/source gate.
 * No DNS lookup: domain names cannot guarantee their eventual resolved address.
 */
export type DirectCameraSource = { active?: boolean; originUrl?: string; youtubeId?: string };

function publicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  // Current approved sources use IPv4. Fail closed on IPv6 rather than risk an
  // IPv4-mapped, zone-scoped or special-purpose address being interpreted locally.
  if (host.includes(":")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b, c] = host.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (host.endsWith(".") || !host.includes(".") || !/^[a-z0-9.-]+$/.test(host)) return false;
  if (host.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return false;
  const reserved = ["localhost", "local", "internal", "intranet", "corp", "alt", "lan", "home", "test", "invalid", "example", "onion", "arpa", "example.com", "example.net", "example.org"];
  return !reserved.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
}

export function directCameraSourceUrl(camera: DirectCameraSource): string | null {
  if (camera.active !== true || camera.youtubeId || typeof camera.originUrl !== "string") return null;
  const raw = camera.originUrl;
  // Do not normalize away whitespace, backslashes or encoded control characters.
  if (!raw || /[\s\u0000-\u001f\u007f\\]/.test(raw) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(raw)) return null;
  try {
    const url = new URL(raw);
    if (!/^https?:\/\//i.test(raw) || !["http:", "https:"].includes(url.protocol) ||
      url.username || url.password || raw.includes("?") || raw.includes("#") || !publicHostname(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

/** Verified public provider pages, never a relay or a newly constructed endpoint. */
const OFFICIAL_HALLASAN_VIEWERS: Readonly<Record<string, string>> = Object.freeze({
  halla_baengnokdam: "https://www.jeju.go.kr/tool/halla/cctv_01.html",
  halla_wanggwanneung: "https://www.jeju.go.kr/tool/halla/cctv_02.html",
  halla_witse: "https://www.jeju.go.kr/tool/halla/cctv_03.html",
  halla_eoseungsaeng: "https://www.jeju.go.kr/tool/halla/cctv_04.html",
  halla_1100: "https://www.jeju.go.kr/tool/halla/cctv_05.html",
});

export function directCameraViewerUrl(camera: DirectCameraSource & { id?: string }): string | null {
  const source = directCameraSourceUrl(camera);
  if (!source) return null;
  return camera.id && Object.hasOwn(OFFICIAL_HALLASAN_VIEWERS, camera.id)
    ? OFFICIAL_HALLASAN_VIEWERS[camera.id] : source;
}
