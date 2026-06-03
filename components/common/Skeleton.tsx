import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return <div className={["animate-pulse rounded-card bg-bg-secondary/80", className].filter(Boolean).join(" ")} {...props} />;
}
