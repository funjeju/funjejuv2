/** Only this fixed internal return destination is supported; never an open redirect. */
export function adminLoginTarget(next: string | null, preview: boolean): string {
  return next === "/admin/cctv-directory" || preview ? "/admin/cctv-directory" : "/admin/cctv";
}
