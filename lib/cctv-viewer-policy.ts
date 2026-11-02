/** Exact-origin presentation policy, not a replacement for proxy authorization. */
const PRODUCTION_VIEWER_ORIGINS = new Set([
  "https://funjeju.com", "https://www.funjeju.com", "https://funjejuv2.vercel.app",
]);
export const MAX_PREVIEW_VIEWER_MS = 30 * 60 * 1000;
export type PreviewViewerApproval = { origin: string; approvedAt: number; expiresAt: number };

export function isProductionViewerOrigin(origin: string): boolean {
  return PRODUCTION_VIEWER_ORIGINS.has(origin);
}

function exactPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.origin === origin && url.protocol === "https:" && !url.port &&
      !url.username && !url.password && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(url.hostname) &&
      !isProductionViewerOrigin(origin);
  } catch { return false; }
}

export function previewViewerApprovalLive(approval: PreviewViewerApproval | null | undefined, now: number): boolean {
  return !!approval && exactPreviewOrigin(approval.origin) && Number.isFinite(now) &&
    Number.isFinite(approval.approvedAt) && Number.isFinite(approval.expiresAt) &&
    approval.approvedAt <= now && now < approval.expiresAt &&
    approval.expiresAt > approval.approvedAt && approval.expiresAt - approval.approvedAt <= MAX_PREVIEW_VIEWER_MS;
}

/** Server caller must additionally authenticate the existing admin session.
 * All optional settings default to absent/OFF. No Host/query/header input.
 * Configuring them does NOT authorize or configure the separate media proxy.
 */
export function configuredPreviewViewerApproval(env: Record<string, string | undefined>, now = Date.now()): PreviewViewerApproval | null {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview") return null;
  const origin = env.CCTV_PREVIEW_PLAYBACK_ORIGIN;
  const issued = env.CCTV_PREVIEW_PLAYBACK_APPROVED_AT;
  const expires = env.CCTV_PREVIEW_PLAYBACK_EXPIRES_AT;
  const commit = env.CCTV_PREVIEW_PLAYBACK_COMMIT;
  // A branch alias is usable across a rebuild, but must never silently authorize
  // the next commit on that branch. Unique deployment URLs remain supported too.
  const thisDeployment = origin === `https://${env.VERCEL_URL}` || origin === `https://${env.VERCEL_BRANCH_URL}`;
  if (!origin || !issued || !expires || !thisDeployment || !exactPreviewOrigin(origin) ||
      !commit || !/^[a-f0-9]{40}$/.test(commit) || commit !== env.VERCEL_GIT_COMMIT_SHA) return null;
  const approvedAt = Date.parse(issued), expiresAt = Date.parse(expires);
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
      new Date(approvedAt).toISOString() !== issued || new Date(expiresAt).toISOString() !== expires) return null;
  const approval = { origin, approvedAt, expiresAt };
  return previewViewerApprovalLive(approval, now) ? approval : null;
}

export function viewerLocationAllowed(origin: string, topLevel: boolean, approval: PreviewViewerApproval | null | undefined, now: number): boolean {
  return topLevel && (isProductionViewerOrigin(origin) ||
    (previewViewerApprovalLive(approval, now) && approval?.origin === origin));
}
