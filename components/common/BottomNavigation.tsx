import Link from "next/link";
import { navigationItems } from "@/constants/navigation";

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-bg-primary/95 px-3 py-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 flex-col items-center justify-center rounded-card px-2 text-center text-xs font-semibold text-text-secondary"
          >
            <span className="text-base" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mt-1">{item.shortLabel}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
