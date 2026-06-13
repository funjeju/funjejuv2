"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthor, updateUserProfile } from "@/lib/feed";
import type { FeedAuthor } from "@/types/feed";

export function BusinessCtaSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FeedAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [variant, setVariant] = useState<"primary" | "outline">("primary");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getAuthor(user.uid).then((p) => {
      setProfile(p);
      if (p?.ctaData) {
        setText(p.ctaData.text);
        setUrl(p.ctaData.url);
        setVariant(p.ctaData.variant);
      }
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSavedMsg("");
    try {
      await updateUserProfile(user.uid, {
        ctaData:
          text.trim() && url.trim()
            ? { text: text.trim().slice(0, 8), url: url.trim(), variant }
            : undefined,
      });
      setSavedMsg("✅ 저장 완료!");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e) {
      setSavedMsg(`❌ 저장 실패: ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return null;

  return (
    <section className="mx-4 mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">💼 비즈니스 CTA 버튼</h3>
        {profile?.isBusiness ? (
          <span className="rounded-full bg-jeju-green/10 px-2 py-0.5 text-[10px] font-bold text-jeju-green">
            ✓ 비즈니스 회원
          </span>
        ) : (
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-bold text-text-secondary">
            일반 회원
          </span>
        )}
      </div>

      {!profile?.isBusiness ? (
        <p className="text-xs leading-5 text-text-secondary">
          비즈니스 회원 승인 후 CTA 버튼 설정이 가능합니다. 어드민에게 문의해주세요.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-text-secondary">
            본인의 피드에 자동으로 노출되는 버튼이에요. 예약·구매·전화·인스타 등 자유롭게 설정 가능.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-text-secondary">
                버튼 텍스트 ({text.length}/8)
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 8))}
                placeholder="예: 예약하기"
                className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-text-secondary">스타일</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setVariant("primary")}
                  className={[
                    "flex-1 rounded-xl py-2 text-xs font-bold transition-colors",
                    variant === "primary"
                      ? "bg-brand-orange text-white"
                      : "border border-border-soft bg-bg-card text-text-secondary",
                  ].join(" ")}
                >
                  채움
                </button>
                <button
                  type="button"
                  onClick={() => setVariant("outline")}
                  className={[
                    "flex-1 rounded-xl py-2 text-xs font-bold transition-colors",
                    variant === "outline"
                      ? "border-2 border-brand-orange text-brand-orange"
                      : "border border-border-soft bg-bg-card text-text-secondary",
                  ].join(" ")}
                >
                  테두리
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold text-text-secondary">링크 URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* 미리보기 — 실제 클릭 버튼이 아니라 피드에 이렇게 보인다는 예시 */}
          {text && url && (
            <div className="rounded-xl border border-dashed border-border-soft bg-bg-secondary p-3">
              <p className="mb-2 flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                👀 미리보기 <span className="font-normal text-text-secondary/70">— 내 피드에 이렇게 노출돼요</span>
              </p>
              <div
                aria-hidden
                className={[
                  "pointer-events-none block w-full select-none rounded-xl py-2.5 text-center text-xs font-bold",
                  variant === "outline"
                    ? "border-2 border-brand-orange text-brand-orange"
                    : "bg-brand-orange text-white shadow-soft",
                ].join(" ")}
              >
                {text} →
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-brand-navy py-2.5 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>

          {savedMsg && (
            <p className="text-center text-xs font-semibold text-jeju-green">{savedMsg}</p>
          )}
        </div>
      )}
    </section>
  );
}
