# Design 3 — 바람의 좌표

User-selected reattached reference was materialized through the authorized Library
flow and inspected again after workspace replacement. The pale mint canvas,
forest-green regional sidebar, compact camera rows and adjacent map replace the
rejected editorial design. The lower-right selected-camera panel launches a
separate top-level window; it never embeds an HTTP source.

## Preserved boundaries

- No camera database mutations, source replacements, auth changes, proxy/Worker
  deployments, CORS expansion, credential uploads or infrastructure cancellation.
- Favorites, language, search and filters remain; legacy routes/features are not
  deleted. Multiview remains absent from public navigation.
- Kakao, keyless Leaflet/OpenStreetMap and local coordinate fallback remain.
- Current public eligibility still requires a server-confirmed active record and
  exact observed source fingerprint. Raw inventory remains available to admin.
- Preview origins are playback-held, not redirected to the old production detail
  screen. No request bypasses an origin restriction or security warning.
- Scenery images retain visitor-facing credit/license links and are not presented
  as live video frames. No reference image or private source catalog is published.

## Evidence selection

The original production detail-page observations at 2026-11-01 22:19:39.463–
22:21:11.117 UTC confirm 11 advancing videos, each in two positive-dimension,
readyState-4, unpaused/error-free samples. Exact measurements were reconstructed
from retained original tool outputs following workspace replacement; this is not
a new playback check. The current source fingerprints were re-read and compared
without requesting any camera origin; the manifest comment records that time.

Cheonjiyeon remains stored but is held from the selection because its initial and
one ordinary reload attempt stalled at readyState 2 without time advancement.
This observation does not establish that the source is offline. A dated release
selection is not continuous monitoring or a guarantee of future availability.

## Validation and limits

Automated tests cover compact rendering, safe synchronous gesture routing, URL
filters, selection removal, accessible controls, source eligibility, map lifecycle
and post-commit responsive scrolling. Selection-only rerenders do not recreate
the map; Kakao relayout and Leaflet resize handlers clean up on unmount/fallback.

Before workspace replacement, a managed Next fixture rendered these actual
components with public labels/coordinates and synthetic media sources. At 1180px,
Leaflet loaded nine 256px tiles without horizontal page overflow. Search reduced
list/map to one item and reset restored 11; map view resized correctly. A 390px
iframe verified mobile layout and discovered a pre-commit scroll bug, fixed by
waiting for committed panel order. Retesting placed both headings at 98px from
the viewport top. A marker opened a separate local watch-route window.

Those historical fixture observations are not deployed camera/auth validation.
The reconstructed code must be tested again before release. Actual new watch-route
playback still requires an approved origin after reviewed deployment. Neither
preview origin protections nor browser warnings may be bypassed for that test.

### Restored-code browser check

The reconstructed components were re-exercised in the managed local fixture at
23:18 UTC: desktop 1180px loaded nine Leaflet tiles and search again reduced both
panels to one item. At 800px and 390px iframe widths, content width equaled scroll
width (785/785 and 375/375 after scrollbar), category controls remained usable,
and map-focus scrolling landed around 98px below the viewport top after reorder.
New screenshots were inspected for these exact restored bytes. Fixture sources
remained synthetic; this does not add a new camera playback observation.

## Pretendard interface refinement

The user accepted the sidebar/list/map structure and requested a more refined
actual web interface, explicitly naming Pretendard. Their new screenshot was
materialized through the authorized Library flow and its pixels inspected.
The new design keeps that structure, with quieter near-white surfaces, generous
panel spacing, readable type sizes, clearer hierarchy and compact card utility
rows. Thumbnail disclaimers now sit in the text column rather than covering a
small image. All five mobile region choices fit in one row without a scrollbar.

The previous layout downloaded `Pretendard Variable` but requested `Pretendard`
in CSS, allowing fallback fonts. The interface now uses an unmodified official
v1.3.9 WOFF2 from the same origin with matching family, `font-display: swap` and
system fallbacks. The 1.96 MiB font, full SIL OFL 1.1 license and source/hash notes
are bundled in `public/fonts/pretendard`. No font CDN runtime dependency remains.

Local managed-browser fixture checks on the refined components confirmed:
- The browser decoded the actual WOFF2; a visible fixture-only font-load indicator
  reported a loaded `Pretendard Variable` face for Korean text.
- Desktop/tablet/mobile content widths matched scroll widths (1165, 785 and 375px).
- Leaflet loaded real map tiles; search narrowed both the list and markers to one.
- Tablet/mobile map focus and mobile list return landed below the sticky header.
- Native usage disclosures retained the separate-window fallback and credits.

These are layout/component checks with synthetic sources and stubbed account
controls, not production login or a new playback verification. The 11-camera
observation selection, eligibility gates, source routing, auth, database and
infrastructure remain unchanged. Preview video-origin protection still applies.
