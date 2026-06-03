import { Skeleton } from "@/components/common/Skeleton";

export function LoadingScreen() {
  return (
    <div className="space-y-4 py-8" aria-live="polite" aria-busy="true">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-12 w-3/5" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
