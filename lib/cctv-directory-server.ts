import "server-only";
import type { DocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { DirectorySaveRequest } from "@/types/cctv-directory";
import { DIRECTORY_COLLECTION, DirectoryError, type DirectorySnapshot, mergeDirectory, normalizeLegacy, projectStored, fieldsFromEntry, validateDirectoryFields, playbackAfterSave, directorySourceHash, directorySourceIdentity, validDirectoryId } from "@/lib/cctv-directory";

function snapshot(doc: DocumentSnapshot): DirectorySnapshot {
  const t = doc.updateTime;
  return { id: doc.id, data: doc.data() ?? {}, version: t ? `${t.seconds}:${t.nanoseconds}` : "missing" };
}
const rows = (query: QuerySnapshot) => query.docs.map(snapshot);
export async function listDirectory() {
  const db = getAdminDb();
  const [legacy, stored] = await Promise.all([db.collection("cctvs").get(),db.collection(DIRECTORY_COLLECTION).get()]);
  return mergeDirectory(rows(legacy), rows(stored));
}
export async function importLegacyDirectory(expectedImportRevision: string) {
  if (typeof expectedImportRevision !== "string" || !/^[a-f0-9]{64}$/.test(expectedImportRevision)) throw new DirectoryError(400);
  const db = getAdminDb();
  return db.runTransaction(async tx => {
    // Read both whole collections before any write: the preflight covers newly
    // added/deleted/changed legacy records and concurrent directory edits too.
    const legacyQuery = await tx.get(db.collection("cctvs"));
    const storedQuery = await tx.get(db.collection(DIRECTORY_COLLECTION));
    const legacy = rows(legacyQuery), stored = rows(storedQuery);
    const current = mergeDirectory(legacy,stored);
    if (current.importRevision !== expectedImportRevision) throw new DirectoryError(409);
    const existing = new Set(stored.map(row=>row.id));
    const missing = legacy.filter(row=>!existing.has(row.id));
    if (missing.length > 400) throw new DirectoryError(400);
    const now = new Date().toISOString();
    for (const source of missing) {
      const entry = normalizeLegacy(source);
      tx.create(db.collection(DIRECTORY_COLLECTION).doc(source.id), {
        ...fieldsFromEntry(entry), revision: 1, origin: "legacy", legacyId: source.id,
        sourceRestricted: entry.sourceRestricted, verifiedAt: null, updatedAt: now,
        legacySnapshot: source.data, legacyVersion: source.version,
      });
    }
    return { imported: missing.length, skipped: legacy.length - missing.length };
  });
}
export async function saveDirectory(request: DirectorySaveRequest) {
  if (!validDirectoryId(request.id) || typeof request.expectedRevision !== "string") throw new DirectoryError(400);
  const fields = validateDirectoryFields(request.fields);
  const db = getAdminDb();
  return db.runTransaction(async tx => {
    const ref = db.collection(DIRECTORY_COLLECTION).doc(request.id);
    const old = await tx.get(ref);
    const legacy = await tx.get(db.collection("cctvs").doc(request.id));
    const previous = old.exists ? projectStored(snapshot(old)) : legacy.exists ? normalizeLegacy(snapshot(legacy)) : null;
    if (request.expectedRevision !== (previous?.revision ?? "new")) throw new DirectoryError(409);
    const identity = directorySourceIdentity(fields);
    // Only creation/source-identity changes are constrained. Existing duplicate
    // legacy rows remain intact and independently editable for metadata/history.
    if (identity && (!previous || directorySourceIdentity(previous) !== identity)) {
      const allLegacy = await tx.get(db.collection("cctvs"));
      const allStored = await tx.get(db.collection(DIRECTORY_COLLECTION));
      const entries = mergeDirectory(rows(allLegacy), rows(allStored)).entries;
      if (entries.some(entry => entry.id !== request.id && directorySourceIdentity(entry) === identity)) throw new DirectoryError(409);
    }
    const now = new Date();
    const playback = playbackAfterSave(fields, previous, request.observation, now.getTime());
    const priorData = old.data();
    const priorRevision = old.exists ? priorData?.revision : 0;
    if (!Number.isSafeInteger(priorRevision) || priorRevision < 0 || priorRevision >= Number.MAX_SAFE_INTEGER) throw new DirectoryError(409);
    const sourceUnchanged = previous && directorySourceHash(previous) === directorySourceHash(fields);
    const record = {
      ...fields, ...playback, revision: priorRevision + 1,
      origin: previous?.origin ?? "manual", legacyId: previous?.legacyId ?? null,
      sourceRestricted: sourceUnchanged ? previous.sourceRestricted : false,
      updatedAt: now.toISOString(),
      // First edit captures the complete source once. Later edits never replace
      // that immutable backup with changing legacy data or request fields.
      legacySnapshot: old.exists ? priorData?.legacySnapshot ?? null : legacy.exists ? legacy.data() : null,
      legacyVersion: old.exists ? priorData?.legacyVersion ?? null : legacy.exists ? snapshot(legacy).version : null,
    };
    if (previous) {
      const historyId = old.exists ? `stored-${priorRevision}` : "legacy-original";
      tx.create(ref.collection("revisions").doc(historyId), {
        previous: old.exists ? priorData : { ...previous, legacySnapshot: legacy.data(), legacyVersion: snapshot(legacy).version },
        archivedAt: now.toISOString(),
      });
    }
    tx.set(ref,record);
    return projectStored({id:request.id,data:record,version:"saved"});
  });
}
