# Monochrome camera directory — UI-only review

2026-11-02. User requested black-and-white tone and thumbnail previews in the
actual web UI. Prepared in an isolated worktree based on `b0bf5ee`, preserving
the separate, uncommitted 13-file preview-playback QA preparation.

## Scope

- Existing sidebar, list/map structure and self-hosted Pretendard retained.
- Focused public shell uses neutral black/white/gray surfaces, text and controls.
  Compact map pins are white on black. Only OpenStreetMap tiles are desaturated;
  photo assets and other routes are not globally filtered.
- Every compact card has a larger landscape-format illustrative thumbnail using
  existing licensed local Jeju photos. The visible `예시 사진` badge and
  `제주 풍경 예시 · 실시간 화면 아님` label are always present for loaded photos.
  Expanded attribution explicitly says this is not the named CCTV's camera image.
  Credits, source/license links, crop note, loading failure graphic, favorites,
  sharing and dedicated-window routing are retained.
- These photos are **not** camera captures, location-matched evidence, current
  weather, new playback checks or a new claim of feed health. No snapshot request
  or source/media request is added.
- No camera/source inventory, publication policy, auth, proxy, environment,
  infrastructure, production-domain or media authorization changes.

## Local verification

- 181 CCTV unit/component tests; TypeScript no-emit; changed TSX lint; diff check.
- Real browser component fixture with synthetic source URLs, stubbed auth and
  share/favorites. Uses the real changed components, local licensed photos,
  self-hosted Pretendard and actual OpenStreetMap fallback tiles.
- Desktop 1165px, tablet 785px and mobile 375px content widths have matching
  scroll widths (no horizontal overflow). All 11 thumbnails load and are labelled.
  Desktop map loaded nine actual tiles.
- Search for the airport returns one card; clearing restores the list. Photo
  attribution expands with the no-camera-frame disclaimer and correct license.
  Responsive list/map switching retains the committed panel scroll target.
- This is UI/fixture QA, not production inventory/auth/Kakao or CCTV playback
  validation. Existing protected-preview authentication and media-origin limits
  remain unchanged. No production deployment is included in this UI preview.
