# Verified-page launch selection (2026-11-01)

## Scope and evidence

Only 12 existing production detail routes with decoded video and advancing
`currentTime` observed in the permitted browser at 16:31:36–16:32:47 UTC are
selected for this launch. Both samples required nonzero dimensions, readyState 4,
unpaused video and no media error. The exact current Firestore source fields were
read without credentials at 16:34:36 UTC and matched the earlier inventory.

This is page-level playback evidence, NOT direct upstream-source verification or
a permanent health claim. Only IDs, observation times, dimensions, elapsed video
time and one-way source fingerprints are published. No new candidate URLs, UID
values, credentials, or uploaded CSV contents are included.

The public list, map, legacy multiview, region list, detail-player boundary and
new dedicated watch page use this selection. Four known failed YouTube items and
all remaining unverified items are hidden, not deleted. Every Firestore record,
existing admin listing and candidate reference remains intact. Metadata-only edits
preserve selection; inactive/pending, changed source, YouTube replacement, unknown
ID, inventory error or missing cryptographic support fails closed. Server-confirmed Firestore snapshots only are accepted publicly (metadata changes
are observed; cached/pending snapshots and browser offline events hold playback).
Live inventory revokes already-rendered public players when an operator/source
change is received. Network disconnect detection follows the browser/Firestore SDK;
this is not an instantaneous global revocation guarantee.

## What this is not

This release manifest is a conservative launch selection, not the separately
implemented automatic FFmpeg health service. It does not invent a short expiry
that blanks healthy cameras without a working renewal mechanism. Observation times
are visible and current playback errors remain errors, never a LIVE guarantee.
Refresh evidence before production promotion; periodic revalidation needs the
separately reviewed runtime/storage/capacity setup. No automatic runner, secret,
cron, KV/Worker or infrastructure deployment is activated by this change.

A browser observation through an existing proxy does not prove its underlying
source configuration. The stored-source digest merely prevents an unrelated later
source edit inheriting the observed page's launch eligibility.

## Dedicated popup rollout boundary

The preview now opens its OWN `/cctv/watch/[id]`, never the old production detail
page disguised by an ignored query. That page has no header/sidebar/chat/weather.
Preview media remains held because the existing Worker only permits production
origins. No Origin spoofing, 403 relay or CORS expansion is attempted. A genuine
post-deployment check on the approved origin is still required before calling the
new video-only experience validated. The existing production page observations
above do not substitute for that check.
