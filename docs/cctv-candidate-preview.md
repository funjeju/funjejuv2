# Isolated private candidate reference — not a source rollout

The public CCTV hook reads existing Firestore records, and the separate HTTP viewer resolves its own camera-ID configuration. Showing a new name or protocol does not change either media input. This preparation compares supplied replacement candidates without rewriting those existing sources.

## Privacy boundary

The public repository contains **no supplied source catalog, original CSV, actual candidate URL list or copied real-data test fixture**. Administrator UI protection would not protect a catalog committed to public Git history. The original data-bearing experiment stays local; publish only a sanitized tree whose parent is the existing data-free review commit. Never push the local private-history branch.

Reference data is supplied through `CCTV_JEJUSI_CANDIDATES_JSON`, a server-only configuration value, scoped to **Preview and the authorized review Git branch only**. It is not a credential and must not use `NEXT_PUBLIC_`. Do not set it for Production or read unrelated existing environment secrets. Provisioning the value is a separate authenticated Vercel action using the already supplied non-token data; no value is included in this document or repository.

`lib/cctv-candidate-catalog-server.ts` imports `server-only`. The page loads configuration only after environment and existing-admin authentication checks. Missing or invalid configuration produces a generic setup notice, no input reflection and zero inventory reads. The private setting is editable through existing authorized Vercel project access; this page does not provide an environment-write or credential API. A changed setting requires the ordinary preview deployment lifecycle before taking effect.

## Read-only page

`/admin/cctv/source-preview` is allowed only in Vercel preview, or local non-Vercel development, and independently requires a nonempty existing `admin_auth` cookie matching a configured `ADMIN_SECRET`. Production and unrecognized environments return not-found before auth/config/database reads. The route uses dynamic uncached server rendering and no-index metadata. Existing public hooks, cards, data, proxy/KV, auth settings and viewer routes are unchanged.

After auth and valid private configuration, it performs at most 19 existing inventory lookups. Missing records and infrastructure errors remain distinct. It never saves, approves, creates, deletes or changes active/source state. Current raw media URLs/query parameters are not rendered; only a source revision is shown. The unrelated uploaded service-account credential and token-bearing reference data are neither read nor provisioned.

## Private data schema

The versioned private JSON contains an authority, allowed HTTPS origin and 19 candidate records. Each record contains its composite authority/source identity, supplied exact URL, tentative existing-camera crosswalk, uncertainty flags and file/line provenance. The generic parser caps input at 48 KiB, requires unique composite IDs/URLs/existing-ID matches, exact schema keys, canonical HTTPS media paths with no credentials/query/fragment, and immutable held/unverified status. Numeric IDs alone do not identify a camera. Other authorities and token-bearing inputs are rejected.

All crosswalks remain tentative. Damaged Korean labels and shifted CSV columns have not been magically repaired. In particular, the existing Gimnyeong beach label and an earlier port label do not establish the same scene; existing names and IDs are preserved. Public tests use entirely synthetic domains, identifiers, labels and provenance. Independent local audit of the actual file remains separate from those publishable fixtures.

## No source access or activation

Candidates remain held, unverified and marked `held-prior-access-denial`. The comparison returns only a proposed future HTTPS input and `canActivate: false`, not a runtime player prop or import patch. The page contains no video/audio/iframe, clickable source, source prefetch, active playback control or query-driven enable switch. Candidate addresses appear only as text to the authenticated administrator. No origin/CDN requests are performed by this feature or its tests.

An existing access/WAF denial must not be worked around using another hostname, browser, proxy, IP or headers. This comparison does **not** replace or verify live Gimnyeong playback. It prepares exact inputs for testing after the access restriction and identity review are genuinely resolved.

## Requirements before actual playback or publication

1. Establish legitimately permitted normal access and confirm place/camera identity. HTTP200 or a playlist string is not frame evidence.
2. Review a truly isolated HTTPS player. Pass the candidate as the actual HLS `proxyUrl`, not the old camera proxy route. Omit `cctvId`: otherwise the existing player derives provider `/event` beacons and may start production usage sessions. No such player is mounted here.
3. Check manifest and child-resource HTTPS/CORS behavior, decoded frames and advancing time. Do not retry a denial or weaken security controls.
4. Re-read current source revision and document version before a separately reviewed change. Preserve source history and camera ID; do not overwrite concurrent edits.
5. After visual acceptance and validation, review a bounded update and rollback before broader rollout. A Vercel web deployment does not update the separate viewer or Worker.

Tests execute actual helper/page code with deterministic auth/inventory doubles and synthetic private configuration. They check environment/auth fail-closed ordering, no config reads before auth, missing/invalid config without DB reads, allowlisting and namespace constraints, immutability, no activation/source links/player mounting, uncertainty and no secret rendering. They are not actual browser or media verification.
