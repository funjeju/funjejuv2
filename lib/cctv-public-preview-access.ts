/** Read-only web surface for a public CCTV preview. This does not replace
 * Firebase rules or media-proxy authorization, and never broadens production.
 */
export function publicPreviewAccess(pathname: string, method: string): "allow" | "cctv" | "deny" {
  if (method !== "GET" && method !== "HEAD") return "deny";
  // Account and legacy multiview workflows are deliberately not part of this
  // anonymous single-camera preview, even when someone follows an old URL.
  if (["/mypage", "/search", "/cctv/multiview"].includes(pathname.replace(/\/$/, ""))) return "cctv";
  if (pathname === "/" || pathname === "/cctv" || pathname === "/cctv/") return "allow";
  if (/^\/cctv\/(?:watch\/[a-zA-Z0-9_-]{1,100}|region\/[^/]+|theme\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{1,100})\/?$/.test(pathname)) return "allow";
  // The only application API needed by these public pages is read-only weather.
  if (pathname === "/api/weather") return "allow";
  if ((pathname.startsWith("/_next/static/") || pathname === "/_next/image") || pathname.startsWith("/fonts/") || pathname.startsWith("/cctv-editorial/")) return "allow";
  if (["/favicon.ico", "/icon.png", "/apple-icon.png", "/og-image.png", "/robots.txt"].includes(pathname)) return "allow";
  // All admin/auth/config/cron/stats/write APIs and unrelated product surfaces
  // are unavailable on the public preview, even with an existing admin cookie.
  return "deny";
}
