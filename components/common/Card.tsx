import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function Card({ className = "", children, ...props }: CardProps) {
  const classes = ["rounded-panel border border-border-soft bg-bg-card shadow-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
