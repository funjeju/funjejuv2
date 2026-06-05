"use client";

import { useEffect, useRef } from "react";

/**
 * 페이지 가시성 감지 훅 — 백그라운드 진입 / 복귀 시 콜백 실행
 *
 * 모바일에서 다른 앱 전환·탭 전환·화면 잠금 시 onHide,
 * 복귀 시 onShow가 호출됩니다.
 *
 * 사용 예:
 *   usePageVisibility({
 *     onHide: () => { hls.stopLoad(); video.pause(); },
 *     onShow: () => { hls.startLoad(); video.play(); },
 *   });
 */
export function usePageVisibility(callbacks: {
  onHide?: () => void;
  onShow?: () => void;
}) {
  // 최신 콜백 보존 (의존성 배열 변동 없이 항상 최신 호출)
  const onHideRef = useRef(callbacks.onHide);
  const onShowRef = useRef(callbacks.onShow);
  onHideRef.current = callbacks.onHide;
  onShowRef.current = callbacks.onShow;

  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        onHideRef.current?.();
      } else {
        onShowRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
}
