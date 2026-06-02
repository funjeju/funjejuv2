import { CctvList } from "@/components/cctv/CctvList";
import { mockCctvs } from "@/constants/mock-cctvs";

export default function CctvPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-ocean-blue">CCTV 허브</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">제주 실시간 CCTV</h1>
            <p className="mt-2 max-w-2xl leading-7 text-text-secondary">
              현재 단계는 Mock 데이터 기반 초안입니다. 실제 CCTV 스트림과 채팅 연결은 이후 Firebase/API 구조가 준비된 뒤 연결합니다.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-border-soft bg-bg-secondary p-1 text-sm font-semibold">
            <button className="rounded-full bg-text-primary px-4 py-2 text-bg-primary">목록형</button>
            <button className="rounded-full px-4 py-2 text-text-secondary">지도형</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {["전체", "해변", "오름"].map((filter) => (
          <button
            key={filter}
            className="min-h-11 rounded-full border border-border-soft bg-bg-primary px-4 text-sm font-semibold text-text-primary"
          >
            {filter}
          </button>
        ))}
      </section>

      <CctvList cctvs={mockCctvs} />
    </div>
  );
}
