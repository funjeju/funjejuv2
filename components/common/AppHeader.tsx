import Link from "next/link";
import { navigationItems } from "@/constants/navigation";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-bg-primary/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-normal">
          FunJeju
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-bg-secondary hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
