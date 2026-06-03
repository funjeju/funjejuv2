"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin/cctv");
    } else {
      setError("비밀번호가 틀렸습니다");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-4xl">🔐</p>
          <h1 className="mt-3 text-xl font-black text-text-primary">관리자 로그인</h1>
          <p className="mt-1 text-sm text-text-secondary">FunJeju Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border-soft bg-bg-card p-6 shadow-card">
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호 입력"
            className="w-full rounded-xl border border-border-soft bg-bg-secondary px-4 py-3 text-sm outline-none focus:border-brand-orange"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-xs font-semibold text-live-red">❌ {error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
