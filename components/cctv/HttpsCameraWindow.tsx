"use client";

import { useSyncExternalStore } from "react";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { VurixLaunch } from "@/components/cctv/VurixLaunch";
import { isProductionViewerOrigin, previewViewerApprovalLive, viewerLocationAllowed, type PreviewViewerApproval } from "@/lib/cctv-viewer-policy";

const serverSnapshot = () => false;

type Props = {
  id: string; name: string; proxyUrl: string | null; sourceRevision?: string;
  /** Legacy detail launcher only; dedicated server route does not serialize raw source URLs. */
  originUrl?: string;
  dedicated?: boolean;
  /** Set only from authoritative server verification, never a query parameter. */
  playbackAllowed?: boolean;
  /** Server-only configuration plus existing admin authentication; default OFF. */
  previewApproval?: PreviewViewerApproval | null;
};

/** A same-origin video-only surface. Preview remains inspectable without making
 * rejected media requests, changing Origin headers or opening an old production page.
 */
export function HttpsCameraWindow(camera: Props) {
  const approved = useSyncExternalStore(notify => {
    const approval = camera.previewApproval;
    if (!previewViewerApprovalLive(approval, Date.now())) return () => {};
    // An already-open QA player must unmount when its bounded approval expires.
    const timer = window.setTimeout(notify, approval!.expiresAt - Date.now() + 1);
    window.addEventListener("focus", notify);
    document.addEventListener("visibilitychange", notify);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", notify);
      document.removeEventListener("visibilitychange", notify);
    };
  }, () => viewerLocationAllowed(window.location.origin, window.self === window.top, camera.previewApproval, Date.now()), serverSnapshot);
  if (!camera.dedicated) return <VurixLaunch id={camera.id} name={camera.name} originUrl={camera.originUrl} />;
  if (!approved) return <div role="status" data-watch-state="awaiting-approved-origin" className="flex min-h-[65dvh] flex-col items-center justify-center gap-4 px-6 text-center">
    <p className="text-lg font-bold">영상 전용 창 미리보기</p>
    <p className="max-w-lg text-sm leading-6 text-white/65">이 창은 아직 영상을 요청하지 않습니다. 승인된 운영 주소 또는 별도 승인과 관리자 인증을 마친 검증 세션에서만 재생할 수 있어요.</p>
    <p className="text-xs text-white/45">이전 운영 페이지로 이동하거나 보안 제한을 우회하지 않습니다.</p>
  </div>;
  if (!camera.playbackAllowed) return <p role="status" data-watch-state="verification-required" className="p-8 text-center text-sm text-white/70">현재 소스의 재생 확인이 필요해요. 확인되지 않은 영상을 자동 연결하지 않습니다.</p>;
  let secureProxy = false;
  try {
    const url = camera.proxyUrl ? new URL(camera.proxyUrl) : null;
    secureProxy = !!url && url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch { /* Fail closed; no raw-source fallback. */ }
  if (!secureProxy) return <p role="status" data-watch-state="proxy-unavailable" className="p-8 text-center text-sm text-white/70">안전한 HTTPS 재생 경로를 확인할 수 없습니다. 다른 주소로 우회하지 않습니다.</p>;
  return <div data-playback-context="approved-https-top-level" className="w-full">
    <HlsPlayer key={JSON.stringify([camera.id, camera.sourceRevision, camera.proxyUrl])}
      proxyUrl={camera.proxyUrl} label={camera.name}
      verificationMode={!isProductionViewerOrigin(window.location.origin)}
      cctvId={isProductionViewerOrigin(window.location.origin) ? camera.id : undefined}
      cctvName={isProductionViewerOrigin(window.location.origin) ? camera.name : undefined} />
  </div>;
}
