import type { Metadata } from "next";
import { lookupCctvById } from "@/lib/firestore-cctv-server";
import { cctvSourceRevision } from "@/lib/cctv-review";
import { requiresDirectHttpViewer } from "@/lib/cctv-playback-target";
import { isLaunchCameraVisible } from "@/lib/cctv-launch-policy";
import { PublicPlaybackBoundary } from "@/components/cctv/PublicPlaybackBoundary";
import { HttpsCameraWindow } from "@/components/cctv/HttpsCameraWindow";
import { DirectCameraLaunch } from "@/components/cctv/DirectCameraLaunch";
import { directCameraSourceUrl } from "@/lib/cctv-direct-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CCTV 영상 전용 창", robots: { index: false, follow: false } };
const PROXY_BASE = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

type Props = { params: Promise<{ id: string }> };
function Held({ children }: { children: React.ReactNode }) {
  return <p role="status" className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-white/70">{children}</p>;
}

/** No query overrides, mocks, weather, chat, nearby data, raw source or legacy redirect. */
export default async function CameraWatchPage({ params }: Props) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return <Held>카메라 정보를 확인할 수 없습니다.</Held>;
  const result = await lookupCctvById(id);
  if (result.state === "unavailable") return <Held>카메라 정보를 잠시 불러올 수 없습니다. 영상은 연결하지 않았어요.</Held>;
  if (result.state !== "found" || !result.entry.active) return <Held>현재 공개되지 않은 카메라입니다.</Held>;
  const camera = result.entry;
  if (camera.youtubeId) return <Held>재생 확인을 마치지 않은 카메라입니다. 영상 공개를 보류합니다.</Held>;
  if (process.env.VERCEL_ENV !== "preview" && requiresDirectHttpViewer(camera)) return <Held>이 카메라는 별도 HTTP 뷰어를 사용합니다. 보안 경고가 표시되면 진행하지 마세요.</Held>;
  const sourceRevision = cctvSourceRevision(camera);
  const playbackAllowed = await isLaunchCameraVisible(camera).catch(() => false);
  if (process.env.VERCEL_ENV === "preview") {
    // Exact current, publicly selected source only. Never serialize a credentialed
    // or signed/raw query URL and never mount the old HTTPS proxy player here.
    const originUrl = playbackAllowed ? directCameraSourceUrl(camera) : null;
    if (!originUrl) return <Held>현재 공개 가능한 원본 링크를 확인하지 못했습니다. 영상 서버로 요청하지 않았어요.</Held>;
    return <PublicPlaybackBoundary id={camera.id} sourceRevision={sourceRevision}>
      <DirectCameraLaunch id={camera.id} name={camera.name} originUrl={originUrl} />
    </PublicPlaybackBoundary>;
  }
  const proxyUrl = PROXY_BASE ? `${PROXY_BASE.replace(/\/$/, "")}/cctv/${encodeURIComponent(camera.id)}` : null;
  return <section aria-label={`${camera.name} 영상 전용 창`} className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col justify-center">
    <header className="flex items-center justify-between gap-4 px-5 py-4"><h1 className="text-sm font-bold">{camera.name}</h1><span className="text-[10px] tracking-widest text-white/40">CAMERA VIEW</span></header>
    <PublicPlaybackBoundary id={camera.id} sourceRevision={sourceRevision}>
    <HttpsCameraWindow dedicated id={camera.id} name={camera.name} proxyUrl={proxyUrl}
      sourceRevision={sourceRevision} playbackAllowed={playbackAllowed} />
    </PublicPlaybackBoundary>
  </section>;
}
