"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Diagnose", href: "/diagnostic" },
];

export default function AppShell({
  studentName,
  children,
}: {
  studentName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-2 focus-visible:top-2 focus-visible:z-10 focus-visible:rounded-md focus-visible:bg-surface focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          ReasonTrace
        </span>
        <span className="text-sm text-muted">{studentName}</span>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <nav
          aria-label="Main"
          className="shrink-0 border-b border-border bg-surface px-3 py-2 sm:w-48 sm:border-b-0 sm:border-r sm:py-4"
        >
          <ul className="flex flex-row gap-1 sm:flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-background ${
                      isActive ? "font-medium text-foreground bg-background" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
