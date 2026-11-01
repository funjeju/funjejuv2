# Dedicated camera window (local implementation)

Ordinary HTTP cameras now target the **same-origin** `/cctv/watch/[id]` route in a user-opened top-level window. It is not the legacy detail page and does not redirect a preview to production. The camera ID is encoded; no source URL or query override is accepted. The exact legacy direct-HTTP provider retains its separate existing warning path; this work does not establish that path as working.

The watch route performs an authoritative inventory read and source-bound launch-policy check, supplies only the server-selected HTTPS proxy and source revision, and renders a camera title plus video surface. It does not load weather, chat, nearby cameras, mock fallback records or site navigation. AppShell excludes the normal public header/sidebar/chat/navigation for this route.

`HttpsCameraWindow` mounts HLS only when all are true:

1. Dedicated server-selected surface, not the detail launcher.
2. Top-level browser window on an existing Worker-approved site origin.
3. Server source-bound launch policy allows the camera.
4. Server proxy is HTTPS without credentials, query or fragment.

On an unapproved preview origin, it displays an explicit preview/approved-origin-rollout notice and does **not** mount the media player, request the source, change Origin headers, or fall back to an older production page. Query parameters cannot enable playback or change the proxy. Server hydration starts with no player. PublicPlaybackBoundary also reconciles live inventory and exact source revision, unmounting playback if the camera is disabled, removed, changed, or inventory becomes unavailable.

Offline tests cover route selection, shell exclusion, source privacy, fail-closed inventory/gate behavior, preview-origin/frame guards, metadata/source identity changes and lack of legacy-page fallback. Browser playback on the eventual approved-origin rollout is a separate validation; these tests do not assert stream health. No public deployment is authorized by this implementation.
