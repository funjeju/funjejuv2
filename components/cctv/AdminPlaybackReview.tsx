"use client";

import { useState } from "react";
import type { CctvEntry } from "@/types/cctv";
import type { PlaybackAttestation } from "@/lib/firestore-cctv";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { vurixWatchUrl } from "@/constants/vurix";

/** Human review is deliberately labelled as an attestation, not an automated health test. */
export function AdminPlaybackReview({ entry, busy, onApprove, onClose }: {
  entry: CctvEntry; busy: boolean;
  onApprove: (review: PlaybackAttestation) => void;
  onClose: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [observed, setObserved] = useState(false);
  const [sourceChecked, setSourceChecked] = useState(false);
  const https = entry.originUrl.startsWith("https://");
  return (
    <section className="my-5 rounded-2xl border border-brand-orange/40 bg-bg-card p-5" aria-label="CCTV 게시 승인">
      <h2 className="font-bold">재생 검토 · {entry.name}</h2>
      <p className="my-2 text-sm text-text-secondary">저장된 소스를 직접 재생한 뒤 승인합니다. HTTP 성공, 썸네일, 로딩 완료만으로는 승인하지 마세요. 이 검토는 관리자 관찰 기록이며 자동 재생 인증이 아닙니다.</p>
      <code className="block break-all rounded-lg bg-bg-secondary p-3 text-xs">{entry.youtubeId ? `YouTube: ${entry.youtubeId}` : entry.originUrl}</code>
      <button type="button" onClick={() => { setStarted(true); setObserved(false); setSourceChecked(false); }} className="my-3 rounded-lg bg-brand-navy px-4 py-2 text-sm text-white">검토 시작 / 다시 테스트</button>
      {started && (entry.youtubeId ? (
        <iframe key={entry.sourceRevision} className="aspect-video w-full" title={`${entry.name} 관리자 검토`} src={`https://www.youtube.com/embed/${entry.youtubeId}?controls=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : https ? (
        <HlsPlayer key={entry.sourceRevision} proxyUrl={entry.originUrl} label={entry.name} />
      ) : (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p>HTTP 영상은 HTTPS 페이지 안에서 미리보기할 수 없습니다. 특히 신규·비활성 카메라는 기존 뷰어의 공개 설정에 포함되지 않으므로 여기서 자동 테스트하지 않습니다.</p>
          <a className="mt-2 inline-block font-bold underline" href={entry.originUrl} target="_blank" rel="noopener noreferrer">저장된 원본 주소 직접 열기 ↗</a>
          {entry.active && <a className="ml-4 mt-2 inline-block underline" href={vurixWatchUrl(entry.id, entry.name)} target="_blank" rel="noopener noreferrer">기존 공개 HTTP 뷰어 ↗</a>}
          <p className="mt-2 text-xs">원본 주소를 재생할 수 있는 브라우저 / 승인된 운영 환경에서 직접 확인하세요. 파일 다운로드나 텍스트만 표시되거나, CORS·보안 제한으로 재생할 수 없다면 이 화면에서는 검토를 완료할 수 없습니다. 보류 상태로 두세요. HTTPS 테스트 경로 또는 별도 인증된 미리보기 인프라는 아직 제공되지 않습니다.</p>

        </div>
      ))}
      <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" disabled={!started || busy} checked={sourceChecked} onChange={(event) => setSourceChecked(event.target.checked)} />검토한 영상이 위 저장된 소스 및 이 카메라의 장소와 일치함을 확인했습니다.</label>
      <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" disabled={!started || busy} checked={observed} onChange={(event) => setObserved(event.target.checked)} />영상이 실제로 재생되고 시간 / 프레임이 10초 이상 진행하며 오류가 없음을 직접 확인했습니다.</label>
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={busy || !observed || !sourceChecked || !entry.sourceRevision} onClick={() => onApprove({ sourceRevision: entry.sourceRevision!, observedAt: new Date().toISOString(), observedPlayback: true, method: "operator-observed" })} className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "게시 승인 중…" : "관찰 결과를 기록하고 게시 승인"}</button>
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">보류 / 닫기</button>
      </div>
    </section>
  );
}
