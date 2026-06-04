import { CctvCard } from "@/components/cctv/CctvCard";
import type { Cctv, CctvEntry } from "@/types/cctv";

type AnyEntry = CctvEntry | Cctv;

function toEntry(c: AnyEntry): CctvEntry {
  if ("originUrl" in c) return c;
  // Cctv → CctvEntry 변환 (originUrl 없음, active=true 가정)
  return { ...c, originUrl: "", active: true };
}

export function CctvList({ cctvs }: { cctvs: AnyEntry[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cctvs.map((cctv) => (
        <CctvCard key={cctv.id} cctv={toEntry(cctv)} />
      ))}
    </div>
  );
}
