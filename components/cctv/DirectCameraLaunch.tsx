"use client";

import { directCameraSourceUrl, directCameraViewerUrl } from "@/lib/cctv-direct-link";
import { openCameraWatch } from "@/lib/cctv-playback-target";

/** Navigation only: no player, fetch, proxy, server relay or automatic redirect. */
export function DirectCameraLaunch({ id, name, originUrl }: { id: string; name: string; originUrl: string }) {
  const camera = { id, name, originUrl, active: true };
  const url = directCameraViewerUrl(camera);
  if (!url) return <p role="status" className="p-8 text-center">공개 가능한 원본 링크를 확인할 수 없습니다. 다른 서버로 연결하지 않습니다.</p>;
  const official = url !== directCameraSourceUrl(camera);
  const manifest = new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  return <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
    <h2 className="text-lg font-bold">{name} · 제공처 직접 연결</h2>
    <button type="button" onClick={() => openCameraWatch(camera, true)} className="rounded-lg bg-white px-5 py-3 font-bold text-black">{official ? "제공기관 공식 영상 새 창으로 보기" : "원본 링크 새 창으로 테스트"}</button>
    <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="underline">팝업이 열리지 않으면 새 탭으로 열기</a>
    <p className="max-w-xl text-sm leading-6">FunJeju 영상 서버를 거치지 않고 제공처로 직접 연결합니다. HTTP 또는 인증서 보안 경고가 나오면 진행하지 마세요.</p>
    {manifest && <p role="status" className="max-w-xl text-sm leading-6">이 원본은 HLS 재생목록(.m3u8)입니다. 브라우저에 따라 영상 대신 파일로 열릴 수 있습니다. 새 창이 열렸다는 것만으로 영상 재생이 확인된 것은 아닙니다.</p>}
  </div>;
}
