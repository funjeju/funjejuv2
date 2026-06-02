import type { Cctv } from "@/types/cctv";

type CctvCardProps = {
  cctv: Cctv;
};

export function CctvCard({ cctv }: CctvCardProps) {
  return (
    <article className="overflow-hidden rounded-card border border-border-soft bg-bg-primary shadow-soft">
      <div className="relative aspect-[4/3] bg-bg-secondary">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ocean-blue/30 via-bg-secondary to-sunset-orange/30">
          <span className="rounded-full bg-bg-primary/90 px-3 py-1 text-xs font-semibold text-text-secondary">
            Mock thumbnail
          </span>
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-forest-green px-3 py-1 text-xs font-semibold text-bg-primary">
          {cctv.status}
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold text-ocean-blue">{cctv.region}</p>
          <h3 className="mt-1 text-xl font-semibold">{cctv.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{cctv.description}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs font-semibold text-text-secondary">
            {cctv.category}
          </span>
          <button className="min-h-10 rounded-full bg-text-primary px-4 text-sm font-semibold text-bg-primary">
            저장
          </button>
        </div>
      </div>
    </article>
  );
}
