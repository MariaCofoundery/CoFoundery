"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  displayName: string | null;
};

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/me/report",
    label: "Mein Profil",
    isActive: (pathname) => pathname.startsWith("/me/"),
  },
  {
    href: "/dashboard#dashboard-block-active",
    label: "Matching",
    isActive: (pathname) => pathname.startsWith("/report/") || pathname === "/invite/new",
  },
  {
    href: "/dashboard#dashboard-status-workbook",
    label: "Workbook",
    isActive: (pathname) => pathname.startsWith("/founder-alignment/"),
  },
];

function isProductChromePath(pathname: string) {
  if (!pathname) return false;
  if (pathname.startsWith("/debug")) return false;
  if (pathname === "/login") return false;
  if (pathname === "/start") return true;

  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/advisor/") ||
    pathname.startsWith("/me/") ||
    pathname.startsWith("/report/") ||
    pathname.startsWith("/founder-alignment/") ||
    pathname === "/invite/new"
  );
}

function navLinkClassName(active: boolean) {
  return `rounded-full px-3 py-2 text-sm font-medium transition ${
    active
      ? "bg-[color:var(--brand-primary)]/18 text-slate-950"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export function ProductShell({
  children,
  hasFounder,
  hasAdvisor,
  displayName,
}: Props) {
  const pathname = usePathname();

  if (!isProductChromePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3 md:px-10 xl:px-12">
          <div className="flex min-w-0 flex-wrap items-center gap-4 md:gap-6">
            <Link href="/dashboard" className="min-w-0">
              <span className="block truncate text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                CoFoundery Align
              </span>
            </Link>

            <nav
              aria-label="Produktnavigation"
              className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1"
            >
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={navLinkClassName(item.isActive(pathname))}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <DashboardViewSwitch
              activeView={pathname.startsWith("/advisor/") ? "advisor" : "founder"}
              hasFounder={hasFounder}
              hasAdvisor={hasAdvisor}
            />

            <Link
              href="/me/base"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Profil / Account
            </Link>

            {displayName ? (
              <span className="hidden rounded-full border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:inline-flex">
                {displayName}
              </span>
            ) : null}

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
