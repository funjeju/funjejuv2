"use client";

import { useState } from "react";

type Props = {
  title: string;
  url?: string;        // 기본: 현재 페이지 URL
  imageUrl?: string;   // 카카오 공유용 이미지
  description?: string;
  compact?: boolean;   // true면 아이콘만, false면 텍스트 포함
};

export function ShareButton({ title, url, imageUrl, description, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  function getUrl() {
    const raw = url ?? (typeof window !== "undefined" ? window.location.href : "");
    // bare funjeju.com은 미작동 → 공유 링크는 항상 www로 정규화
    return raw.replace(/:\/\/funjeju\.com/, "://www.funjeju.com");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("input");
      el.value = getUrl();
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareKakao() {
    if (typeof window === "undefined") return;
    const shareUrl = getUrl();
    // 카카오 SDK가 없으면 카카오톡 링크 공유 URL 방식으로 폴백
    if ((window as { Kakao?: { isInitialized?: () => boolean; Share?: { sendDefault: (o: object) => void } } }).Kakao?.isInitialized?.()) {
      (window as unknown as { Kakao: { Share: { sendDefault: (o: object) => void } } }).Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description: description ?? "FunJeju에서 확인하세요",
          imageUrl: imageUrl ?? "https://www.funjeju.com/og-default.png",
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: "자세히 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
    } else {
      // SDK 없으면 카카오링크 앱스킴
      window.open(
        `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    }
    setOpen(false);
  }

  function shareTwitter() {
    const text = `${title}\n${getUrl()}\n\n#제주 #FunJeju`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    setOpen(false);
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`, "_blank");
    setOpen(false);
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title, text: description, url: getUrl() }).catch(() => {});
      setOpen(false);
    }
  }

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1 rounded-full transition-colors",
          compact
            ? "h-7 w-7 items-center justify-center bg-bg-secondary text-text-secondary hover:bg-border-soft text-sm"
            : "px-3 py-1.5 text-xs font-semibold border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
        ].join(" ")}
        title="공유하기"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
        </svg>
        {!compact && <span>공유</span>}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* dropdown */}
          <div className="absolute right-0 top-9 z-50 min-w-[140px] overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-soft">
            {hasNativeShare && (
              <button
                type="button"
                onClick={shareNative}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <span className="text-base">📤</span> 공유하기
              </button>
            )}
            <button
              type="button"
              onClick={shareKakao}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="text-base">💬</span> 카카오톡
            </button>
            <button
              type="button"
              onClick={shareTwitter}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="text-base">🐦</span> X(트위터)
            </button>
            <button
              type="button"
              onClick={shareFacebook}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="text-base">📘</span> 페이스북
            </button>
            <button
              type="button"
              onClick={() => { copyLink(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 border-t border-border-soft px-4 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="text-base">{copied ? "✅" : "🔗"}</span>
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
