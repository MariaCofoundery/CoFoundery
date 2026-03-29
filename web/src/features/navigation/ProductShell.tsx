"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  displayName: string | null;
  matchingHref: string;
  workbookHref: string;
};

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

type NavigationOverride = {
  matchingHref?: string;
  workbookHref?: string;
} | null;

const ProductNavigationOverrideContext = createContext<
  ((override: NavigationOverride) => void) | null
>(null);

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

function normalizeDisplayName(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Profil";
}

export function ProductShell({
  children,
  hasFounder,
  hasAdvisor,
  displayName,
  matchingHref,
  workbookHref,
}: Props) {
  const pathname = usePathname();
  const [navigationOverride, setNavigationOverride] = useState<NavigationOverride>(null);
  const resolvedMatchingHref = navigationOverride?.matchingHref ?? matchingHref;
  const resolvedWorkbookHref = navigationOverride?.workbookHref ?? workbookHref;
  const navigationItems: NavigationItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      isActive: (currentPathname) => currentPathname === "/dashboard",
    },
    {
      href: "/me/report",
      label: "Mein Report",
      isActive: (currentPathname) => currentPathname.startsWith("/me/"),
    },
    {
      href: resolvedMatchingHref,
      label: "Matching-Report",
      isActive: (currentPathname) =>
        currentPathname.startsWith("/report/") || currentPathname === "/invite/new",
    },
    {
      href: resolvedWorkbookHref,
      label: "Workbook",
      isActive: (currentPathname) => currentPathname.startsWith("/founder-alignment/"),
    },
  ];

  if (!isProductChromePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <ProductNavigationOverrideContext.Provider value={setNavigationOverride}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3 md:px-10 xl:px-12">
            <div className="flex min-w-0 flex-wrap items-center gap-4 md:gap-6">
              <Link
                href="/dashboard"
                className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/40"
                aria-label="Zum Dashboard"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cofoundery-align-logo.svg"
                  alt="CoFoundery Align"
                  width={200}
                  height={70}
                  className="block h-8 w-auto shrink-0 md:h-9"
                  draggable={false}
                />
              </Link>

              <nav
                aria-label="Produktnavigation"
                className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1"
              >
                {navigationItems.map((item) => (
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

              <ProfileMenu displayName={displayName} />
            </div>
          </div>
        </header>

        {children}
      </div>
    </ProductNavigationOverrideContext.Provider>
  );
}

export function ProductNavigationOverride({
  matchingHref,
  workbookHref,
}: {
  matchingHref?: string | null;
  workbookHref?: string | null;
}) {
  const setOverride = useContext(ProductNavigationOverrideContext);

  useEffect(() => {
    if (!setOverride) return;

    setOverride({
      matchingHref: matchingHref ?? undefined,
      workbookHref: workbookHref ?? undefined,
    });

    return () => {
      setOverride(null);
    };
  }, [matchingHref, setOverride, workbookHref]);

  return null;
}

function ProfileMenu({ displayName }: { displayName: string | null }) {
  const normalizedName = normalizeDisplayName(displayName);
  const avatarLabel = normalizedName.charAt(0).toUpperCase();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onScroll = () => setIsOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          {avatarLabel}
        </span>
        <span className="hidden max-w-28 truncate md:inline">{normalizedName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 8l4.5 4 4.5-4" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/90 bg-white/96 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur-xl"
          role="menu"
        >
          <Link
            href="/dashboard#dashboard-block-profile-data"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            Profil bearbeiten
          </Link>
          <Link
            href="/dashboard#dashboard-block-account"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            Account
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              role="menuitem"
            >
              Logout
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
