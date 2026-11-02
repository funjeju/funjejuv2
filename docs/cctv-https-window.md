# Preserve existing HTTPS playback in separate windows

Some existing HTTP-origin cameras already play through the site's approved HTTPS proxy. Sending all of them to the separate legacy HTTP viewer loses that working path. The public transport decision is now:

- YouTube: existing YouTube player.
- HTTPS source: existing inline/modal HLS path.
- Ordinary HTTP source: synchronous user-opened **top-level HTTPS window**, fixed canonical `/cctv/{encodedId}?watch=1` on the existing production site.
- Exact legacy HTTP provider, or a known legacy ID with absent metadata: retain the separate legacy viewer, without claiming its playback is verified.
- Missing source metadata: authoritative detail navigation instead of guessing a transport.

Only encoded camera ID is placed in the canonical viewer URL. No raw origin, query token, credential or arbitrary destination is forwarded. Buttons and fallback anchors agree, use noopener/noreferrer, and do not auto-open from effects. This is a new window, not an HTTPS modal wrapping an HTTP source.

## Stable detail behavior before and after rollout

Current production already serves the canonical detail route and ignores the additional query; its existing approved HTTPS proxy player remains the current playback path. The new `HttpsCameraWindow` component recognizes `watch=1` after rollout so that a normal HTTP camera's detail launcher does not recursively reopen another launcher.

It mounts the existing HLS player only in a genuine top-level window on the three already-approved production origins, with a valid HTTPS proxy URL selected by the server. The raw HTTP origin is never assigned to a video element. Query parameters cannot choose the source/proxy. The existing player observes decoded-frame/time progress rather than treating an HTTP response as playback success.

Preview, unapproved origins and embedded frames do not try the proxy and then spoof Origin or relay a denied request; they offer the fixed canonical production window. This leaves the existing Worker origin policy unchanged. The approved-origin check uses a server-false `useSyncExternalStore` snapshot; query handling is inside Suspense so the established static detail-page caching is retained. Source/proxy changes remount the player; ordinary label edits do not.

The direct legacy HTTP viewer's prior browser security warning remains unresolved and is not bypassed. The private unverified candidate sources are not involved. No inventory, URLs in Firestore/KV, auth, proxy service, CORS or infrastructure are changed by this UI correction.

## Verification boundary

Local component/helper tests cover the actual routing and native-window call contract, fallback links, source/query isolation, active/source transitions, no preview/iframe proxy request, SSR-safe initialization and no recursive popup. They do not establish actual post-deployment browser playback. Fresh read-only production observations confirm that existing airport and Hallasan summit paths are currently usable; this does not imply every camera is working or identify upstream media solely from a blob URL. Validate the exact canonical new-window URLs in an allowed browser, then the updated preview click path. Keep production promotion separate from preview validation.
