"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCctvs } from "@/hooks/useCctvs";
import type { Content } from "@/types/content";

// 카드뉴스 주제(테마) → 생성 소스
const THEMES = [
  { source: "briefing", label: "📰 모닝브리핑", desc: "오늘의 제주 소식 요약" },
  { source: "weather",  label: "🌤️ 실시간 날씨", desc: "동서남북 CCTV 현장 날씨" },
  { source: "webzine",  label: "🍽️ 맛집 소개", desc: "지역×메뉴 맛집 큐레이션" },
  { source: "feed",     label: "📸 라이브피드", desc: "여행자 사진 큐레이션" },
] as const;

const DIRS = [
  { key: "북", label: "북쪽" },
  { key: "동", label: "동쪽" },
  { key: "남", label: "남쪽" },
  { key: "서", label: "서쪽" },
] as const;

export default function AdminCardNewsPage() {
  const { cctvs } = useCctvs();
  const [items, setItems] = useState<Content[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [camAm, setCamAm] = useState<string[]>([]);
  const [camPm, setCamPm] = useState<string[]>([]);
  const [slot, setSlot] = useState<"am" | "pm">("am"); // 편집 중인 시간대
  const [savingCams, setSavingCams] = useState(false);
  const camIds = slot === "am" ? camAm : camPm;
  const setCamIds = slot === "am" ? setCamAm : setCamPm;

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/contents");
    const d = await res.json();
    setItems(((d.items ?? []) as Content[]).filter((c) => c.type === "card_news"));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/cardnews/config").then((r) => r.json()).then((d) => { setCamAm(d.weatherAm ?? []); setCamPm(d.weatherPm ?? []); }).catch(() => {});
  }, [load]);

  async function generate(source: string) {
    setBusy(`gen-${source}`); setMsg("");
    try {
      const res = await fetch(`/api/admin/contents?type=card_news&source=${source}`, { method: "POST" });
      const d = await res.json();
      setMsg(res.ok && d.ok ? `✅ 생성됨: ${d.title ?? ""}` : `⚠️ ${d.error ?? "생성 실패"}`);
      await load();
    } catch { setMsg("생성 실패"); }
    finally { setBusy(null); }
  }

  async function publish(id: string) {
    setBusy(id);
    try { await fetch("/api/admin/contents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await load(); }
    finally { setBusy(null); }
  }
  async function remove(id: string) {
    if (!confirm("이 카드뉴스를 삭제할까요?")) return;
    setBusy(id);
    try { await fetch("/api/admin/contents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await load(); }
    finally { setBusy(null); }
  }

  function toggleCam(id: string) {
    setCamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  async function saveCams() {
    setSavingCams(true);
    try {
      await fetch("/api/admin/cardnews/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weatherAm: camAm, weatherPm: camPm }) });
      setMsg(`✅ 저장됨 — 오전 ${camAm.length}개 · 오후 ${camPm.length}개`);
    } finally { setSavingCams(false); }
  }

  const drafts = items.filter((c) => c.status === "draft");
  const published = items.filter((c) => c.status === "published");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-black text-text-primary">🃏 카드뉴스</h1>
      <p className="mb-4 text-sm text-text-secondary">주제별 생성 → 미리보기 → 배포. 인스타·스레드 캐러셀(4:5)용.</p>

      {/* 주제별 생성 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEMES.map((t) => (
          <button key={t.source} type="button" onClick={() => generate(t.source)} disabled={busy === `gen-${t.source}`}
            className="flex flex-col items-start gap-0.5 rounded-2xl border border-border-soft bg-bg-card p-3 text-left hover:border-jeju-green disabled:opacity-50">
            <span className="text-sm font-bold text-text-primary">{busy === `gen-${t.source}` ? "생성 중…" : t.label}</span>
            <span className="text-[11px] text-text-secondary">{t.desc}</span>
          </button>
        ))}
      </div>

      {msg && <p className="mt-3 rounded-xl bg-bg-secondary px-4 py-2 text-xs text-text-primary">{msg}</p>}

      {/* 실시간 날씨 카메라 설정 */}
      <div className="mt-6 rounded-2xl border border-border-soft bg-bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">🌤️ 실시간 날씨 카메라 <span className="font-normal text-text-secondary">(시간대별 구성 · 카드뉴스 생성 시 KST 기준 자동 선택)</span></h2>
          <button type="button" onClick={saveCams} disabled={savingCams}
            className="rounded-full bg-jeju-green px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">{savingCams ? "저장 중…" : "저장"}</button>
        </div>
        {/* 오전/오후 탭 */}
        <div className="mb-3 flex gap-2">
          {([["am", "🌅 오전", camAm.length], ["pm", "🌇 오후", camPm.length]] as const).map(([s, label, cnt]) => (
            <button key={s} type="button" onClick={() => setSlot(s)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${slot === s ? "bg-brand-navy text-white" : "border border-border-soft bg-bg-card text-text-secondary"}`}>
              {label} ({cnt}개)
            </button>
          ))}
          <span className="self-center text-[11px] text-text-secondary">← {slot === "am" ? "오전" : "오후"} 세트 편집 중</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIRS.map((d) => {
            const cams = cctvs.filter((c) => c.direction === d.key);
            return (
              <div key={d.key}>
                <p className="mb-1 text-[11px] font-bold text-text-secondary">{d.label}</p>
                <div className="flex flex-col gap-1">
                  {cams.map((c) => (
                    <label key={c.id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${camIds.includes(c.id) ? "border-jeju-green bg-jeju-green/10 font-bold text-jeju-green" : "border-border-soft text-text-secondary"}`}>
                      <input type="checkbox" checked={camIds.includes(c.id)} onChange={() => toggleCam(c.id)} className="h-3 w-3" />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                  {cams.length === 0 && <span className="text-[10px] text-text-secondary">카메라 없음</span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">선택한 카메라의 현재 모습을 분석해 날씨 카드뉴스를 만듭니다.</p>
      </div>

      {/* 검수 대기 */}
      <h2 className="mb-2 mt-6 text-sm font-bold text-text-primary">검수 대기 ({drafts.length})</h2>
      <div className="flex flex-col gap-2">
        {drafts.length === 0 && <p className="text-xs text-text-secondary">초안이 없어요.</p>}
        {drafts.map((c) => (
          <ContentRow key={c.id} c={c} busy={busy === c.id} onPublish={() => publish(c.id)} onRemove={() => remove(c.id)} draft />
        ))}
      </div>

      {/* 발행됨 */}
      <h2 className="mb-2 mt-6 text-sm font-bold text-text-primary">발행됨 ({published.length})</h2>
      <div className="flex flex-col gap-2">
        {published.length === 0 && <p className="text-xs text-text-secondary">발행된 카드뉴스가 없어요.</p>}
        {published.map((c) => (
          <ContentRow key={c.id} c={c} busy={busy === c.id} onRemove={() => remove(c.id)} />
        ))}
      </div>
    </div>
  );
}

function ContentRow({ c, busy, onPublish, onRemove, draft }: { c: Content; busy: boolean; onPublish?: () => void; onRemove: () => void; draft?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border-soft bg-bg-card p-3">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-bold text-text-primary">{c.title.replace(/\n/g, " ")}</h3>
        <span className="text-[10px] text-text-secondary">카드 {1 + (c.sections?.length ?? 0) + 1}장 · /card/{c.slug}</span>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Link href={`/card/${c.slug}`} target="_blank" className="rounded-full border-2 border-brand-navy bg-white px-3 py-1 text-[11px] font-bold !text-brand-navy">👁 보기</Link>
        {draft && onPublish && (
          <button type="button" onClick={onPublish} disabled={busy} className="rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50">🚀 배포</button>
        )}
        <button type="button" onClick={onRemove} disabled={busy} className="rounded-full border border-border-soft bg-white px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
      </div>
    </div>
  );
}
