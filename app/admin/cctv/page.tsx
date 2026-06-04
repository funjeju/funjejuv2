"use client";

import { useState, useEffect, useCallback } from "react";
import {
  adminListCctvs,
  adminSetCctv,
  adminToggleCctv,
  adminDeleteCctv,
} from "@/lib/firestore-cctv";
import { getDirection, extractYoutubeId, DIRECTION_META } from "@/constants/cctv-directions";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { CctvEntry, CctvDirection } from "@/types/cctv";

// server.js의 CCTVS 맵 (Firestore 시딩용)
const ORIGIN_URLS: Record<string, string> = {
  gimnyeong:       "http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8",
  woljeong:        "http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8",
  pyeongdae:       "http://211.114.96.121:1935/jejusi7/11-22.stream/playlist.m3u8",
  hamdeok:         "http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8",
  hagwi:           "http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8",
  gwakji:          "http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8",
  hyeopjae:        "http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8",
  ongpo:           "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8",
  sinchang:        "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8",
  panpo:           "http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8",
  udo_cheonjin:    "http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8",
  udo_haumoktong:  "http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8",
  samyang:         "http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8",
  jeju_airport:    "http://123.140.197.51/stream/33/play.m3u8",
  tapdong:         "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100001/0/1/1.m3u8",
  dodu:            "http://211.114.96.121:1935/jejusi6/11-13.stream/playlist.m3u8",
  chuja_daeseo:    "http://211.114.96.121:1935/jejusi7/11-26.stream/playlist.m3u8",
  chuja_sinyang:   "http://211.114.96.121:1935/jejusi7/11-28.stream/playlist.m3u8",
  chuja_mukri:     "http://211.114.96.121:1935/jejusi7/11-27.stream/playlist.m3u8",
  chuja_yecho:     "http://211.114.96.121:1935/jejusi7/11-29.stream/playlist.m3u8",
  seongsan:        "http://123.140.197.51/stream/34/play.m3u8",
  seongsan_hang:   "http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8",
  seongsan_suma:   "http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8",
  seopjikoji:      "http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8",
  sinsan:          "http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8",
  namwon_deokdol:  "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8",
  namwon_taeheung: "http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8",
  hwasun:          "http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8",
  sanbangsan:      "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8",
  sindo:           "http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8",
  mosulpo:         "http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8",
  hamo_beach:      "http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8",
  daejeong_hamo:   "http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8",
  jungmun:         "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8",
  bomok:           "http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8",
  cheonjiyeon:     "http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8",
  saeyeongyo:      "http://123.140.197.51/stream/35/play.m3u8",
  nonjitmul:       "http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8",
  seogwipo_hang1:  "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8",
  seogwipo_hang2:  "http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8",
};

const EMPTY: Omit<CctvEntry, "addedAt"> = {
  id: "", name: "", region: "", direction: "북",
  category: "해변", originUrl: "", youtubeId: undefined,
  active: true, description: "",
};

const CATEGORIES = ["해변", "오름", "항구", "포구", "관광지", "드라이브", "공항", "기타"];
const DIRECTIONS: CctvDirection[] = ["북", "동", "남", "서"];

export default function AdminCctvPage() {
  const [entries, setEntries] = useState<CctvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState<Omit<CctvEntry, "addedAt">>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await adminListCctvs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function notify(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  }

  function handleRegionChange(region: string) {
    setForm((f) => ({ ...f, region, direction: getDirection(region) }));
  }

  function handleYoutubeChange(val: string) {
    setYoutubeInput(val);
    const id = extractYoutubeId(val.trim());
    setForm((f) => ({ ...f, youtubeId: id ?? undefined, originUrl: id ? "" : f.originUrl }));
  }

  async function handleSave() {
    if (!form.id || !form.name || !form.region) {
      return notify("err", "ID, 이름, 지역은 필수입니다");
    }
    if (!form.youtubeId && !form.originUrl) {
      return notify("err", "유튜브 URL 또는 원본 HLS URL 중 하나가 필요합니다");
    }
    setSaving(true);
    try {
      await adminSetCctv(form);
      notify("ok", editingId ? "수정 완료!" : "추가 완료!");
      setForm(EMPTY);
      setYoutubeInput("");
      setEditingId(null);
      load();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(entry: CctvEntry) {
    await adminToggleCctv(entry.id, !entry.active);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`"${id}" CCTV를 삭제할까요?`)) return;
    await adminDeleteCctv(id);
    notify("ok", "삭제 완료");
    load();
  }

  function startEdit(entry: CctvEntry) {
    setForm({
      id: entry.id, name: entry.name, region: entry.region,
      direction: entry.direction, category: entry.category,
      originUrl: entry.originUrl, youtubeId: entry.youtubeId,
      active: entry.active, description: entry.description,
    });
    setYoutubeInput(entry.youtubeId ? `https://www.youtube.com/watch?v=${entry.youtubeId}` : "");
    setEditingId(entry.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSeedFromMock() {
    if (!confirm(`기존 CCTV ${mockCctvs.length}개를 Firestore에 시딩할까요?\n\n⚠️ 주의: Firebase 콘솔 → Firestore → 규칙에서\ncctvs 컬렉션 write 허용이 필요합니다.`)) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-cctvs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.hint) {
          notify("err", `${data.error}\n\n${data.hint}\n규칙: ${data.rule}`);
        } else {
          notify("err", data.error ?? "시딩 실패");
        }
      } else {
        notify("ok", `${data.count}개 시딩 완료!`);
        load();
      }
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "시딩 실패");
    } finally {
      setSeeding(false);
    }
  }

  const youtubeCount = entries.filter((e) => e.youtubeId).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📡 CCTV 관리</h1>
          <p className="text-sm text-text-secondary">Firestore 단일 소스 · Lightsail 자동 반영</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-jeju-green/10 px-3 py-1.5 text-xs font-bold text-jeju-green border border-jeju-green/20">
            총 {entries.length}개 {youtubeCount > 0 && `(YouTube ${youtubeCount})`}
          </span>
          {entries.length === 0 && (
            <button
              type="button"
              onClick={handleSeedFromMock}
              disabled={seeding}
              className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
            >
              {seeding ? "시딩 중..." : "🌱 Mock에서 마이그레이션"}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={[
          "mb-4 rounded-xl px-4 py-3 text-sm font-semibold border",
          msg.type === "ok"
            ? "bg-jeju-green/10 text-jeju-green border-jeju-green/20"
            : "bg-live-red/10 text-live-red border-live-red/20",
        ].join(" ")}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* 추가/수정 폼 */}
      <div className="mb-8 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-text-primary">
          {editingId ? `✏️ 수정: ${editingId}` : "➕ CCTV 추가"}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

          {/* ID */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">ID (영문·고유)</label>
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              disabled={!!editingId}
              placeholder="hamdeok_beach"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange disabled:opacity-50"
            />
          </div>

          {/* 이름 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="함덕해변 CCTV"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* 지역 → direction 자동 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">지역</label>
            <input
              value={form.region}
              onChange={(e) => handleRegionChange(e.target.value)}
              placeholder="제주시 구좌읍"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* 방향 자동 + 수동 override */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              방향 <span className="font-normal text-text-secondary">(지역 입력 시 자동 감지)</span>
            </label>
            <div className="flex gap-1">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, direction: d })}
                  className={[
                    "flex-1 rounded-xl py-2 text-xs font-bold transition-colors",
                    form.direction === d
                      ? "bg-brand-navy text-white"
                      : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                  ].join(" ")}
                >
                  {DIRECTION_META[d].emoji} {d}
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* 활성화 */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-brand-orange"
            />
            <label htmlFor="active" className="text-sm font-medium text-text-primary">활성화</label>
          </div>

          {/* 유튜브 URL */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              YouTube URL 또는 ID <span className="font-normal text-brand-orange">(입력 시 HLS 대신 유튜브 재생 · 목록 최상단 고정)</span>
            </label>
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => handleYoutubeChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... 또는 영상 ID 11자리"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
            {form.youtubeId && (
              <p className="mt-1 text-[11px] text-jeju-green font-semibold">
                ✓ YouTube ID: <code>{form.youtubeId}</code>
              </p>
            )}
          </div>

          {/* HLS 원본 URL (유튜브가 없을 때) */}
          {!form.youtubeId && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-secondary">
                원본 HLS URL <span className="text-live-red">(서버에만 저장, 외부 노출 안됨)</span>
              </label>
              <input
                value={form.originUrl}
                onChange={(e) => setForm({ ...form, originUrl: e.target.value })}
                placeholder="http://211.xxx.xxx.xxx:1935/live/stream.m3u8"
                className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-orange"
              />
            </div>
          )}

          {/* 설명 */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-text-secondary">설명</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="짧은 장소 설명"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : editingId ? "수정 저장" : "추가하기"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setForm(EMPTY); setYoutubeInput(""); setEditingId(null); }}
              className="rounded-xl border border-border-soft bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h2 className="text-sm font-bold text-text-primary">등록된 CCTV</h2>
          <button type="button" onClick={load} className="text-xs text-brand-orange hover:underline">
            🔄 새로고침
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-3xl">📡</p>
            <p className="mt-3 text-sm font-bold text-text-primary">등록된 CCTV가 없어요</p>
            <p className="text-xs text-text-secondary">위 "Mock에서 마이그레이션" 버튼으로 기존 데이터를 가져오세요</p>
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-bg-secondary transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-text-primary">{entry.name}</span>
                    {entry.youtubeId && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        ▶ YouTube
                      </span>
                    )}
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">
                      {DIRECTION_META[entry.direction].emoji} {entry.direction}쪽
                    </span>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">
                      {entry.region}
                    </span>
                    <span className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      entry.active ? "bg-jeju-green/10 text-jeju-green" : "bg-gray-100 text-gray-400",
                    ].join(" ")}>
                      {entry.active ? "● 활성" : "○ 비활성"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-text-secondary">ID: {entry.id}</p>
                  {entry.youtubeId ? (
                    <p className="mt-0.5 font-mono text-[11px] text-red-500">YouTube: {entry.youtubeId}</p>
                  ) : (
                    <p className="mt-0.5 font-mono text-[11px] text-live-red/70 truncate">{entry.originUrl}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggle(entry)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                      entry.active ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-jeju-green/10 text-jeju-green hover:bg-jeju-green/20",
                    ].join(" ")}
                  >
                    {entry.active ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="rounded-lg bg-brand-navy/10 px-3 py-1.5 text-[11px] font-bold text-brand-navy hover:bg-brand-navy/20 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg bg-live-red/10 px-3 py-1.5 text-[11px] font-bold text-live-red hover:bg-live-red/20 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
