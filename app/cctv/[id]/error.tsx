"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CctvDetailError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <section role="alert" className="mx-auto my-12 max-w-xl rounded-2xl border border-border-soft bg-bg-card p-8 text-center">
      <h1 className="text-lg font-bold text-text-primary">카메라 정보를 잠시 확인할 수 없어요</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">정보를 불러오는 연결에 문제가 생겼어요. 카메라의 고장이나 비활성 상태로 판정한 것은 아닙니다. 잠시 후 다시 확인해 주세요.</p>
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={() => { router.refresh(); reset(); }} className="rounded-full bg-brand-orange px-5 py-2 text-sm font-bold text-white">다시 확인</button>
        <Link href="/cctv" className="rounded-full border border-border-soft px-5 py-2 text-sm">목록으로</Link>
      </div>
    </section>
  );
}
