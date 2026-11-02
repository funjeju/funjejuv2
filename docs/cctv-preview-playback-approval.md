# CCTV preview playback: prepared, not enabled

## Latest verification (2026-11-02 01:42 UTC)

**Actual CCTV playback is still unverified and activation is pending authorization.**
No production, remote branch, proxy policy, environment setting, credential or
Deployment Protection was changed during this continuation.

- Vercel metadata confirms the current protected review-branch deployment is
  READY and is a preview, not production. It contains only the monochrome design,
  not the playback preparation below. Keep its exact identifiers in private
  operational records rather than public repository documentation.
- An isolated local QA worktree preserves both earlier worktrees unchanged.
  Its monochrome base has identical Git blob hashes to all seven files changed
  by the reviewed remote design commit. The preserved 13-file QA preparation
  was applied there, followed by the fixes below.
- Review found that disabled analytics still mounted `useAuth`, which writes
  shared user profiles for existing Firebase sessions. A server-wired preview
  context now prevents those automatic profile reads/writes throughout the shell
  and viewer. This is not a database-level read-only role; explicit favorites,
  admin actions and other mutations remain outside QA scope and must not be used.
- QA no longer inherits cached consumer watch-budget exhaustion; normal
  production entitlement display/enforcement remains unchanged. The QA player is
  still behind the exact-origin, exact-commit, existing-admin and fixed-time gates.
- **200 CCTV tests pass**, including signed-in auth/no-profile-write and cached
  budget regressions. TypeScript and changed-file ESLint pass; independent review
  re-ran 23 focused tests successfully. `git diff --check` passes.
- Full ESLint remains failed: **99 errors, 15 warnings**. Comparison with the
  clean monochrome baseline (99 errors, 16 warnings) found no new diagnostics;
  the pageview-hook dependency warning was removed.
- The webpack production build compiles and passes its TypeScript phase, then
  fails while prerendering `/cctv/donghandugi` because authoritative inventory is
  unavailable in this credential-free local environment. No credential was read
  or imported to bypass that limit. This is **not** a full-build pass.
- No new live browser/media test was attempted. Native-HLS-only browsers are
  deliberately unsupported by this bounded QA mode; a Chromium result cannot
  certify Safari/iPhone playback.

### Smallest remaining authorized operation

1. Review and authorize publishing this prepared code **only to the preview
   branch**; keep the gate OFF and Vercel protection ON. Verify the exact resulting
   commit and successful Vercel build. Do not merge or promote to production.
2. Through normal authorized Vercel/admin access, establish the non-secret
   effective media-service hostname and its actual deployed origin policy. Do not
   dump environment values, create bypass/share credentials, spoof headers, retry
   a denied URL through a different route, or infer live policy from repository
   source. Owner login may be needed; do not ask for passwords in chat.
3. Obtain approval for that owned proxy's one exact branch-origin grant and a
   fixed UTC interval of at most 30 minutes, plus its removal/expiry owner. The
   change expands which browser origin may request media and may incur normal
   streaming traffic. No wildcard or permanent grant is needed. If the active
   service is the direct Vultr implementation, its CORS echo bug needs separately
   reviewed correction before adding an origin can work.
4. Set only the four named non-secret QA variables for the exact preview branch,
   bound to the reviewed full commit and approved interval. Rebuild that same
   commit. Verify actual deployed configuration rather than assuming inheritance.
5. Use the existing admin login; test one approved camera at a time. Require
   nonzero decoded dimensions plus advancing media time/frame samples and visible
   image inspection. Record failures, stop on 401/403/security warnings, and do
   not publish new camera attestations as part of this test.
6. Verify expiry closes the viewer, remove the proxy grant and QA variables by
   the authorized process, and confirm removal. Production launch is still a
   separate user decision.

## Observed blocker (2026-11-02 UTC)

One ordinary browser navigation to the requested preview reached **Log in to
Vercel**, not the application. No sign-in was attempted, no credential/share link
was created, and Deployment Protection was not changed. This is an authentication
block, not evidence that the application or a camera is down.

Independently, the existing viewer only mounted media on three exact production
origins. Even successful Vercel sign-in would therefore leave preview video held.
The media proxy has its own origin policy. Frontend permission is not proxy
permission, and a manifest HTTP response is not proof of moving video.

## Local preparation and unchanged defaults

The optional QA path is **OFF unless all conditions below are met**:

1. Platform environment is `VERCEL=1` and `VERCEL_ENV=preview`.
2. `CCTV_PREVIEW_PLAYBACK_ORIGIN` is one canonical HTTPS origin and exactly equals
   the platform's `VERCEL_URL` or `VERCEL_BRANCH_URL` with `https://` prepended.
   No wildcard, URL path/query/credentials, custom domain, request Host/header,
   query parameter, or production hostname is accepted.
3. `CCTV_PREVIEW_PLAYBACK_COMMIT` is a full lowercase 40-character Git SHA and
   exactly matches `VERCEL_GIT_COMMIT_SHA`. A branch alias pointing to the next
   commit does not inherit approval.
4. `CCTV_PREVIEW_PLAYBACK_APPROVED_AT` and `CCTV_PREVIEW_PLAYBACK_EXPIRES_AT` are
   canonical UTC ISO timestamps (including milliseconds). Approval has already
   started, has not expired, and lasts at most **30 minutes**. It does not renew
   when a page is refreshed. Slow builds may exhaust the window: remain held,
   do not silently extend it.
5. The request has the existing `admin_auth` cookie matching a nonempty configured
   `ADMIN_SECRET`. No new credential or authentication mechanism is introduced.
6. Existing authoritative camera lookup, active state, exact-source launch
   selection, live server-confirmed inventory boundary, top-level window and
   HTTPS proxy validation all still pass.

The server serializes only the approved origin and timestamps, never admin
credentials or raw camera URLs. The browser checks exact location and expiry;
expiry/focus/visibility notifications unmount the QA player. The QA instance omits
the existing player's `cctvId`/`cctvName`, preventing its `/event` beacons and usage
session identity. The server preview layout also omits GA/Naver and disables the
AppShell pageview writer before it allocates an anonymous identity. This does not
suppress ordinary hosting/proxy/map-service access logs or authorize unrelated
write actions (for example saving favorites). Production analytics are unchanged.

The QA player uses a separate verification mode: network errors are terminal,
HLS loading retries/recovery are disabled, and the held error view offers no
reconnect action. Native HLS is not used for QA because its HTTP status/retry
behavior is not inspectable through this player. These restrictions are not
applied to normal production playback.

This browser lease is **not a media access token**. It does not revoke copied
proxy URLs or change the proxy's authorization. The proxy's separate exact-origin
grant must have its own approved removal/expiry procedure. Client clock changes
are not a security boundary. Existing admin logout is checked on the next server
request; it is not an immediate cross-tab revocation mechanism.

Vercel documents [generated deployment and Git branch system URLs](https://vercel.com/docs/environment-variables/system-environment-variables).
A stable, exact branch URL is practical for a preconfigured rebuild; it remains
bound to the explicitly reviewed commit. Setting values for an old generated URL
does not authorize a new deployment with a different generated URL.

## Resolve exact operational scope privately before activation

Record and verify these values through the owner's authorized account. The
placeholders below are documentation only and must never be used as live values:

- Existing Vercel project and team: `<project-id>`, `<team-id>`.
- Existing non-production review branch: `<review-branch>`.
- Exactly one protected HTTPS viewer origin: `<approved-preview-origin>`, taken
  from the platform's actual deployment or branch URL, not a guessed hostname.
- Reviewed deployment and full Git SHA: `<deployment-id>`, `<full-commit-sha>`.
  The deployed commit must include this preparation. Do not approve an older
  design-only commit or let a later branch update inherit approval.
- Actual effective media-service hostname, ownership, deployed policy and
  removal/expiry procedure: establish these separately; they remain unresolved.

The possible Vercel-side activation consists of only the four non-secret QA
settings on the exact preview branch, after approval. Deployment Protection must
remain enabled. A repository Worker name or chain endpoint does not establish
which service the browser will request or its current authorization policy.
No honest exact proxy-change instruction or successful activation claim can be
made until that live path is established without exposing credential values.

## Separate approval required before actual activation

None of the following was performed by this local preparation:

- Vercel sign-in, admin sign-in, credential creation, secret reads, environment
  updates, production domain assignment, publishing or deployment.
- Media-proxy allowlist/CORS/WAF changes or any camera/source requests.
- Source replacement, database publication, or launch inventory changes.

An operator must explicitly authorize the exact preview branch/commit, one exact
viewer origin, the short UTC interval, and the matching **owned proxy** policy
change (if necessary), with a rollback/removal owner. Keep Vercel protection;
use normal user authentication. Never use a generated bypass/share token,
spoofed Origin/Referer, alternate relay, or a wildcard to get past a denial.

First establish the actual configured media path without exposing credential
values. The repository's Worker echoes an allowed browser Origin, but the direct
Vultr implementation currently returns the first configured origin as
`Access-Control-Allow-Origin`. Merely appending a QA origin to the latter does
not make browser CORS succeed. Any separately reviewed proxy correction must echo
only an exact allowed origin, retain `Vary: Origin`, and deny unrelated origins;
do not weaken or silently route around the existing policy. Repository code is
not evidence of the currently deployed proxy configuration.

If no authorized exact-origin test path can be provisioned, actual preview CCTV
playback remains blocked. Do not present local tests or old production footage
as successful playback of this deployment, or deploy to production solely to
remove the testing blocker.

## Validation plan after permissions and normal sign-in

1. Confirm the exact deployed commit, protected viewer origin and bounded permit.
   Verify app navigation, filters/reset, current card/pin correspondence, map
   fallback, responsive layouts, keyboard focus and decoded self-hosted font.
2. Click one currently approved camera as an ordinary user gesture. Verify a
   same-origin top-level `/cctv/watch/<id>` window and persistent popup fallback;
   no old production redirect, iframe or raw-source URL.
3. Check successful root/child playlist and segment requests from the approved
   proxy with the browser's real Origin. Stop on 401/403/security warnings; do not
   retry through other hosts, clients or credentials.
4. Observe decoded nonzero video dimensions and increasing frame/time samples
   several seconds apart, then manually inspect the image. Loading/manifest 200
   alone is not sufficient. Test only one stream at a time; expand to the selected
   inventory after the first succeeds, with bounded observation and no retry loop.
5. Verify no `/event` or usage-session writes for QA, no unverified/disabled camera
   appears, and missing inventory/source mismatch closes the player. Test expiry,
   close/cleanup and denied origins with synthetic fixtures rather than changing
   production camera records.
6. Record the new observations and unresolved failures; remove the temporary
   proxy/preview grant through the approved process. Production promotion is a
   separate decision, not an automatic result of passing local tests.

Automated tests use only synthetic origins, mocked cookies/inventory and clocks.
They cover default-OFF/production isolation, exact host and commit binding,
malformed/expired/overlong permits, existing admin authentication, live source
gate preservation, no QA telemetry identity, preview layout/hook analytics
suppression, expiry and listener/timer cleanup, and terminal QA network failures.
