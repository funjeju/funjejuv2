import Link from "next/link";
import type { Cctv } from "@/types/cctv";
import { SaveButton } from "@/components/common/SaveButton";

type CctvCardProps = { cctv: Cctv };

export function CctvCard({ cctv }: CctvCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]">
      <Link href={`/cctv/${cctv.id}`} className="block">
        <div className="relative aspect-video bg-gray-800">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400/30 to-teal-400/30 text-5xl transition-transform group-hover:scale-105">
            🏝️
          </div>
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-live-red px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-3 py-2">
            <p className="text-xs font-semibold text-white">👥 {Math.floor(Math.random() * 300 + 80)}명 시청 중</p>
          </div>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-medium text-ocean-blue">{cctv.region}</p>
          <h3 className="mt-0.5 text-sm font-bold text-text-primary">{cctv.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{cctv.description}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between px-3 pb-3">
        <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {cctv.category}
        </span>
        <SaveButton id={cctv.id} />
      </div>
    </div>
  );
}
