import type { Cctv } from "@/types/cctv";
import { SaveButton } from "@/components/common/SaveButton";
import { HlsMiniPlayer } from "@/components/cctv/HlsMiniPlayer";

type CctvCardProps = { cctv: Cctv };

export function CctvCard({ cctv }: CctvCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]">
      <HlsMiniPlayer id={cctv.id} proxyUrl={cctv.streamProxyUrl} name={cctv.name} />
      <div className="p-3">
        <p className="text-[10px] font-medium text-ocean-blue">{cctv.region}</p>
        <h3 className="mt-0.5 text-sm font-bold text-text-primary">{cctv.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{cctv.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
            {cctv.category}
          </span>
          <SaveButton id={cctv.id} />
        </div>
      </div>
    </div>
  );
}
