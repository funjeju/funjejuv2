/** Exact-origin presentation policy, not a replacement for proxy authorization. */
const PRODUCTION_VIEWER_ORIGINS = new Set([
  "https://funjeju.com", "https://www.funjeju.com", "https://funjejuv2.vercel.app",
]);
export type PreviewViewerApproval = { origin: string };

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

/** Public viewing, not administrator access: no cookie, login or 30-minute lease.
 * Fresh PUBLIC settings default OFF; the old administrator-test settings cannot
 * silently enable an anonymous viewer. No Host/query/header input.
 * Configuring them does NOT authorize or configure the separate media proxy.
 */
export function configuredPreviewViewerApproval(env: Record<string, string | undefined>): PreviewViewerApproval | null {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview") return null;
  const origin = env.CCTV_PUBLIC_PREVIEW_ORIGIN;
  const commit = env.CCTV_PUBLIC_PREVIEW_COMMIT;
  // A branch alias is usable across a rebuild, but must never silently authorize
  // the next commit on that branch. Unique deployment URLs remain supported too.
  const thisDeployment = origin === `https://${env.VERCEL_URL}` || origin === `https://${env.VERCEL_BRANCH_URL}`;
  if (!origin || !thisDeployment || !exactPreviewOrigin(origin) ||
      !commit || !/^[a-f0-9]{40}$/.test(commit) || commit !== env.VERCEL_GIT_COMMIT_SHA) return null;
  return { origin };
}

export function viewerLocationAllowed(origin: string, topLevel: boolean, approval: PreviewViewerApproval | null | undefined): boolean {
  return topLevel && (isProductionViewerOrigin(origin) ||
    (!!approval && exactPreviewOrigin(approval.origin) && approval.origin === origin));
}
