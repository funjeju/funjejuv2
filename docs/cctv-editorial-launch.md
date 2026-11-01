# Editorial CCTV launch — visual-first scope

The user's latest instruction prioritizes the new design and existing playback before later camera-source verification. This branch, `codex/cctv-editorial-launch`, starts from the reviewed `94a7c105` implementation, not the separate strict-verification branch. The strict source-bound expiry/automatic verifier work is preserved in `codex/cctv-verified-gating`; it is deliberately **not enabled or included in this visual launch**.

## New visual direction

The previously rejected cream/green concept is replaced by a bold ink-and-lime editorial surface: oversized Korean typography, photographic island hero, compact navigation, URL-backed search/direction/category filters, list/map switch, and photographic/graphic camera cards. Scenic photographs are historical decorative imagery, explicitly not live CCTV or exact-location preview frames. Credits and licenses appear in the page and individual cards; see `cctv-editorial-assets.md`.

List cards and map markers use one accessible native dialog, reusing the existing HLS, YouTube and HTTP popup players. Close/Escape/backdrop remove the player; removed/inactive selections cannot reopen themselves. Source identity changes remount media while ordinary names/descriptions do not restart it. Detail URLs, favorites, share, login/language, legacy pages and other retained features remain available.

## Preservation and data boundaries

- No camera source/record, active state, auth, Firebase settings, proxy/KV, health/reboot cron or infrastructure configuration is changed by this visual delta.
- No fresh playback-verification field is required for existing active cameras. Unknown or failed playback is not advertised as healthy; existing player runtime error handling remains.
- The new CSV audit is a separate offline review artifact. Damaged/shifted text and reused jurisdiction IDs do not justify blind name-only source replacement. Token-bearing sources and the unrelated uploaded service-account file are not read into this public UI, committed, uploaded or used.
- The original design reference's scope denial remains respected. This is an independent design based on the user's explicit textual direction, not a claimed match to the inaccessible original.

## Validation / preview

86 CCTV regression tests, TypeScript and changed-source ESLint pass locally. The additional tests cover URL filters, active-inventory preservation, mobile accessible names, scenic labels, list/map selection and shared dialog lifecycle. The independent review also checks feature preservation and attribution.

The production build successfully bundles CSS/assets and typechecks, then the local environment cannot prerender existing CCTV detail pages because its Firebase Admin credential is not configured. Do not read the unrelated uploaded key. The existing authorized Vercel preview configuration can perform the full build. Preview shares actual runtime Firebase configuration, so QA is read-only; never use it for speculative admin writes or automatic verification publishing.

Actual desktop/mobile browser layout, native dialog focus/media cleanup, Kakao Maps and live source behavior still need the safe preview check. No local browser restriction or source WAF denial is bypassed. The web deployment does not deploy the separate Vultr/Cloudflare services, and no billing cancellation is authorized by this launch.
