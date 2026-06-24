"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { toggleBusiness } from "@/lib/feed";

type UserRow = {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  isBusiness: boolean;
  ctaData?: { text: string; url: string };
  createdAt?: number;   // 가입일 (epoch ms)
  lastSeenAt?: number;  // 최종 접속 (epoch ms)
};

const DAY = 86400000;
function tsToMs(t: unknown): number | undefined {
  const v = t as { toDate?: () => Date } | undefined;
  return v?.toDate ? v.toDate().getTime() : undefined;
}
function fmtDate(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function fmtRel(ms?: number): string {
  if (!ms) return "기록 없음";
  const diff = Date.now() - ms;
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
  if (diff < DAY) return `${Math.floor(diff / 3600000)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;
  return fmtDate(ms);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "signup">("recent");

  async function load() {
    setLoading(true);
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(query(collection(db, "users"), limit(500)));
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName ?? "(이름 없음)",
          email: data.email,
          photoURL: data.photoURL,
          isBusiness: !!data.isBusiness,
          ctaData: data.ctaData,
          createdAt: tsToMs(data.createdAt),
          lastSeenAt: tsToMs(data.lastSeenAt),
        } as UserRow;
      });
      // 최근 접속 순 (없으면 가입일)
      rows.sort((a, b) => (b.lastSeenAt ?? b.createdAt ?? 0) - (a.lastSeenAt ?? a.createdAt ?? 0));
      setUsers(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleToggle(uid: string, current: boolean) {
    try {
      await toggleBusiness(uid, !current);
      setMsg(`✅ ${current ? "비즈니스 해제" : "비즈니스 승인"} 완료`);
      setTimeout(() => setMsg(""), 2500);
      load();
    } catch (e) {
      setMsg(`❌ 실패: ${e instanceof Error ? e.message : "오류"}`);
    }
  }

  const [now] = useState(() => Date.now()); // 렌더 중 순수성 유지 (1회 고정)
  const activeToday = users.filter((u) => u.lastSeenAt && now - u.lastSeenAt < DAY).length;
  const active7d = users.filter((u) => u.lastSeenAt && now - u.lastSeenAt < 7 * DAY).length;
  const new7d = users.filter((u) => u.createdAt && now - u.createdAt < 7 * DAY).length;
  const bizCount = users.filter((u) => u.isBusiness).length;

  const sorted = [...users].sort((a, b) =>
    sortBy === "signup"
      ? (b.createdAt ?? 0) - (a.createdAt ?? 0)               // 가입일 최신순
      : (b.lastSeenAt ?? b.createdAt ?? 0) - (a.lastSeenAt ?? a.createdAt ?? 0), // 최근접속순
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">👥 사용자 관리</h1>
        <p className="text-sm text-text-secondary">가입·접속 현황 + 비즈니스 회원 승인</p>
      </div>

      {/* 요약 통계 */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "총 회원", v: users.length, c: "text-text-primary" },
          { label: "오늘 활성", v: activeToday, c: "text-jeju-green" },
          { label: "최근 7일 활성", v: active7d, c: "text-brand-navy" },
          { label: "신규 7일", v: new7d, c: "text-brand-orange" },
          { label: "비즈니스", v: bizCount, c: "text-brand-orange" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border-soft bg-bg-card p-3 text-center shadow-card">
            <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
            <p className="text-[10px] font-medium text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-jeju-green/10 px-4 py-3 text-sm font-semibold text-jeju-green border border-jeju-green/20">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        <div className="border-b border-border-soft px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">사용자 목록 (총 {users.length}명)</h2>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-border-soft text-[11px] font-semibold">
              {([["recent", "최근접속순"], ["signup", "가입일순"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSortBy(k)}
                  className={`px-2.5 py-1.5 transition-colors ${sortBy === k ? "bg-brand-navy text-white" : "bg-bg-card text-text-secondary hover:bg-bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              className="rounded-full bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border-soft transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">👥</p>
            <p className="mt-3 text-sm font-bold text-text-primary">아직 사용자가 없어요</p>
            <p className="text-xs text-text-secondary">Google 로그인한 사용자가 자동으로 여기 나타납니다</p>
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {sorted.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-secondary">
                  {u.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-text-secondary">
                      {u.displayName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary truncate">{u.displayName}</p>
                    {u.isBusiness && (
                      <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[9px] font-bold text-brand-orange">
                        BIZ
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-secondary truncate">{u.email}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-secondary">
                    <span>📅 가입 {fmtDate(u.createdAt)}</span>
                    <span className={u.lastSeenAt && now - u.lastSeenAt < DAY ? "font-bold text-jeju-green" : ""}>
                      🕐 최근접속 {fmtRel(u.lastSeenAt)}
                    </span>
                  </div>
                  {u.ctaData && (
                    <p className="mt-0.5 text-[10px] text-brand-orange">
                      CTA: &quot;{u.ctaData.text}&quot; → {u.ctaData.url}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(u.uid, u.isBusiness)}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                    u.isBusiness
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-brand-orange text-white hover:bg-brand-orange/90",
                  ].join(" ")}
                >
                  {u.isBusiness ? "비즈니스 해제" : "비즈니스 승인"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
