"use client";

import { useEffect, useState } from "react";

/**
 * 사이트 전역 장애 안내 팝업.
 * - 장애 해소 시 NOTICE_ACTIVE = false 로 끄기 (삭제 대신)
 * - 공지 내용을 바꾸면 NOTICE_ID 도 바꿔야 "오늘 하루 보지 않기"한 사람에게도 다시 뜸
 */
const NOTICE_ACTIVE = true;
const NOTICE_ID = "2026-10-15-jejusi-cctv-outage";

const HIDE_UNTIL_KEY = `notice_hide_until:${NOTICE_ID}`;
const SESSION_CLOSED_KEY = `notice_closed:${NOTICE_ID}`;

export function ServiceNoticePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!NOTICE_ACTIVE) return;
    try {
      const hideUntil = Number(localStorage.getItem(HIDE_UNTIL_KEY) || 0);
      if (hideUntil > Date.now()) return;
      if (sessionStorage.getItem(SESSION_CLOSED_KEY)) return;
    } catch {
      // 스토리지 접근 불가 환경에서도 팝업은 그대로 표시
    }
    // 스토리지는 하이드레이션 이후에만 읽을 수 있어 effect에서 여는 게 맞음
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      sessionStorage.setItem(SESSION_CLOSED_KEY, "1");
    } catch {}
    setOpen(false);
  };

  const hideToday = () => {
    try {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      localStorage.setItem(HIDE_UNTIL_KEY, String(end.getTime()));
    } catch {}
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-notice-title"
      onClick={close}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-orange px-5 py-4 text-white">
          <p className="text-[11px] font-bold opacity-90">📢 서비스 안내</p>
          <h2 id="service-notice-title" className="mt-1 text-lg font-bold leading-snug">
            제주시권 CCTV 송출 일시 중단
          </h2>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm leading-6 text-text-primary">
          <p>
            현재 <strong>제주시에서 운영하는 재난감시 CCTV</strong> 원본 서버에 문제가 생겨,
            제주시권 카메라 영상이 <strong>전체적으로 송출되지 않고 있습니다.</strong>
          </p>
          <p className="rounded-xl bg-bg-secondary px-3 py-2 text-[12px] leading-5 text-text-secondary">
            영향 지역: 김녕·월정·평대·함덕·삼양·이호·탑동·도두·동한두기·하귀·곽지·협재·판포·우도 등
          </p>
          <p className="text-[12px] leading-5 text-text-secondary">
            한라산·서귀포권·공항 등 다른 지역 CCTV는 정상적으로 보실 수 있습니다.
            원본 서버가 복구되는 대로 자동으로 다시 송출됩니다. 이용에 불편을 드려 죄송합니다.
          </p>
        </div>

        <div className="flex border-t border-border-soft text-sm">
          <button
            type="button"
            onClick={hideToday}
            className="flex-1 py-3 text-text-secondary hover:bg-bg-secondary"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 border-l border-border-soft py-3 font-bold text-brand-orange hover:bg-bg-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
