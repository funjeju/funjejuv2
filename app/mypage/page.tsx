"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCctvFavorite } from "@/hooks/useCctvFavorite";
import { useCctvs } from "@/hooks/useCctvs";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
export default function MyPage() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { favoriteIds } = useCctvFavorite();
  const { cctvs } = useCctvs();
  if (loading) return <p className="p-6">불러오는 중…</p>;
  if (!user) return <div className="p-6"><h1 className="text-xl font-bold">마이페이지</h1><button onClick={signInWithGoogle} className="mt-4 rounded bg-brand-navy px-4 py-2 text-white">Google로 로그인</button></div>;
  return <div className="mx-auto max-w-screen-xl space-y-5 p-4">
    <h1 className="text-xl font-bold">마이페이지</h1>
    <p>{user.displayName || user.email}</p>
    <button onClick={logout}>로그아웃</button>
    <div className="flex gap-4"><Link href="/cctv">CCTV 목록</Link><Link href="/cctv/multiview">저장한 멀티뷰 조합 보기</Link></div>
    <h2 className="text-lg font-bold">즐겨찾는 CCTV</h2>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cctvs.filter(c => favoriteIds.has(c.id)).map(c => <div key={c.id} className="rounded-xl border border-border-soft p-3">
      <Link href={`/cctv/${c.id}`} className="font-bold">{c.name}</Link>
      <CctvFavoriteButton id={c.id} />
    </div>)}</div>
    {favoriteIds.size === 0 && <p>즐겨찾는 CCTV를 목록에서 추가하세요.</p>}
    {user.email === "naggu1999@gmail.com" && <Link href="/admin/cctv">CCTV 관리</Link>}
  </div>;
}
