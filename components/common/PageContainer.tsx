import type { HTMLAttributes, ReactNode } from "react";

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function PageContainer({ className = "", children, ...props }: PageContainerProps) {
  const classes = ["mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
