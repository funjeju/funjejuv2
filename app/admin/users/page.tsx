"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { toggleBusiness } from "@/lib/feed";

type UserRow = {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  isBusiness: boolean;
  ctaData?: { text: string; url: string };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, "users"), orderBy("displayName"), limit(100))
      );
      setUsers(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName ?? "(이름 없음)",
            email: data.email,
            photoURL: data.photoURL,
            isBusiness: !!data.isBusiness,
            ctaData: data.ctaData,
          };
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">👥 사용자 관리</h1>
        <p className="text-sm text-text-secondary">비즈니스 회원 승인/해제</p>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-jeju-green/10 px-4 py-3 text-sm font-semibold text-jeju-green border border-jeju-green/20">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        <div className="border-b border-border-soft px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">사용자 목록 (총 {users.length}명)</h2>
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border-soft transition-colors"
          >
            🔄 새로고침
          </button>
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
            {users.map((u) => (
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
                  <p className="font-mono text-[9px] text-text-secondary truncate">{u.uid}</p>
                  {u.ctaData && (
                    <p className="mt-0.5 text-[10px] text-brand-orange">
                      CTA: "{u.ctaData.text}" → {u.ctaData.url}
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
