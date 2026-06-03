import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type SharedButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "orange" | "navy";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
};

type LinkButtonProps = SharedButtonProps & { href: string };
type NativeButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

function getButtonClasses(
  variant: NonNullable<SharedButtonProps["variant"]>,
  size: NonNullable<SharedButtonProps["size"]>,
  className?: string
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2";

  const variantClasses = {
    primary: "bg-brand-navy text-white hover:bg-brand-navy/90 shadow-soft",
    orange: "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-soft",
    secondary: "border border-border-soft bg-bg-card text-text-primary hover:bg-bg-secondary",
    ghost: "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
    navy: "bg-brand-navy text-white hover:bg-brand-navy/90",
  };

  const sizeClasses = {
    sm: "min-h-9 px-4 text-xs",
    md: "min-h-11 px-5 text-sm",
    lg: "min-h-13 px-6 text-base",
  };

  return [base, variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(" ");
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = getButtonClasses(variant, size, className);

  if (typeof props.href === "string") {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { href: _href, type = "button", ...buttonProps } = props;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
