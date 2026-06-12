"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { SpotGame, SpotMarker, SpotLayout } from "@/types/spot";
import { uploadSpotImage, base64ToBlob, splitDataUrl } from "@/lib/spot-client";

const RING_R = 5; // SVG % 반지름

export default function AdminSpotDiffPage() {
  const [step, setStep] = useState(0);
  const [orig, setOrig] = useState<string | null>(null);     // dataURL
  const [variant, setVariant] = useState<string | null>(null);
  const [layout, setLayout] = useState<SpotLayout>("side");
  const [markers, setMarkers] = useState<SpotMarker[]>([]);
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(5);
  const [level, setLevel] = useState("medium");
  const [extra, setExtra] = useState("");
  const [notes, setNotes] = useState<string[]>([]); // AI 생성 시 변경 내역 (검수용)
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // 기존 문제 목록
  const [games, setGames] = useState<SpotGame[]>([]);
  const loadGames = useCallback(async () => {
    const r = await fetch("/api/admin/spot", { cache: "no-store" });
    const d = await r.json();
    setGames(d.items ?? []);
  }, []);
  useEffect(() => { loadGames(); }, [loadGames]);

  // 원본 → 비율로 layout 자동 (가로=상하 stack / 세로=좌우 side)
  function onOrigFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new Image();
      img.onload = () => { setLayout(img.naturalWidth >= img.naturalHeight ? "stack" : "side"); };
      img.src = url;
      setOrig(url); setVariant(null); setMarkers([]); setNotes([]);
    };
    reader.readAsDataURL(file);
  }

  function onVariantFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => { setVariant(e.target?.result as string); setMarkers([]); setNotes([]); };
    reader.readAsDataURL(file);
  }

  async function genAI() {
    if (!orig) return;
    setBusy("ai"); setMsg("");
    try {
      const { base64, mime } = splitDataUrl(orig);
      const r = await fetch("/api/admin/spot/variant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origBase64: base64, mimeType: mime, count, level, extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "생성 실패");
      // 정답 마커가 자동으로 내려옴. origBase64(정규화 원본)로 교체해야 변형과 픽셀이 짝 맞음
      if (d.origBase64) setOrig(`data:image/png;base64,${d.origBase64}`);
      setVariant(`data:image/png;base64,${d.variantBase64}`);
      setMarkers(d.markers ?? []);
      setNotes(d.notes ?? []);
      setMsg(`✅ 변형 + 정답 ${d.markers?.length ?? 0}개 자동 생성 — 마커를 검수하세요 (클릭 추가 / 원 클릭 삭제)`);
      setStep(2);
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "실패"} (직접 변형 이미지를 업로드해도 됩니다)`);
    } finally { setBusy(null); }
  }

  function addMarker(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkers((m) => [...m, { x, y }]);
  }
  function removeMarker(i: number) { setMarkers((m) => m.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!orig || !variant || markers.length === 0) { setMsg("이미지 2장과 정답 좌표가 필요해요"); return; }
    setBusy("save"); setMsg("");
    try {
      const origUrl = await uploadSpotImage(base64ToBlob(splitDataUrl(orig).base64, splitDataUrl(orig).mime), "orig");
      const varUrl = await uploadSpotImage(base64ToBlob(splitDataUrl(variant).base64, splitDataUrl(variant).mime), "var");
      const r = await fetch("/api/admin/spot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, origImage: origUrl, variantImage: varUrl, layout, markers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "저장 실패");
      setMsg("✅ 저장 완료 (검수 대기) — 아래에서 발행하세요");
      setOrig(null); setVariant(null); setMarkers([]); setNotes([]); setTitle(""); setStep(0);
      await loadGames();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "저장 실패"}`);
    } finally { setBusy(null); }
  }

  async function publish(id: string, on: boolean) {
    await fetch("/api/admin/spot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published: on }) });
    await loadGames();
  }
  async function remove(id: string) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/spot?id=${id}`, { method: "DELETE" });
    await loadGames();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text-primary">🔍 틀린그림찾기 출제</h1>
        <Link href="/game/spot" className="text-xs font-medium text-brand-orange">게임 갤러리 →</Link>
      </div>

      {/* 단계 표시 */}
      <div className="mb-4 flex gap-2 text-[11px]">
        {["원본 업로드", "변형 생성", "좌표 표시", "저장"].map((l, i) => (
          <span key={i} className={`rounded-full px-2.5 py-1 font-bold ${step === i ? "bg-brand-navy text-white" : "bg-bg-secondary text-text-secondary"}`}>{i + 1}. {l}</span>
        ))}
      </div>

      {msg && <p className="mb-4 rounded-xl bg-bg-secondary px-4 py-2 text-xs text-text-primary">{msg}</p>}

      {/* STEP 0: 원본 */}
      {step === 0 && (
        <div className="rounded-2xl border border-border-soft bg-bg-card p-5">
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-border-soft p-8 text-center hover:border-brand-orange">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onOrigFile(e.target.files[0])} />
            {orig ? <img src={orig} alt="원본" className="mx-auto max-h-72 rounded-lg" /> : <div className="text-sm text-text-secondary">🖼️ 원본 이미지 클릭 업로드<br /><span className="text-[11px]">가로면 상하배치 / 세로면 좌우배치 자동</span></div>}
          </label>
          {orig && <p className="mt-2 text-[11px] text-text-secondary">배치: {layout === "stack" ? "상하 (가로 이미지)" : "좌우 (세로 이미지)"}</p>}
          <div className="mt-4 flex justify-end">
            <button disabled={!orig} onClick={() => setStep(1)} className="rounded-full bg-brand-navy px-4 py-2 text-xs font-bold text-white disabled:opacity-40">다음 →</button>
          </div>
        </div>
      )}

      {/* STEP 1: 변형 */}
      {step === 1 && orig && (
        <div className="rounded-2xl border border-border-soft bg-bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="setting"><label className="text-[11px] font-bold text-text-secondary">틀린 곳 개수</label>
              <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border-soft bg-bg-secondary px-3 py-2 text-sm" /></div>
            <div><label className="text-[11px] font-bold text-text-secondary">난이도</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-border-soft bg-bg-secondary px-3 py-2 text-sm">
                <option value="subtle">어려움(미세)</option><option value="medium">보통</option><option value="strong">쉬움(뚜렷)</option></select></div>
          </div>
          <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="추가 변형 지시 (선택): 간판 텍스트 변경, 메뉴 가격 변경 등" className="mt-3 w-full rounded-lg border border-border-soft bg-bg-secondary px-3 py-2 text-sm" rows={2} />
          <div className="mt-4 flex items-center justify-between gap-2">
            <button onClick={() => setStep(0)} className="rounded-full border border-border-soft px-4 py-2 text-xs font-semibold text-text-secondary">← 이전</button>
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-full border border-border-soft px-3 py-2 text-xs font-semibold text-text-secondary">
                직접 변형본 업로드<input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { onVariantFile(e.target.files[0]); setStep(2); } }} /></label>
              <button onClick={genAI} disabled={busy === "ai"} className="rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy === "ai" ? "생성 중…(20~40초)" : "✨ AI 변형 생성"}</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: 좌표 마킹 (변형 이미지에 클릭) */}
      {step === 2 && orig && variant && (
        <div className="rounded-2xl border border-border-soft bg-bg-card p-5">
          <p className="mb-3 text-xs text-text-secondary">변형 이미지에서 <strong>틀린 곳을 클릭</strong>하세요. 원을 클릭하면 삭제됩니다. (표시 {markers.length}개)</p>
          {notes.length > 0 && (
            <div className="mb-3 rounded-xl bg-bg-secondary px-4 py-3">
              <p className="mb-1 text-[11px] font-bold text-text-primary">🤖 AI 변경 내역 (검수용)</p>
              <ol className="space-y-0.5 text-[11px] text-text-secondary">
                {notes.map((n, i) => <li key={i}>{i + 1}. {n}</li>)}
              </ol>
            </div>
          )}
          <div className={`grid gap-3 ${layout === "stack" ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="overflow-hidden rounded-lg border border-border-soft">
              <div className="bg-bg-secondary px-3 py-1.5 text-[11px] font-bold">① 원본</div>
              <div className="relative leading-none">
                <img src={orig} alt="원본" className="block w-full" />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                  {markers.map((m, i) => (<g key={i}><circle cx={m.x} cy={m.y} r={RING_R} fill="rgba(255,60,60,0.18)" stroke="#ff3333" strokeWidth={2} /><text x={m.x} y={m.y + 0.6} textAnchor="middle" dominantBaseline="middle" fontSize={4} fontWeight="bold" fill="#cc2222">{i + 1}</text></g>))}
                </svg>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border-soft">
              <div className="bg-bg-secondary px-3 py-1.5 text-[11px] font-bold">② 변형 — 여기 클릭!</div>
              <div className="relative cursor-crosshair leading-none" onClick={addMarker}>
                <img src={variant} alt="변형" className="block w-full select-none" style={{ pointerEvents: "none" }} />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  {markers.map((m, i) => (<g key={i}><circle cx={m.x} cy={m.y} r={RING_R} fill="rgba(255,60,60,0.18)" stroke="#ff3333" strokeWidth={2} style={{ cursor: "pointer", pointerEvents: "all" }} onClick={(ev) => { ev.stopPropagation(); removeMarker(i); }} /><text x={m.x} y={m.y + 0.6} textAnchor="middle" dominantBaseline="middle" fontSize={4} fontWeight="bold" fill="#cc2222" style={{ pointerEvents: "none" }}>{i + 1}</text></g>))}
                </svg>
              </div>
            </div>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문제 제목 (예: 제주 협재 바다 틀린그림)" className="mt-3 w-full rounded-lg border border-border-soft bg-bg-secondary px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-full border border-border-soft px-4 py-2 text-xs font-semibold text-text-secondary">← 이전</button>
            <button onClick={save} disabled={busy === "save" || markers.length === 0} className="rounded-full bg-jeju-green px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy === "save" ? "저장 중…" : "💾 저장"}</button>
          </div>
        </div>
      )}

      {/* 출제 목록 */}
      <h2 className="mb-2 mt-8 text-sm font-black text-text-primary">출제된 문제 ({games.length})</h2>
      <div className="space-y-2">
        {games.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card p-3">
            <img src={g.variantImage} alt={g.title} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{g.title}</p>
              <p className="text-[11px] text-text-secondary">틀린곳 {g.diffCount} · {g.status === "published" ? "🟢 발행" : "⚪ 검수대기"} · 플레이 {g.playCount ?? 0}</p>
            </div>
            <button onClick={() => publish(g.id, g.status !== "published")} className="shrink-0 rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white">{g.status === "published" ? "비공개" : "발행"}</button>
            <button onClick={() => remove(g.id)} className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}
