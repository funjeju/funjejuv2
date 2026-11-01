import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { lookupCctvById } from "@/lib/firestore-cctv-server";
import { cctvSourceRevision } from "@/lib/cctv-review";
import { loadJejusiCandidateCatalog } from "@/lib/cctv-candidate-catalog-server";
import { previewCandidateComparison } from "@/lib/cctv-candidate-preview";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "후보 주소 비교 · 관리자 전용",
  robots: { index: false, follow: false },
};

/** Read-only isolated comparison: no players, source requests, publication or writes.
 * Production is excluded independently of middleware and query parameters.
 */
export default async function CctvSourcePreviewPage() {
  const isolated = process.env.VERCEL_ENV === "preview" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development");
  if (!isolated) notFound();
  const secret = process.env.ADMIN_SECRET;
  const auth = (await cookies()).get("admin_auth")?.value;
  if (!secret || !auth || auth !== secret) redirect("/admin/login");

  const loaded = loadJejusiCandidateCatalog();
  if (loaded.state !== "ready") return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 text-[#172524]">
      <Link href="/admin/cctv" className="text-sm underline">← 기존 CCTV 관리</Link>
      <h1 className="text-2xl font-black">비공개 후보 목록 연결 대기</h1>
      <p role="status">{loaded.state === "missing" ? "이 preview에 비공개 후보 데이터가 아직 설정되지 않았습니다." : "후보 데이터 형식 검사를 통과하지 못했습니다. 원본 값을 노출하지 않고 적용을 중단했습니다."}</p>
      <p className="text-sm leading-6">목록은 서버 전용 설정에서 불러옵니다. 공개 저장소·브라우저 번들에 원본 파일을 넣지 않습니다. 현재 카메라를 조회하거나 변경하지 않았으며 영상 요청도 하지 않았습니다.</p>
    </div>
  );
  const { catalog } = loaded;
  const comparisons = await Promise.all(catalog.candidates.map(async candidate => {
    const lookup = candidate.existingId ? await lookupCctvById(candidate.existingId) : { state: "unmapped" as const };
    const current = lookup.state === "found" ? {
      id: lookup.entry.id,
      name: lookup.entry.name,
      originUrl: lookup.entry.originUrl,
      sourceRevision: cctvSourceRevision(lookup.entry),
    } : null;
    return { lookupState: lookup.state, ...previewCandidateComparison(catalog, candidate.sourceKey, current) };
  }));
  const ordered = [...comparisons].sort((a, b) =>
    Number(b.candidate.existingId === "gimnyeong") - Number(a.candidate.existingId === "gimnyeong"));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-[#172524]">
      <header className="space-y-3">
        <Link href="/admin/cctv" className="text-sm underline">← 기존 CCTV 관리</Link>
        <p className="text-xs font-bold tracking-widest">SOURCE REVIEW · READ ONLY</p>
        <h1 className="text-3xl font-black tracking-tight">새 주소와 기존 카메라 비교</h1>
        <p className="text-sm leading-6">제주시 제공 자료의 HTTPS 후보 19개를 기존 ID에 잠정 연결했습니다. 아래 주소는 운영 설정을 바꾸지 않는 비교 데이터입니다. 손상된 원문의 장소명을 복구하거나 동일 장면을 확인한 것은 아닙니다.</p>
      </header>
      <section role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6">
        <h2 className="font-bold">주소 연결 준비됨 · 실제 재생은 검증 대기</h2>
        <p>김녕은 기존 <code>gimnyeong</code> 기록과 비공개 자료의 후보를 비교합니다. 기존 HTTP 뷰어는 서버에 저장된 옛 원본을 사용합니다. 새 HTTPS 주소를 쓰려면 실제 플레이어 입력까지 바꿔야 하며, 주소 표시만 바꾸는 것으로 해결되지 않습니다.</p>
        <p className="mt-2">이 화면에는 영상 플레이어와 원본 링크를 넣지 않았습니다. 이전 접근 제한을 다른 주소·브라우저·프록시로 우회하지 않습니다. 재생 허용과 장소 동일성을 확인하기 전에는 후보를 활성화하지 않습니다.</p>
      </section>
      <div className="space-y-4">
        {ordered.map(({ candidate, current, plannedTarget, lookupState, identityWarning }) => (
          <article key={candidate.sourceKey} id={`candidate-${candidate.sourceId}`} className="rounded-2xl border border-[#172524]/20 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-[#59675e]">{candidate.sourceKey} → {candidate.existingId}</p><h2 className="mt-1 text-xl font-bold">{current?.name ?? candidate.trustedExistingDisplayName}</h2></div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">미검증 · 운영 미반영</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
              <dt className="font-bold">기존 기록</dt><dd>{lookupState === "found" ? "읽기 전용으로 확인 · 현재 주소와 공개 상태 유지" : lookupState === "missing" ? "현재 문서 없음 · 신규 생성하지 않음" : lookupState === "unmapped" ? "기존 ID 연결 대기 · 조회하지 않음" : "현재 목록 조회 실패 · 없는 카메라로 판단하지 않음"}</dd>
              <dt className="font-bold">후보 HTTPS 입력</dt><dd><code className="break-all text-xs">{plannedTarget.streamProxyUrl}</code><p className="mt-1 text-xs text-[#59675e]">향후 검증된 경우 기존 HLS 플레이어에 전달할 입력입니다. 현재 연결하거나 자동 요청하지 않습니다.</p></dd>
              <dt className="font-bold">장소 동일성</dt><dd>{identityWarning}{candidate.columnsShifted && <p className="mt-1 font-semibold">원본 CSV의 열 이동도 있어 추가 확인이 필요합니다.</p>}</dd>
              <dt className="font-bold">현재 소스 지문</dt><dd className="break-all font-mono text-xs">{current?.sourceRevision ?? "현재 소스를 읽지 못해 생성하지 않음"}</dd>
              <dt className="font-bold">자료 출처</dt><dd className="break-all text-xs">사용자 제공 {candidate.provenance.filename} · {candidate.provenance.line}행<br />파일 SHA-256: {candidate.provenance.sha256}<br />제주시 월파감시 자료로 제공됨. 공식 제공처의 현재 동작·재사용 허용 여부를 독립 확인한 것은 아닙니다.</dd>
            </dl>
            <button type="button" disabled className="mt-4 rounded-full bg-[#e9ede6] px-4 py-2 text-sm font-semibold text-[#59675e]">재생 검증 대기 · 운영 적용 불가</button>
          </article>
        ))}
      </div>
      <section className="rounded-2xl bg-[#172524] p-5 text-sm leading-6 text-white">
        <h2 className="font-bold">검증 후 적용 순서</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>접근 제한이 정상적으로 해소된 경로와 장소·카메라 동일성을 확인합니다.</li>
          <li>격리된 플레이어에서 HTTPS 원본·하위 재생목록·조각의 CORS와 실제 프레임·시간 진행을 확인합니다. 원본 서버에 통계 이벤트를 보내지 않습니다.</li>
          <li>현재 기록을 다시 읽어 ID·소스 지문·문서 버전이 바뀌지 않았는지 확인합니다.</li>
          <li>기존 주소·이력과 카메라 ID를 보존하고, 별도 검토된 적용 절차로 한 항목부터 반영합니다. 이 비교 화면은 저장·승인 기능이 없습니다.</li>
        </ol>
      </section>
    </div>
  );
}
