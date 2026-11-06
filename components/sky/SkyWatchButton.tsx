"use client";

import { findSkyCamera } from "@/lib/sky/cameras";
import { openWatch, watchUrl } from "@/lib/sky/watch";

/** 카메라 페이지의 '실시간 영상 보기' — 첫 화면 별과 똑같이 영상 새 창을 연다. */
export function SkyWatchButton({ id, variant = "primary", children }: { id: string; variant?: "primary" | "cover"; children?: React.ReactNode }) {
  const cam = findSkyCamera(id);
  if (!cam) return null;
  const href = watchUrl(cam);
  const onClick = (e: React.MouseEvent) => { e.preventDefault(); openWatch(cam); };

  if (variant === "cover") {
    return (
      <a href={href} onClick={onClick} aria-label={`${cam.name} 실시간 영상 새 창으로 보기`} className="absolute inset-0 z-[1] flex items-center justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-[rgba(3,5,10,0.55)] backdrop-blur-sm transition-transform hover:scale-105">
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="#F6F8FF"><path d="M8 5.5v13l11-6.5z" /></svg>
        </span>
      </a>
    );
  }
  return (
    <a
      href={href}
      onClick={onClick}
      className="inline-flex h-14 items-center gap-3 rounded-full bg-[#F6F8FF] px-7 text-base font-bold hover:bg-white"
      style={{ color: "#03050A" }} // globals.css 의 a { color: inherit } 가 Tailwind 글자색을 덮어써서 직접 지정
    >
      <span className="sky-pulse h-2 w-2 rounded-full bg-[#1FB57E]" />
      {children ?? "실시간 영상 보기 ↗"}
    </a>
  );
}
