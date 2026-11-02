# Public CCTV preview: prepared locally, not activated

## Goal and status

Visitors should be able to watch the selected CCTV cameras without an app login.
The former administrator-only, 30-minute test lease is superseded by a public
preview model. This change does not deploy to production or open administrator
functions, private account data, chat, or write APIs.

The preceding administrator-gated revision was published to the review branch
and its Vercel preview build reached READY. This document describes the public-viewing preparation; record its subsequent
deployment results privately. **Actual moving CCTV playback of this revision
is unverified.**
No environment value, proxy rule, credential, database rule, Vercel protection,
production deployment, or domain assignment was changed by this preparation.
Keep exact deployment/account identifiers in private operational records.

## Public viewing implementation

- The watch route no longer imports cookies or checks `ADMIN_SECRET`. Anonymous
  visitors and already-signed-in visitors receive the same public-camera rules.
- Preview hides app login, account navigation and chat login prompts. Chat does
  not mount its account subscriptions or archival writes. Favorites use a
  separate browser-local store, not shared Firebase favorites, even for an
  existing signed-in visitor. Automatic profile writes remain disabled.
- On Preview, middleware permits only GET/HEAD of CCTV pages, necessary assets
  and the existing read-only weather API. Account/search/multiview URLs redirect
  to CCTV. Admin pages, admin login, all other APIs, unrelated product surfaces
  and non-read methods return 404 before any admin-cookie check. Production's
  existing administrator protection and routes remain unchanged.
- Preview detail and dialog entry points link to the same-origin dedicated watch
  route rather than mounting an ordinary inline HLS/YouTube/legacy player. The
  watch route still rejects inactive, missing, unverified, source-replaced,
  unavailable-inventory, YouTube and legacy direct-HTTP cameras. The public
  launch selection is not expanded by this change.
- Preview video does not inherit consumer account budgets and sends no player
  `/event` beacon or usage-session identity. Preview layout still suppresses
  GA/Naver and shared pageview/profile writes. HLS.js network errors are terminal
  with no recovery or retry button. Native HLS is supported for Safari, but its
  browser-managed HTTP status/retry behavior is not observable through this
  player; actual Safari/iPhone playback needs a separate test.

This is an application-level read-only surface, **not** new Firebase security
rules or a media access token. Public inventory reads, hosting, media, weather
and map access may generate ordinary service usage/logs/costs. Free visitor
access is not a guarantee of zero infrastructure cost.

## Two non-secret settings, Preview review branch only

The public viewer defaults OFF. Both settings must be selected explicitly for
one exact non-production review branch and rebuilt at the reviewed commit:

| Name | Required value |
| --- | --- |
| `CCTV_PUBLIC_PREVIEW_ORIGIN` | One canonical HTTPS origin equal to `https://` plus the deployment's `VERCEL_URL` or `VERCEL_BRANCH_URL` |
| `CCTV_PUBLIC_PREVIEW_COMMIT` | Full lowercase 40-character SHA equal to `VERCEL_GIT_COMMIT_SHA` |

The platform must also provide `VERCEL=1` and `VERCEL_ENV=preview`. The origin
must be a single generated `*.vercel.app` hostname: no wildcard, custom or
production domain, path, query, port or credentials. Neither request headers nor
query parameters can activate it. Only that exact top-level browser origin may
mount media. The serialized permit contains only the origin, no secret or raw
camera source. Existing `CCTV_PREVIEW_PLAYBACK_*` variables cannot activate the
new public mode. There is no administrator login or fixed 30-minute expiry.

A stable branch alias is practical across a rebuild, but the next commit cannot
silently inherit permission. A new commit requires updating the reviewed SHA.
Generated deployment URLs change on rebuild; an old URL does not approve a new
URL. See Vercel's [system environment variable documentation](https://vercel.com/docs/environment-variables/system-environment-variables).

## Separate hosting and media decisions

1. Review/publish this revision only to the non-production review branch. Confirm
   the exact deployed SHA and successful build. Do not merge/promote production.
2. Through the owner's normal account, establish the exact hosting-protection
   change needed to make this revised preview anonymously accessible. Do not
   disable protection for a whole project if that would also expose older or
   unrelated deployments without reviewing that scope. Prefer a narrowly scoped
   public test deployment. No bypass/share token or new credential is required by
   this code, and none is created here.
3. Approve/apply the two non-secret branch-scoped settings above and rebuild the
   same reviewed commit. Verify the actual branch/deployment scope, not just a
   successful settings write. No Production environment change is required.
4. Establish the effective configured media service and current deployed Origin
   policy without dumping secret values. `NEXT_PUBLIC_WORKER_URL` takes priority
   over `NEXT_PUBLIC_PROXY_URL` when nonempty. The current hostname and live
   policy are not established by repository source alone.
5. **A proxy change is not automatically necessary.** If the service already
   permits the exact preview Origin with correct CORS, no proxy modification is
   needed. If it denies that Origin, obtain approval for precisely that owned
   service's one-origin addition/correction, preserving production rules and
   credentials. Never allow every Origin, spoof headers, change credentials,
   weaken unrelated controls or use an alternate relay after a denial.

Source-level diagnostic only: the repository Worker accepts comma-separated
exact `ALLOWED_ORIGIN` values and echoes an allowed browser Origin. In a
Worker-to-Vultr chain, browser-origin permission belongs at the Worker; the
existing server-to-server chain need not be changed just for a browser origin.
The repository's direct Vultr implementation instead returns the first allowed
origin in `Access-Control-Allow-Origin`, so merely adding a second origin would
not work if the deployed service matches that code. An exact-match CORS echo fix
would need separate review. Live configuration remains unverified.

## Required verification before claiming playback success

- Open the actual preview while signed out: no Vercel or app login should be
  needed within the approved public scope. Confirm current deployed commit.
- Inspect network/browser output without exposing tokens or source addresses.
  Click one selected camera and use the same-origin top-level watch window.
  Verify successful playlists/segments from the real configured media service.
  Stop on 401/403/security warnings; do not reroute or retry with other identity.
- Require nonzero decoded video dimensions, advancing time/decoded frames at
  separated samples, and visual inspection of the moving image. A manifest 200,
  thumbnail, READY deployment or unit-test pass alone is not playback proof.
- Test Chromium and Safari/iPhone separately where available. Check popup
  fallback, no login/account links, local favorites, player cleanup and readable
  failures. Test one stream at a time before broadening the sample.
- Verify anonymous requests to admin/data/write endpoints are unavailable on the
  exact public preview. Verify no app analytics/profile/favorites/chat writes;
  no disabled/unverified source may connect. Use synthetic fixtures for negative
  tests rather than editing production camera records.
- Record observed results and remaining failures. Production launch stays a
  separate user decision. To close the public preview, restore the approved
  hosting protection and remove its branch settings/proxy grant if applicable;
  rebuild and verify. These client settings alone do not revoke copied media
  URLs or alter proxy access.

Automated coverage uses synthetic origins, commits, cookies, inventory, clocks
and network events. It checks anonymous/default-OFF/production isolation,
exact-origin and commit binding, no admin cookie reads, no lease expiry,
source/inventory gates, native-HLS fallback, terminal HLS.js failures, no preview
telemetry/account writes, hidden account UI, guarded inline entry points and the
read-only preview route boundary. It does not replace real-media verification.

## Local validation (2026-11-02 UTC)

209 CCTV tests, TypeScript, changed-source ESLint and diff whitespace checks pass.
The credential-free webpack build compiles and completes its TypeScript phase,
then fails while prerendering camera pages because authoritative inventory is
unavailable without the local Firebase service credentials. No credential was
read/imported to bypass this limit. This is not a full-build pass; verify the
actual Vercel build separately.
