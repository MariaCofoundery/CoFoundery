"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import { ProductFeedbackEntry } from "@/features/feedback/ProductFeedbackEntry";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  displayName: string | null;
  matchingHref: string;
  workbookHref: string;
  matchingItems: ProductNavigationContextItem[];
  workbookItems: ProductNavigationContextItem[];
};

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

type ProductNavigationContextItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  avatarLabel: string;
  avatarUrl: string | null;
  statusKind: "ready" | "in_progress" | "completed";
  sortDate: string;
};

type NavigationOverride = {
  matchingHref?: string;
  workbookHref?: string;
  feedbackInvitationId?: string | null;
  activeView?: "founder" | "advisor";
  contextLabel?: string | null;
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

function navMenuTriggerClassName(active: boolean) {
  return `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
    active
      ? "bg-[color:var(--brand-primary)]/18 text-slate-950"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function normalizeDisplayName(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Profil";
}

function navigationContextStorageKey(label: string) {
  return `product-nav:last-context:${label}`;
}

export function ProductShell({
  children,
  hasFounder,
  hasAdvisor,
  displayName,
  matchingHref,
  workbookHref,
  matchingItems,
  workbookItems,
}: Props) {
  const pathname = usePathname();
  const [navigationOverride, setNavigationOverride] = useState<NavigationOverride>(null);
  const resolvedMatchingHref = navigationOverride?.matchingHref ?? matchingHref;
  const resolvedWorkbookHref = navigationOverride?.workbookHref ?? workbookHref;
  const resolvedFeedbackInvitationId = navigationOverride?.feedbackInvitationId ?? null;
  const resolvedActiveView =
    navigationOverride?.activeView ?? (pathname.startsWith("/advisor/") ? "advisor" : "founder");
  const dashboardHref = resolvedActiveView === "advisor" ? "/advisor/dashboard" : "/dashboard";
  const navigationItems: NavigationItem[] = [
    {
      href: dashboardHref,
      label: "Dashboard",
      isActive: (currentPathname) =>
        resolvedActiveView === "advisor"
          ? currentPathname === "/advisor/dashboard"
          : currentPathname === "/dashboard",
    },
  ];
  if (resolvedActiveView !== "advisor") {
    navigationItems.push({
      href: "/me/report",
      label: "Mein Report",
      isActive: (currentPathname) => currentPathname.startsWith("/me/"),
    });
  }

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
                href={dashboardHref}
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
                {resolvedActiveView === "advisor" ? (
                  <>
                    <Link
                      href={resolvedWorkbookHref}
                      className={navLinkClassName(pathname.startsWith("/founder-alignment/"))}
                    >
                      Workbook
                    </Link>
                    <Link
                      href={resolvedMatchingHref}
                      className={navLinkClassName(pathname.startsWith("/advisor/report"))}
                    >
                      Report
                    </Link>
                  </>
                ) : (
                  <>
                    <NavigationContextMenu
                      label="Matching-Report"
                      directHref={resolvedMatchingHref}
                      items={matchingItems}
                      isActive={
                        pathname.startsWith("/report/") ||
                        pathname.startsWith("/advisor/report") ||
                        pathname === "/invite/new"
                      }
                      currentHref={resolvedMatchingHref}
                    />
                    <NavigationContextMenu
                      label="Workbook"
                      directHref={resolvedWorkbookHref}
                      items={workbookItems}
                      isActive={pathname.startsWith("/founder-alignment/")}
                      currentHref={resolvedWorkbookHref}
                    />
                  </>
                )}
                <ProductFeedbackEntry
                  source="nav"
                  invitationId={resolvedFeedbackInvitationId}
                  variant="nav"
                  triggerClassName={navLinkClassName(false)}
                />
              </nav>
            </div>

            <div className="flex items-center justify-end gap-3">
              <DashboardViewSwitch
                activeView={resolvedActiveView}
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

function NavigationContextMenu({
  label,
  directHref,
  items,
  isActive,
  currentHref,
}: {
  label: string;
  directHref: string;
  items: ProductNavigationContextItem[];
  isActive: boolean;
  currentHref: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastOpenedHref, setLastOpenedHref] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      return window.localStorage.getItem(navigationContextStorageKey(label));
    } catch {
      return null;
    }
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hasMenu = items.length > 1;
  const menuItems = items.length > 0 ? items : [];

  useEffect(() => {
    if (!isActive || !currentHref || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(navigationContextStorageKey(label), currentHref);
    } catch {
      // ignore localStorage issues
    }
  }, [currentHref, isActive, label]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const onScroll = () => setIsOpen(false);

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen]);

  if (!hasMenu) {
    return (
      <Link href={directHref} className={navLinkClassName(isActive)}>
        {label}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={navMenuTriggerClassName(isActive || isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M5.5 7.75 10 12.25l4.5-4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-[24px] border border-slate-200/80 bg-white/96 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        >
          <div className="border-b border-slate-200/80 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {label === "Workbook"
                ? "Waehle den Founder-Kontext, in dem du weiterarbeiten willst."
                : "Waehle den Founder-Kontext, dessen Report du oeffnen willst."}
            </p>
          </div>

          <div className="max-h-[24rem] space-y-1 overflow-y-auto px-1 py-2">
            {menuItems
              .slice()
              .sort((left, right) => {
                const leftIsCurrent = currentHref === left.href;
                const rightIsCurrent = currentHref === right.href;
                if (leftIsCurrent !== rightIsCurrent) {
                  return leftIsCurrent ? -1 : 1;
                }

                const leftIsLastOpened = lastOpenedHref === left.href;
                const rightIsLastOpened = lastOpenedHref === right.href;
                if (leftIsLastOpened !== rightIsLastOpened) {
                  return leftIsLastOpened ? -1 : 1;
                }

                if (label === "Workbook") {
                  const workbookPriority: Record<ProductNavigationContextItem["statusKind"], number> = {
                    in_progress: 0,
                    ready: 1,
                    completed: 2,
                  };
                  const leftPriority = workbookPriority[left.statusKind];
                  const rightPriority = workbookPriority[right.statusKind];
                  if (leftPriority !== rightPriority) {
                    return leftPriority - rightPriority;
                  }
                }

                if (left.sortDate !== right.sortDate) {
                  return right.sortDate.localeCompare(left.sortDate, "de");
                }

                return left.title.localeCompare(right.title, "de");
              })
              .map((item) => {
              const isCurrent = currentHref === item.href;
              const isLastOpened = !isCurrent && lastOpenedHref === item.href;

              return (
                <Link
                  key={`${label}-${item.id}`}
                  href={item.href}
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    setLastOpenedHref(item.href);
                    if (typeof window !== "undefined") {
                      try {
                        window.localStorage.setItem(
                          navigationContextStorageKey(label),
                          item.href
                        );
                      } catch {
                        // ignore localStorage issues
                      }
                    }
                  }}
                  className={`flex items-start gap-3 rounded-[18px] px-3 py-3 transition ${
                    isCurrent
                      ? "bg-slate-100/95"
                      : "hover:bg-slate-50/95"
                  }`}
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.avatarUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      item.avatarLabel
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{item.title}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        {item.statusLabel}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-700">
                          Aktuell
                        </span>
                      ) : isLastOpened ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                          Zuletzt geoeffnet
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-xs leading-5 text-slate-500">
                      {item.subtitle}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProductNavigationOverride({
  matchingHref,
  workbookHref,
  feedbackInvitationId,
  activeView,
  contextLabel,
}: {
  matchingHref?: string | null;
  workbookHref?: string | null;
  feedbackInvitationId?: string | null;
  activeView?: "founder" | "advisor";
  contextLabel?: string | null;
}) {
  const setOverride = useContext(ProductNavigationOverrideContext);

  useEffect(() => {
    if (!setOverride) return;

    setOverride({
      matchingHref: matchingHref ?? undefined,
      workbookHref: workbookHref ?? undefined,
      feedbackInvitationId: feedbackInvitationId ?? undefined,
      activeView: activeView ?? undefined,
      contextLabel: contextLabel ?? undefined,
    });

    return () => {
      setOverride(null);
    };
  }, [activeView, contextLabel, feedbackInvitationId, matchingHref, setOverride, workbookHref]);

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
