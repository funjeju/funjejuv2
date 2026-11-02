"use client";

import { useEffect, useRef, useState } from "react";
import type { DirectoryEntry, DirectoryFields, DirectoryList, DirectorySaveRequest } from "@/types/cctv-directory";

const LOGIN = "/admin/login?next=%2Fadmin%2Fcctv-directory";
const ENDPOINT = "/api/admin/cctv-directory";
type Draft = { id: string; revision: string; fields: DirectoryFields; latitude: string; longitude: string; existing: boolean; restricted: boolean; observed: boolean };
const emptyFields = (): DirectoryFields => ({ name: "", region: "", direction: "", category: "", description: "", lat: null, lng: null, sourceUrl: "", viewerUrl: "", youtubeId: "", visible: true, playbackStatus: "unverified", playbackNote: "" });
function toDraft(entry?: DirectoryEntry): Draft {
  const fields = emptyFields();
  if (entry) for (const key of Object.keys(fields) as (keyof DirectoryFields)[]) Object.assign(fields, { [key]: entry[key] });
  return { id: entry?.id ?? "", revision: entry?.revision ?? "new", fields, latitude: entry?.lat == null ? "" : String(entry.lat), longitude: entry?.lng == null ? "" : String(entry.lng), existing: !!entry, restricted: entry?.sourceRestricted ?? false, observed: false };
}

export function DirectoryAdmin({ catalogueHref = "/cctv-directory" }: { catalogueHref?: string | null } = {}) {
  const [list, setList] = useState<DirectoryList | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [confirm, setConfirm] = useState<"import" | "reload" | "discard" | null>(null);
  const nextDraft = useRef<Draft | null>(null);
  const mounted = useRef(false), lock = useRef(false), sequence = useRef(0), editVersion = useRef(0);
  const controller = useRef<AbortController | null>(null);

  async function refresh() {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setLoading(true);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error(response.status === 401 ? "unauthorized" : "목록을 불러오지 못했습니다.");
      const data: DirectoryList = await response.json();
      if (!mounted.current || request !== sequence.current || abort.signal.aborted) return false;
      setList(data); setUnauthorized(false); return true;
    } catch (cause) {
      if (!mounted.current || request !== sequence.current || abort.signal.aborted) return false;
      const auth = cause instanceof Error && cause.message === "unauthorized";
      setUnauthorized(auth); setError(auth ? "관리자 로그인이 필요합니다. 작성 중인 내용은 유지됩니다." : "목록 새로고침에 실패했습니다. 작성 중인 내용은 유지됩니다."); return false;
    } finally { if (mounted.current && request === sequence.current) setLoading(false); }
  }
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => { if (mounted.current) void refresh(); });
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  function change(update: Partial<Draft>) {
    if (lock.current) return;
    editVersion.current++; setDraft(current => current ? { ...current, ...update } : current); setDirty(true); setMessage("");
  }
  function field<K extends keyof DirectoryFields>(key: K, value: DirectoryFields[K]) {
    if (draft) change({ fields: { ...draft.fields, [key]: value } });
  }
  function select(next: Draft) {
    if (lock.current) return;
    if (dirty) { nextDraft.current = next; setConfirm("discard"); return; }
    editVersion.current++; setDraft(next); setDirty(false); setError(""); setMessage("");
  }
  async function save() {
    if (!draft || lock.current) return;
    if (list?.writesEnabled !== true) { setError("규칙 검증 전 저장 잠금: 현재 목록은 읽기 전용입니다."); return; }
    const lat = draft.latitude.trim(), lng = draft.longitude.trim();
    if (!draft.id.trim() || !draft.fields.name.trim()) { setError("ID와 이름을 입력해 주세요."); return; }
    if ((!lat) !== (!lng) || (lat && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180))) { setError("위도와 경도를 모두 입력하거나 모두 비워 주세요. 좌표 범위를 확인해 주세요."); return; }
    if (draft.fields.playbackStatus === "verified" && !draft.observed) { setError("직접 영상 재생을 확인한 경우에만 확인 체크를 해 주세요."); return; }
    const body: DirectorySaveRequest = { action: "save", id: draft.id.trim(), expectedRevision: draft.revision, fields: { ...draft.fields, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null }, ...(draft.fields.playbackStatus === "verified" ? { observation: { observedPlayback: true as const, observedAt: new Date().toISOString() } } : {}) };
    const version = editVersion.current;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!mounted.current) return;
      if (!response.ok) { setUnauthorized(response.status === 401); setError(response.status === 409 ? "다른 변경과 충돌했습니다. 입력은 유지됩니다. 목록을 새로고침하고 최신 항목과 비교한 뒤 다시 편집해 주세요." : response.status === 401 ? "관리자 로그인이 필요합니다. 입력은 유지됩니다." : "저장하지 못했습니다. 입력은 유지됩니다. 항목을 확인해 주세요."); return; }
      const result: { entry: DirectoryEntry } = await response.json();
      if (!mounted.current || version !== editVersion.current) return;
      // Keep the successful revision if the subsequent list refresh fails.
      setDraft(current => current ? { ...current, revision: result.entry.revision, existing: true } : current);
      const refreshed = await refresh();
      if (mounted.current && version === editVersion.current) {
        if (refreshed) { setDraft(null); setDirty(false); setMessage("새 목록에 저장했습니다. 기존 CCTV 데이터는 변경하지 않았습니다."); }
        else setMessage("저장은 완료됐지만 목록 갱신은 실패했습니다. 입력 내용을 보존했습니다.");
      }
    } catch { if (mounted.current) setError("저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 중복 저장 전에 목록을 새로고침해 확인해 주세요."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function importLegacy() {
    if (!list || lock.current) return;
    if (list.writesEnabled !== true) { setError("규칙 검증 전 저장 잠금: 가져오기는 허용되지 않습니다."); setConfirm(null); return; }
    lock.current = true; setBusy(true); setConfirm(null); setError(""); setMessage("");
    try {
      const response = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import-legacy", expectedImportRevision: list.importRevision }) });
      if (!mounted.current) return;
      if (!response.ok) { setUnauthorized(response.status === 401); setError(response.status === 409 ? "원본 목록이 변경됐습니다. 새로고침 후 가져올 수량을 다시 확인해 주세요." : "가져오기 결과를 확인하지 못했습니다. 목록을 확인해 주세요."); return; }
      const result: { imported: number; skipped: number } = await response.json();
      if (!mounted.current) return;
      setMessage(`${result.imported}개를 가져왔습니다. 기존 항목 ${result.skipped}개는 덮어쓰지 않았습니다.`); await refresh();
    } catch { if (mounted.current) setError("가져오기 결과가 불확실합니다. 재시도 전에 목록을 새로고침해 주세요."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const inputClass = "w-full rounded border border-gray-400 bg-white p-2 text-black";
  const rows = (list?.entries ?? []).filter(entry => `${entry.id} ${entry.name} ${entry.region} ${entry.category}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="mx-auto max-w-6xl space-y-5 p-5">
    <h1 className="text-2xl font-bold">새 CCTV 목록 관리</h1>
    {list?.writesEnabled !== true && <p role="status" className="border border-amber-600 p-3">규칙 검증 전 저장 잠금 · 현재 읽기 전용입니다. 목록과 입력 항목은 확인할 수 있지만 저장·가져오기는 실행되지 않습니다.</p>}
    <p>기존 cctvs 데이터와 기존 관리 화면은 변경하지 않습니다. 목록 공개와 영상 재생 확인은 별개입니다. 모든 영상의 재생을 보장하지 않습니다.</p>
    <nav className="flex gap-5"><a href="/admin/cctv" className="underline">기존 CCTV 관리</a>{catalogueHref && <a href={catalogueHref} className="underline">새 미리보기 목록</a>}</nav>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{unauthorized && <a href={LOGIN} className="underline">관리자 로그인</a>}
    <p role="status">{loading ? "목록을 불러오는 중입니다." : `전체 ${list?.entries.length ?? 0}개 · 기존 원본 ${list?.legacyCount ?? 0}개 · 새 목록 저장 ${list?.storedCount ?? 0}개 · 가져오기 대기 ${list?.pendingImportCount ?? 0}개`}</p>
    <p>기존 전체 레코드의 별도 백업은 아래 가져오기를 명시적으로 확인한 뒤에만 생성됩니다. 이미 저장된 항목은 덮어쓰지 않습니다. 숨김·미검증·좌표 없는 항목도 관리 목록에 포함됩니다.</p>
    <div className="flex flex-wrap gap-4">
      <button disabled={busy || loading} onClick={() => { if (dirty) setConfirm("reload"); else { setError(""); void refresh(); } }}>목록 새로고침</button>
      <button disabled={busy || loading || list?.writesEnabled !== true || !list?.pendingImportCount} onClick={() => setConfirm("import")}>기존 목록 가져오기</button>
      <button disabled={busy} onClick={() => select(toDraft())}>새 CCTV 추가</button>
    </div>
    {confirm && <section role="alertdialog" aria-label="작업 확인" className="space-y-3 border p-4">
      <p>{confirm === "import" ? `기존 원본 ${list?.legacyCount ?? 0}개 중 ${list?.pendingImportCount ?? 0}개를 별도 목록으로 복사하고 원본 전체 레코드를 백업합니다. 기존 새 목록 항목은 덮어쓰지 않습니다. 계속할까요?` : confirm === "reload" ? "작성 중인 내용은 유지하고 목록만 새로고침할까요? 충돌한 항목은 최신 행을 선택해 다시 검토해 주세요." : "작성 중인 변경을 버리고 선택한 항목을 열까요?"}</p>
      <button disabled={busy || (confirm === "import" && list?.writesEnabled !== true)} onClick={() => { if (confirm === "import") void importLegacy(); else if (confirm === "reload") { setConfirm(null); setError(""); void refresh(); } else { editVersion.current++; setDraft(nextDraft.current); setDirty(false); setConfirm(null); setError(""); } }}>확인</button>
      <button disabled={busy} onClick={() => setConfirm(null)}>취소</button>
    </section>}
    <label className="block">목록 검색<input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} /></label>
    <ul className="max-h-96 space-y-2 overflow-auto border p-3">{rows.map(entry => <li key={entry.id}><button disabled={busy} onClick={() => select(toDraft(entry))} className="text-left underline">{entry.name || entry.id} ({entry.id})</button> · {entry.visible ? "목록 공개" : "목록 숨김"} · {entry.playbackStatus === "verified" ? "재생 확인 기록 있음" : entry.playbackStatus === "unavailable" ? "재생 불가 기록" : "재생 미검증"} · {entry.lat == null || entry.lng == null ? "좌표 없음" : "좌표 있음"}{entry.sourceRestricted && " · 원본 주소 비공개 보존"}</li>)}</ul>
    {draft && <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4 border p-4">
      <h2 className="text-xl font-bold">{draft.existing ? "CCTV 편집" : "새 CCTV 추가"}</h2>
      {draft.restricted && <p role="status">민감하거나 제한된 원본 주소는 표시하지 않으며 별도 백업에 보존됩니다. 이 화면에서 원본 주소를 자동으로 열거나 요청하지 않습니다.</p>}
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label>ID<input required readOnly={draft.existing} className={inputClass} value={draft.id} onChange={event => change({ id: event.target.value })} /></label>
        {([['name','이름'],['region','지역'],['category','분류'],['description','설명'],['sourceUrl','원본 URL'],['viewerUrl','제공기관 재생 페이지 URL'],['youtubeId','YouTube ID'],['playbackNote','재생 확인 메모']] as const).map(([key,label]) => <label key={key}>{label}<input required={key === 'name'} className={inputClass} value={draft.fields[key]} onChange={event => field(key,event.target.value)} /></label>)}
        <label>방향<select className={inputClass} value={draft.fields.direction} onChange={event => field('direction',event.target.value as DirectoryFields['direction'])}><option value="">지역 미확정</option>{['북','동','남','서'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>위도<input inputMode="decimal" className={inputClass} value={draft.latitude} onChange={event => change({latitude:event.target.value})}/></label>
        <label>경도<input inputMode="decimal" className={inputClass} value={draft.longitude} onChange={event => change({longitude:event.target.value})}/></label>
        <label><input type="checkbox" checked={draft.fields.visible} onChange={event => field('visible',event.target.checked)}/> 목록에 공개</label>
        <label>재생 상태<select className={inputClass} value={draft.fields.playbackStatus} onChange={event => { field('playbackStatus',event.target.value as DirectoryFields['playbackStatus']); }}><option value="unverified">미검증</option><option value="verified">직접 재생 확인</option><option value="unavailable">재생 불가</option></select></label>
        {draft.fields.playbackStatus === 'verified' && <label><input type="checkbox" checked={draft.observed} onChange={event => change({observed:event.target.checked})}/> 실제 영상 재생을 직접 확인했습니다 (저장 시 확인 시각 기록)</label>}
      </fieldset>
      <p>좌표는 둘 다 비우면 미등록으로 저장됩니다. 주소를 입력해도 영상에 자동 접속하지 않습니다.</p>
      <button type="submit" disabled={busy || loading || list?.writesEnabled !== true}>{busy ? "처리 중…" : "새 목록에 저장"}</button>
    </form>}
  </main>;
}
