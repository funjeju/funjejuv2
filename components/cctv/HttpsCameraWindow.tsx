"use client";

import { Suspense, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { VurixLaunch } from "@/components/cctv/VurixLaunch";

const APPROVED_VIEWER_ORIGINS = new Set([
  "https://funjeju.com", "https://www.funjeju.com", "https://funjejuv2.vercel.app",
]);
const subscribe = () => () => {};
const serverSnapshot = () => false;
function approvedTopLevelViewer() {
  return window.self === window.top && APPROVED_VIEWER_ORIGINS.has(window.location.origin);
}

type Props = { id: string; name: string; originUrl: string; proxyUrl: string | null };

function WindowContent(camera: Props) {
  const params = useSearchParams();
  // Server/first hydration agree. Never try a preview-origin request and then
  // disguise its Origin: only the already-approved top-level site may play here.
  const approved = useSyncExternalStore(subscribe, approvedTopLevelViewer, serverSnapshot);
  const requested = params.get("watch") === "1";
  let secureProxy = false;
  try { const url = camera.proxyUrl ? new URL(camera.proxyUrl) : null; secureProxy = !!url && url.protocol === "https:" && !url.username && !url.password; } catch { /* No usable proxy. */ }

  if (requested && approved && secureProxy) return (
    <div data-playback-context="approved-https-top-level">
      <p className="mb-2 text-xs text-text-secondary">새 창 · 기존 HTTPS 재생 경로. 실제 연결 상태는 플레이어에서 확인합니다.</p>
      <HlsPlayer key={JSON.stringify([camera.id, camera.originUrl, camera.proxyUrl])}
        proxyUrl={camera.proxyUrl} label={camera.name} cctvId={camera.id} cctvName={camera.name} />
    </div>
  );
  if (requested && approved && !secureProxy) return (
    <div role="status" className="rounded-2xl border border-border-soft bg-bg-secondary p-6 text-sm">
      안전한 HTTPS 재생 경로를 확인할 수 없습니다. 원본 주소로 우회하거나 자동 재시도하지 않습니다.
    </div>
  );
  return (
    <>
      {requested && !approved && <p role="status" className="mb-3 text-sm text-text-secondary">이 미리보기·임베드 화면에서는 영상을 자동 연결하지 않습니다. 아래 버튼으로 정식 사이트의 별도 창을 열어 주세요.</p>}
      <VurixLaunch id={camera.id} name={camera.name} originUrl={camera.originUrl} />
    </>
  );
}

/** Retains static detail-page caching; query handling stays in this client boundary.
 * HTTP origins are never put into an HTTPS modal. A user-opened canonical HTTPS
 * window can reuse the existing approved proxy instead of the blocked HTTP viewer.
 */
export function HttpsCameraWindow(props: Props) {
  return <Suspense fallback={<p role="status" className="p-6 text-sm">새 창 재생 화면을 준비하고 있어요.</p>}><WindowContent {...props} /></Suspense>;
}
