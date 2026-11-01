"use client";

import { openVurixWatch, vurixWatchUrl } from "@/constants/vurix";

/** HTTP 카메라 런처 — 고정된 별도 HTTP 뷰어에서 재생을 시도. */
export function VurixLaunch({ id, name }: { id: string; name: string }) {
  return (
    <div className="px-4 md:px-0">
      <button
        type="button"
        onClick={() => openVurixWatch(id, name)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-[#2b2f37] bg-black md:rounded-2xl"
        style={{ aspectRatio: "16 / 9" }}
        aria-label={`${name} 새 창에서 영상 보기`}
      >
        {/* 모니터 배경 + 스캔라인 + 비네트 */}
        <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 38%, #15161b 0%, #060607 78%)" }} />
        <span className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px)" }} />
        <span className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 150px rgba(0,0,0,.7)" }} />

        {/* 재생 방식 / 이름 */}
        <span className="absolute left-4 top-3 flex items-center gap-1.5 text-[12px] font-extrabold tracking-wide text-white drop-shadow">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          새 창 보기
        </span>
        <span className="absolute bottom-3 left-4 text-[14px] font-extrabold text-white drop-shadow">{name}</span>
        <span className="absolute bottom-3 right-4 text-[12px] font-extrabold text-brand-orange drop-shadow">FunJeju</span>

        {/* 중앙 재생 버튼 */}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/90 shadow-soft transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-white"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
            새 창에서 영상 보기
          </span>
        </span>
      </button>
      <p className="mt-2 text-center text-[11px] text-text-secondary">
        HTTP 원본 영상은 별도 창에서 열립니다. 제공처 오류·브라우저 정책에 따라 재생되지 않을 수 있어요.
        <a href={vurixWatchUrl(id, name)} target="_blank" rel="noopener noreferrer" className="mt-2 block underline">팝업이 열리지 않으면 새 탭으로 보기</a>
      </p>
    </div>
  );
}
