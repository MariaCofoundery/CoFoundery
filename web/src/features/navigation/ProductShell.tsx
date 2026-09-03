"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import { IncomingRequestBadge } from "@/features/discovery/IncomingRequestBadge";
import { ProductFeedbackEntry } from "@/features/feedback/ProductFeedbackEntry";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { ResearchConsentNotice } from "@/features/research/ResearchConsentNotice";
import { configureResearchConsentState, type ResearchConsentState } from "@/features/research/client";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasNetwork: boolean;
  displayName: string | null;
  incomingOpenRequestCount: number;
  researchConsentState: ResearchConsentState;
};

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
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

function navLinkClassName(active: boolean) {
  return `rounded-full px-3 py-2 text-sm font-medium transition ${
    active
      ? "bg-[color:var(--brand-primary)]/18 text-slate-950"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function discoveryCtaClassName(active: boolean) {
  return `rounded-full px-3 py-2 text-sm font-semibold transition ${
    active
      ? "bg-[color:var(--brand-primary)] text-slate-950"
      : "bg-[color:var(--brand-primary)]/80 text-slate-950 hover:bg-[color:var(--brand-primary)]"
  }`;
}

function normalizeDisplayName(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function writeLocaleCookie(locale: AppLocale) {
  document.cookie = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "path=/",
    "max-age=31536000",
    "samesite=lax",
  ].join("; ");
}

export function ProductShell({
  children,
  hasFounder,
  hasAdvisor,
  hasNetwork,
  displayName,
  incomingOpenRequestCount,
  researchConsentState: initialResearchConsentState,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("navigation");
  const [navigationOverride, setNavigationOverride] = useState<NavigationOverride>(null);
  const [researchConsentState, setResearchConsentState] = useState(initialResearchConsentState);
  configureResearchConsentState(researchConsentState);
  const resolvedFeedbackInvitationId = navigationOverride?.feedbackInvitationId ?? null;
  const resolvedActiveView =
    navigationOverride?.activeView ?? (pathname.startsWith("/advisor/") ? "advisor" : "founder");
  const advisorFallbackHref = "/advisor/dashboard#advisor-teams";
  const resolvedMatchingHref =
    resolvedActiveView === "advisor"
      ? navigationOverride?.matchingHref ?? advisorFallbackHref
      : navigationOverride?.matchingHref ?? "/connections";
  const resolvedWorkbookHref =
    resolvedActiveView === "advisor"
      ? navigationOverride?.workbookHref ?? advisorFallbackHref
      : navigationOverride?.workbookHref ?? "/connections";
  const isNetworkOnly = hasNetwork && !hasFounder && !hasAdvisor;
  const dashboardHref = isNetworkOnly ? "/network" : resolvedActiveView === "advisor" ? "/advisor/dashboard" : "/dashboard";
  const navigationItems: NavigationItem[] = isNetworkOnly ? [] : [
    {
      href: dashboardHref,
      label: t("dashboard"),
      isActive: (currentPathname) =>
        resolvedActiveView === "advisor"
          ? currentPathname === "/advisor/dashboard"
          : currentPathname === "/dashboard",
    },
  ];

  useEffect(() => {
    if (searchParams.get("debug") !== "1" || resolvedActiveView !== "advisor") {
      return;
    }

    console.info("[advisor-report-debug] nav_links", {
      pathname,
      dashboardHref,
      workbookHref: resolvedWorkbookHref,
      reportHref: resolvedMatchingHref,
    });
  }, [dashboardHref, pathname, resolvedActiveView, resolvedMatchingHref, resolvedWorkbookHref, searchParams]);

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
                aria-label={t("logoLabel")}
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
                aria-label={t("navLabel")}
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
                    {hasNetwork ? <Link href="/network" className={navLinkClassName(pathname.startsWith("/network"))}>{t("network")}</Link> : null}
                    <Link href={resolvedMatchingHref} className={navLinkClassName(pathname.startsWith("/advisor/report"))}>{t("advisorConnections")}</Link>
                  </>
                ) : (
                  <>
                    {hasNetwork ? <Link href="/network" className={navLinkClassName(pathname.startsWith("/network"))}>{t("network")}</Link> : null}
                    {hasFounder ? <><Link
                      href="/discovery"
                      className={`${discoveryCtaClassName(pathname.startsWith("/discovery"))} inline-flex items-center gap-2`}
                    >
                      <span>{t("discovery")}</span>
                      <IncomingRequestBadge count={incomingOpenRequestCount} />
                    </Link>
                    <Link
                      href="/connections"
                      className={navLinkClassName(
                        pathname === "/connections" || pathname.startsWith("/teams/")
                      )}
                    >
                      {t("connections")}
                    </Link>
                    </> : null}
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center justify-end gap-3">
              <ProductFeedbackEntry
                source="nav"
                invitationId={resolvedFeedbackInvitationId}
                variant="nav"
                triggerClassName={navLinkClassName(false)}
              />
              <DashboardViewSwitch
                activeView={resolvedActiveView}
                hasFounder={hasFounder}
                hasAdvisor={hasAdvisor}
              />

              <LanguageSwitcher />
              <ProfileMenu displayName={displayName} networkOnly={isNetworkOnly} />
            </div>
          </div>
        </header>

        {children}
        {hasFounder && researchConsentState === "undecided" ? (
          <ResearchConsentNotice onDecision={setResearchConsentState} />
        ) : null}
      </div>
    </ProductNavigationOverrideContext.Provider>
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

function ProfileMenu({ displayName, networkOnly }: { displayName: string | null; networkOnly: boolean }) {
  const t = useTranslations("navigation");
  const normalizedName = normalizeDisplayName(displayName) || t("profileFallback");
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
            href={networkOnly ? "/network/profile" : "/dashboard#dashboard-block-profile-data"}
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            {networkOnly ? t("editNetworkProfile") : t("editProfile")}
          </Link>
          {!networkOnly ? <Link
            href="/dashboard#dashboard-block-account"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            {t("account")}
          </Link> : null}
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              role="menuitem"
            >
              {t("logout")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("common");

  function selectLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    writeLocaleCookie(nextLocale);
    router.refresh();
  }

  return (
    <div
      className="flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs font-medium text-slate-600"
      aria-label={t("language.switchLabel")}
    >
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => selectLocale(item)}
          className={`rounded-full px-2.5 py-1.5 transition ${
            locale === item ? "bg-slate-900 text-white" : "hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-pressed={locale === item}
        >
          {t(`language.${item}`)}
        </button>
      ))}
    </div>
  );
}
