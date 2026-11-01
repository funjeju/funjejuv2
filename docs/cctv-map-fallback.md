# CCTV map resilience

`CctvMap` attempts Kakao when a public key exists. Missing SDK, script error, thrown initialization, or an eight-second timeout selects an independent keyless Leaflet map. This does not diagnose the Kakao domain allowlist or bypass a denial. Failed script listeners/elements are removed; late SDK callbacks cannot take over the replacement map.

Leaflet is imported only inside the browser effect (no SSR `window` dependency), with its bundled CSS. The OpenStreetMap layer requests only normal visible map tiles, with `keepBuffer: 0` and `updateWhenIdle: true`; there is no prefetch, bulk download, cache bypass, proxy, or credential. Standard browser caching and referrer behavior are retained. Visible attribution links to OpenStreetMap copyright. OSM is best effort, not a guaranteed production SLA.

If Leaflet cannot initialize or no tile succeeds within twelve seconds, a local coordinate-based position diagram plus the always-available camera list replaces the map. This diagram explicitly does not claim to be a geographic basemap. Invalid coordinates do not make markers; active cameras without coordinates remain in the list. Manual retry remounts the map attempt. Effects dispose listeners, overlays, timers, Leaflet instances, their resize listeners, and the container ResizeObserver. The static-state map container is invisible and absolutely positioned, not display:none, so an inventory refresh can initialize either SDK with nonzero dimensions without reserving blank space above the diagram.

HTTP marker/list/diagram selections invoke the shared fixed-origin top-level watch-window helper synchronously in the user gesture. HTTPS and YouTube selections retain the modal. Switching a selected source to HTTP discards selection, never launches a popup from an effect. A direct external link remains available if the browser blocks a popup. External playback was not verified by this map task; browser security warnings must not be bypassed.

References consulted 2026-11-01:
- [Leaflet 1.9.4 reference](https://leafletjs.com/reference.html): map lifecycle, DivIcon HTMLElement content, tile events and attribution.
- [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/): canonical HTTPS tile URL, visible attribution, ordinary browser referrer/caching, and no bulk prefetch.

Automated tests execute the actual component with deterministic React/DOM/SDK-shaped doubles. They cover source reconciliation, marker routing, SDK failure/timeout, import/tile failure, invalid coordinates, late callbacks, and cleanup. They do not constitute real-browser rendering or external stream playback verification.
