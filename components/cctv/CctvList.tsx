import { CctvCard } from "@/components/cctv/CctvCard";
import type { Cctv } from "@/types/cctv";

type CctvListProps = {
  cctvs: Cctv[];
};

export function CctvList({ cctvs }: CctvListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cctvs.map((cctv) => (
        <CctvCard key={cctv.id} cctv={cctv} />
      ))}
    </div>
  );
}
