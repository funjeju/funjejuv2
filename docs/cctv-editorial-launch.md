# Editorial CCTV launch — visual-first scope

The user's latest instruction prioritizes the new design and existing playback before later camera-source verification. This branch, `codex/cctv-editorial-launch`, starts from the reviewed `94a7c105` implementation, not the separate strict-verification branch. The strict source-bound expiry/automatic verifier work is preserved in `codex/cctv-verified-gating`; it is deliberately **not enabled or included in this visual launch**.

## New visual direction

The previously rejected cream/green concept is replaced by a bold ink-and-lime editorial surface: oversized Korean typography, photographic island hero, compact navigation, URL-backed search/direction/category filters, list/map switch, and photographic/graphic camera cards. Scenic photographs are historical decorative imagery, explicitly not live CCTV or exact-location preview frames. Credits and licenses appear in the page and individual cards; see `cctv-editorial-assets.md`.

HTTPS HLS and YouTube cards and map markers use one accessible native dialog. Ordinary HTTP origins instead open a fixed canonical HTTPS detail viewer in a separate top-level window, preserving the existing approved HTTPS proxy path. Only the exact legacy provider retains its direct HTTP viewer. Selection is source-metadata driven, with legacy-ID fallback only when metadata is absent. The fallback new-tab link remains visible; only camera ID/name are passed to the fixed viewer URL, never origin credentials. Close/Escape/backdrop remove the player; removed/inactive selections cannot reopen themselves. Source identity changes remount media while ordinary names/descriptions do not restart it. Detail URLs, favorites, share, login/language, legacy pages and other retained features remain available. Public header/home multiview promotion is hidden per the latest user instruction; the legacy route and implementation are retained.

## Preservation and data boundaries

- No camera source/record, active state, auth, Firebase settings, proxy/KV, health/reboot cron or infrastructure configuration is changed by this visual delta.
- No fresh playback-verification field is required for existing active cameras. Unknown or failed playback is not advertised as healthy; existing player runtime error handling remains.
- The new CSV audit is a separate offline review artifact. Damaged/shifted text and reused jurisdiction IDs do not justify blind name-only source replacement. Token-bearing sources and the unrelated uploaded service-account file are not read into this public UI, committed, uploaded or used.
- The original design reference's scope denial remains respected. This is an independent design based on the user's explicit textual direction, not a claimed match to the inaccessible original.

## Validation / preview

The initial editorial commit passed 86 CCTV regression tests, TypeScript and changed-source ESLint locally; the HTTP/map correction now passes 114 total CCTV tests, including protocol routing, legacy-detail fallback, and map SDK lifecycle regressions. TypeScript and scoped ESLint also pass. The additional tests cover URL filters, active-inventory preservation, mobile accessible names, scenic labels, list/map selection and shared dialog lifecycle. The independent review also checks feature preservation and attribution.

The production build successfully bundles CSS/assets and typechecks, then the local environment cannot prerender existing CCTV detail pages because its Firebase Admin credential is not configured. Do not read the unrelated uploaded key. The existing authorized Vercel preview configuration can perform the full build. Preview shares actual runtime Firebase configuration, so QA is read-only; never use it for speculative admin writes or automatic verification publishing.

Actual desktop/mobile browser layout, native dialog focus/media cleanup, Kakao Maps and live source behavior still need the safe preview check. No local browser restriction or source WAF denial is bypassed. The web deployment does not deploy the separate Vultr/Cloudflare services, and no billing cancellation is authorized by this launch.

## Actual preview corrections (2026-11-01)

The first editorial preview was built successfully on Vercel but the user observed 도두항 stuck connecting and the Kakao map failing. HTTP source metadata was incorrectly sent to the HTTPS embedded player unless its ID appeared in the old nine-camera Vurix list. Legacy summaries without source metadata now link to the authoritative detail route instead of guessing a transport. List, map and detail routing now use the actual stored protocol, with YouTube taking precedence. No camera source was replaced and no real playback success is implied by this correction.

The Kakao public key exists in preview; its registered-domain configuration has not been independently verified. The map now offers an independent keyless OpenStreetMap fallback, and a local coordinate diagram plus accessible list if both providers fail. It does not proxy a denied Kakao request or change the provider's permissions. Failed SDK elements and late asynchronous callbacks are cleaned up.

The retained legacy HTTP viewer remains dependent on the separate Vultr service. Ordinary HTTP-origin cameras now use the existing approved HTTPS proxy in a canonical separate window instead; see `cctv-https-window.md`. The supported browser previously displayed a security warning for that viewer; no warning was bypassed, and real playback through that path is **not validated**. Popup behavior in tests is not evidence of decoded frames. A normal accessible viewer path and real browser playback checks remain a production-release prerequisite; this web change does not deploy or modify the separate viewer/proxy. The preview Worker hostname allowlist is also unchanged.
