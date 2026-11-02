# Separate CCTV directory administration

## Paths and deployment separation

- Authenticated editor: `/admin/cctv-directory`
- Authenticated API: `/api/admin/cctv-directory`
- Safe read-only projection: `/api/cctv-directory`
- New catalogue page on the review branch: `/cctv-directory`
- Preview `/` and `/cctv` use the new catalogue; production public pages retain
  their existing code. An **admin-only patch based on production main** must be
  deployed independently of the editorial review branch. Never promote the whole
  editorial branch merely to install the administrator page.

The administrator uses the existing nonempty `ADMIN_SECRET` / HttpOnly
`admin_auth` authentication. The page checks authentication independently, and
its API checks authentication before parsing input or accessing storage. Writes
require a same-origin `Origin` header, bounded JSON and an explicit field list.
No API writes or settings changes are made by opening the editor.

## Write lock and storage prerequisite

`CCTV_DIRECTORY_WRITES_ENABLED` is OFF unless its value is exactly `true` in the
intended deployment environment. Keep it OFF until the **currently deployed**
Firestore rules have been inspected and verified to deny all direct client read
and write access to `cctv_directory_v1` and its nested `revisions` documents.
Source rules in this repository are not proof of live rule state. Rule changes
are security-setting changes requiring separate approval. Do not retrieve,
print, publish or rotate credentials to perform this verification.

Backups contain complete original records, potentially including credentialed
source URLs, and therefore must remain server-only. Neither public nor admin
list responses return those backup fields. New public URLs must be unsigned
HTTP(S) destinations: credentials, queries, fragments and private/reserved hosts
are rejected. Unsafe legacy URLs are preserved in backup but omitted from list
responses. No original source URL or private import manifest is added to Git.

## Preservation and concurrency

- Existing `cctvs` documents are read, **never modified or deleted**.
- The new list is the union of all legacy records and new-directory records;
  it does not use `active`, the old 11-camera shortlist, or a playback allowlist
  to hide places. Explicit new-directory `visible:false` hides a place only
  from the new public catalogue, not from storage or administration.
- Before an explicit import, the entire legacy inventory remains visible via
  a read-only projection. This is not represented as a completed migration.
- Import copies only missing records and captures the complete immutable
  `legacySnapshot` once. Its preflight revision covers both inventories. A
  changed preflight returns 409; imports never overwrite existing new edits.
  More than 400 pending entries fail closed rather than partially importing.
- Save requires the exact current record revision. Prior records are archived
  in `revisions`; the immutable source snapshot is retained. A collision never
  silently overwrites a newer edit. Conflict responses preserve the UI draft.
- New or changed playback sources are not automatically marked verified.
  Verification is an explicit recent administrator observation, not a claim
  that the server decoded video. Unknown coordinates/direction stay unknown.
- Duplicate known provider-camera identities must be reviewed, not silently
  merged by name. For supplied additions, compare provider identity and IDs
  before creating records. Different providers with the same place name can
  coexist without overwriting the existing place.

## Runtime boundaries

The new directory does not synchronize Cloudflare KV or change Vultr, proxy,
origin allowlists, Firebase rules or production camera records. It performs no
server-side fetch of supplied camera URLs. Viewer navigation occurs only after
an explicit user action. HTML/HLS/YouTube destinations remain subject to the
provider and browser's controls; never bypass warnings. A raw HLS link opening
or downloaded file is not a playback pass.

The public projection has a 30-second CDN cache and no browser cache. Authenticated
responses and errors use `no-store`. After an edit, wait for public cache expiry
or refresh; never treat a stale response as evidence that the write failed.

## Verification and release checklist

1. Run synthetic model/API/UI tests and TypeScript; no real DB credentials needed.
2. Build and verify each exact commit independently: review catalogue branch and
   production-main admin-only branch. Keep writes locked for both.
3. Verify anonymous users cannot reach editor data/write actions; verify normal
   administrator login and safe internal return destination.
4. Inspect effective live Firestore rules. Obtain any required change approval.
5. Only after approval enable the write flag in the intended environment.
6. Sign in using the existing administrator flow. Inspect import counts, explicitly
   confirm the immutable legacy copy, then verify imported/skipped counts.
7. Add only verified private-import candidates with unique IDs and exact supplied
   unsigned URLs. Leave unknown coordinates and playback status unverified.
8. Re-read all records/counts and compare the private pre-import snapshot, keeping
   existing `cctvs` unchanged. Do not log source URLs or authentication values.

Rollback disables the new write flag and removes the new route exposure if
needed; it does not delete the new directory, history or original collection.
