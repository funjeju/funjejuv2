"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  listNewRestaurants,
  addRestaurant,
  updateRestaurant,
  deleteNewRestaurant,
  getHiddenIds,
  hideRestaurant,
  unhideRestaurant,
  type NewRestaurant,
} from "@/lib/firestore-restaurants";

type JsonSummary = {
  id: string;
  title: string;
  region: string;
  menu: string;
  thumbnail: string | null;
};

const MENU_OPTIONS = [
  "한식", "흑돼지", "갈치요리", "고기국수", "성게요리", "해물",
  "분식", "중식", "일식", "양식", "베이커리", "디저트",
  "카페", "브런치", "술집", "기타",
];

const OPTION_TAGS = ["펀제주인증", "주차", "혼밥OK", "예약필수", "배달", "테이크아웃", "단체석", "키즈존", "반려동물"];

const EMPTY_FORM: Omit<NewRestaurant, "id" | "createdAt"> = {
  title: "", region: "", menu: "한식",
  address: "", phone: "", hours: "",
  description: "", imageUrl: "", options: [],
};

export default function AdminFoodPage() {
  const [tab, setTab] = useState<"new" | "json">("new");

  // 신규 등록 데이터
  const [newList,    setNewList]    = useState<NewRestaurant[]>([]);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);

  // JSON 기존 데이터
  const [jsonList,   setJsonList]   = useState<JsonSummary[]>([]);
  const [hiddenIds,  setHiddenIds]  = useState<Set<string>>(new Set());
  const [jsonSearch, setJsonSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // 신규 + 숨김 ID
      const [newR, hidden, jsonR] = await Promise.all([
        listNewRestaurants(),
        getHiddenIds(),
        fetch("/api/admin/food-json").then((r) => r.json()),
      ]);
      setNewList(newR);
      setHiddenIds(new Set(hidden));
      setJsonList(jsonR.restaurants ?? []);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSave() {
    if (!form.title || !form.region || !form.menu) {
      return notify("err", "이름·지역·메뉴는 필수");
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateRestaurant(editingId, form);
        notify("ok", "수정 완료!");
      } else {
        await addRestaurant(form);
        notify("ok", "등록 완료!");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadAll();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNew(id: string, title: string) {
    if (!confirm(`"${title}" 삭제할까요?`)) return;
    await deleteNewRestaurant(id);
    notify("ok", "삭제 완료");
    loadAll();
  }

  function startEdit(r: NewRestaurant) {
    setForm({
      title: r.title, region: r.region, menu: r.menu,
      address: r.address, phone: r.phone, hours: r.hours,
      description: r.description, imageUrl: r.imageUrl,
      options: r.options,
    });
    setEditingId(r.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleHide(id: string, title: string) {
    if (!confirm(`"${title}"를 도민맛집 목록에서 숨길까요?\n(데이터는 보존, 표시만 제거)`)) return;
    await hideRestaurant(id);
    notify("ok", "숨김 처리 완료");
    loadAll();
  }

  async function handleUnhide(id: string) {
    await unhideRestaurant(id);
    notify("ok", "복원 완료");
    loadAll();
  }

  function toggleOption(opt: string) {
    setForm((f) => ({
      ...f,
      options: f.options.includes(opt)
        ? f.options.filter((o) => o !== opt)
        : [...f.options, opt],
    }));
  }

  const filteredJson = jsonSearch
    ? jsonList.filter((r) =>
        r.title.includes(jsonSearch) || r.region.includes(jsonSearch) || r.menu.includes(jsonSearch)
      )
    : jsonList;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">🍽️ 도민맛집 관리</h1>
          <p className="text-sm text-text-secondary">
            기존 {jsonList.length}곳(숨김 {hiddenIds.size}) · 신규 {newList.length}곳
          </p>
        </div>
      </div>

      {msg && (
        <div className={[
          "mb-4 rounded-xl px-4 py-3 text-sm font-semibold border whitespace-pre-line",
          msg.type === "ok"
            ? "bg-jeju-green/10 text-jeju-green border-jeju-green/20"
            : "bg-live-red/10 text-live-red border-live-red/20",
        ].join(" ")}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* 탭 */}
      <div className="mb-5 flex rounded-2xl border border-border-soft bg-bg-card p-1 shadow-card">
        <button type="button" onClick={() => setTab("new")}
          className={["flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
            tab === "new" ? "bg-brand-orange text-white shadow-soft" : "text-text-secondary"].join(" ")}>
          ➕ 신규 등록·관리 ({newList.length})
        </button>
        <button type="button" onClick={() => setTab("json")}
          className={["flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
            tab === "json" ? "bg-brand-navy text-white shadow-soft" : "text-text-secondary"].join(" ")}>
          📋 기존 589곳 (숨김 관리)
        </button>
      </div>

      {/* ── 신규 등록 탭 ── */}
      {tab === "new" && (
        <>
          {/* 추가/수정 폼 */}
          <div className="mb-6 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-bold text-text-primary">
              {editingId ? "✏️ 수정" : "➕ 신규 맛집 등록"}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">상호명 *</label>
                <input value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="제주 흑돼지집"
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">지역 *</label>
                <input value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="애월"
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">대표 메뉴 *</label>
                <select value={form.menu}
                  onChange={(e) => setForm({ ...form, menu: e.target.value })}
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm">
                  {MENU_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">전화번호</label>
                <input value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="064-123-4567"
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-text-secondary">주소</label>
                <input value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="제주특별자치도 제주시 애월읍 ..."
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">영업시간</label>
                <input value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="09:30 - 21:00"
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">이미지 URL</label>
                <input value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-text-secondary">설명</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="짧은 소개 (200자 이내 권장)"
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-text-secondary">옵션 태그</label>
                <div className="flex flex-wrap gap-1.5">
                  {OPTION_TAGS.map((opt) => (
                    <button key={opt} type="button"
                      onClick={() => toggleOption(opt)}
                      className={[
                        "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                        form.options.includes(opt)
                          ? "bg-brand-orange text-white"
                          : "border border-border-soft bg-bg-card text-text-secondary",
                      ].join(" ")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors">
                {saving ? "저장 중..." : editingId ? "수정 저장" : "맛집 등록"}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }}
                  className="rounded-xl border border-border-soft bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-text-secondary">
                  취소
                </button>
              )}
            </div>
          </div>

          {/* 신규 목록 */}
          <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
            <div className="border-b border-border-soft px-5 py-4">
              <h2 className="text-sm font-bold text-text-primary">신규 등록된 맛집 ({newList.length})</h2>
            </div>
            {loading ? (
              <div className="py-12 text-center text-xs text-text-secondary">불러오는 중...</div>
            ) : newList.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl">🍽️</p>
                <p className="mt-2 text-sm font-bold text-text-primary">아직 신규 맛집이 없어요</p>
                <p className="mt-1 text-xs text-text-secondary">위 폼에서 첫 번째 맛집을 등록해보세요</p>
              </div>
            ) : (
              <div className="divide-y divide-border-soft">
                {newList.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
                      {r.imageUrl ? (
                        <Image src={r.imageUrl} alt={r.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">{r.title}</p>
                      <p className="text-[11px] text-text-secondary truncate">
                        📍 {r.region} · {r.menu}
                        {r.options.length > 0 && ` · ${r.options.slice(0, 3).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => startEdit(r)}
                        className="rounded-lg bg-brand-navy/10 px-3 py-1.5 text-[11px] font-bold text-brand-navy hover:bg-brand-navy/20">
                        수정
                      </button>
                      <button type="button" onClick={() => handleDeleteNew(r.id, r.title)}
                        className="rounded-lg bg-live-red/10 px-3 py-1.5 text-[11px] font-bold text-live-red hover:bg-live-red/20">
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 기존 JSON 탭 ── */}
      {tab === "json" && (
        <div className="space-y-4">
          {/* 안내 */}
          <div className="rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-3 text-xs text-text-secondary">
            기존 589곳은 수정/삭제 불가. <strong className="text-brand-navy">숨김 처리</strong>만 가능합니다 (도민맛집 페이지에서 사라짐, 데이터는 보존).
          </div>

          {/* 검색 */}
          <div className="flex gap-2 rounded-full border border-border-soft bg-bg-card px-4 py-2 shadow-card">
            <span className="text-text-secondary">🔍</span>
            <input value={jsonSearch}
              onChange={(e) => setJsonSearch(e.target.value)}
              placeholder="상호명·지역·메뉴 검색"
              className="flex-1 bg-transparent text-sm outline-none" />
          </div>

          {/* 숨김 처리된 목록 */}
          {hiddenIds.size > 0 && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50/50 p-3">
              <p className="mb-2 text-xs font-bold text-yellow-800">
                👁️‍🗨️ 숨김 처리된 {hiddenIds.size}곳
              </p>
              <div className="flex flex-wrap gap-1.5">
                {jsonList.filter((r) => hiddenIds.has(r.id)).slice(0, 30).map((r) => (
                  <button key={r.id} type="button" onClick={() => handleUnhide(r.id)}
                    className="rounded-full bg-white border border-yellow-300 px-2.5 py-1 text-[11px] font-medium text-text-primary hover:bg-yellow-100">
                    {r.title} ↻
                  </button>
                ))}
                {hiddenIds.size > 30 && (
                  <span className="text-[11px] text-text-secondary">+{hiddenIds.size - 30}개</span>
                )}
              </div>
            </div>
          )}

          {/* JSON 맛집 목록 */}
          <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
            <div className="border-b border-border-soft px-5 py-4">
              <h2 className="text-sm font-bold text-text-primary">
                기존 도민맛집 ({filteredJson.length}개)
              </h2>
            </div>
            {loading ? (
              <div className="py-12 text-center text-xs text-text-secondary">불러오는 중...</div>
            ) : (
              <div className="divide-y divide-border-soft max-h-[600px] overflow-y-auto">
                {filteredJson.slice(0, 100).map((r) => {
                  const isHidden = hiddenIds.has(r.id);
                  return (
                    <div key={r.id} className={[
                      "flex items-center gap-3 px-5 py-3 transition-colors",
                      isHidden ? "bg-gray-50 opacity-60" : "hover:bg-bg-secondary",
                    ].join(" ")}>
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
                        {r.thumbnail ? (
                          <Image src={r.thumbnail} alt={r.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl">🍽️</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {r.title} {isHidden && <span className="text-[10px] text-yellow-700">[숨김]</span>}
                        </p>
                        <p className="text-[11px] text-text-secondary truncate">📍 {r.region} · {r.menu}</p>
                      </div>
                      {isHidden ? (
                        <button type="button" onClick={() => handleUnhide(r.id)}
                          className="shrink-0 rounded-lg bg-jeju-green/10 px-3 py-1.5 text-[11px] font-bold text-jeju-green hover:bg-jeju-green/20">
                          복원
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleHide(r.id, r.title)}
                          className="shrink-0 rounded-lg bg-yellow-100 px-3 py-1.5 text-[11px] font-bold text-yellow-700 hover:bg-yellow-200">
                          🗑 숨김
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredJson.length > 100 && (
                  <div className="py-3 text-center text-[11px] text-text-secondary border-t">
                    +{filteredJson.length - 100}개 더 — 검색으로 좁혀주세요
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
