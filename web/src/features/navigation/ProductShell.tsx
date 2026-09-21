"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import { IncomingRequestBadge } from "@/features/discovery/IncomingRequestBadge";
import { ProductFeedbackEntry } from "@/features/feedback/ProductFeedbackEntry";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { getConnectAttentionCount } from "@/features/connect/connectPresentation";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { ResearchConsentNotice } from "@/features/research/ResearchConsentNotice";
import { configureResearchConsentState, type ResearchConsentState } from "@/features/research/client";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasConnect: boolean;
  hasConnectAccount: boolean;
  displayName: string | null;
  avatarId?: string | null;
  avatarImageUrl?: string | null;
  incomingOpenRequestCount: number;
  incomingConnectContactCount: number;
  unreadConnectMessageCount: number;
  researchConsentState: ResearchConsentState;
};

/**
 * Der Zaehler an einem Bereich. Zwei Sorten, weil zwei verschiedene Dinge
 * gezaehlt werden - Vorstellungsanfragen bei Find, Kontaktanfragen und
 * ungelesene Nachrichten bei Connect.
 */
type AreaBadge = { kind: "intro" | "attention"; count: number };

type NavigationItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  badge?: AreaBadge;
  /**
   * Seiten INNERHALB dieses Bereichs.
   *
   * Sie stehen in einer zweiten Reihe und nur dann, wenn man in dem Bereich
   * ist - nicht neben den Bereichen. Genau dieses Mischen hatte die Leiste
   * vorher unlesbar gemacht: fuenf Eintraege, die drei verschiedene Sorten
   * waren. Eine eigene Ebene loest das, ohne die Seiten zu verstecken.
   */
  subItems?: { href: string; label: string; isActive: (pathname: string) => boolean }[];
};

type NavigationOverride = {
  matchingHref?: string;
  feedbackInvitationId?: string | null;
  activeView?: "founder" | "advisor";
  contextLabel?: string | null;
} | null;

const ProductNavigationOverrideContext = createContext<
  ((override: NavigationOverride) => void) | null
>(null);

/**
 * Ein Bereich in der Leiste.
 *
 * Der aktive Zustand war ein 18-Prozent-Schleier auf weissem, verschwommenem
 * Grund - und "Co-Founder finden" trug eine Dauer-CTA-Farbe, war also auch
 * dann lauter als alles andere, wenn man NICHT dort war. Das Auffaelligste
 * zeigte damit nie den aktuellen Ort. Jetzt ist genau ein Punkt gefuellt: der,
 * an dem man steht.
 */
function areaLinkClassName(active: boolean) {
  // .brand-here traegt den weichen Verlauf von Lila nach Tuerkis - dieselbe
  // Klasse wie der Hauptweg im Align-Kopfbereich, damit beide nicht
  // auseinanderlaufen. Siehe globals.css.
  // px-3 auf dem Telefon und shrink-0/whitespace-nowrap: Vier Pillen mit je
  // 16 Pixel Innenabstand sind allein 128 Pixel Luft - genau das, was am Rand
  // fehlte. Und ein Eintrag soll ganz in die naechste Zeile rutschen, nicht
  // mitten im Wort zerfallen.
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm transition sm:px-4 ${
    active ? "brand-here font-semibold" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

/** Fuer alles, was kein Bereich ist - Profil, Feedback, Konto. */
function navLinkClassName(active: boolean) {
  // Dieselbe Hervorhebung wie bei den Bereichen: "Ich bin hier" ist dieselbe
  // Aussage, egal ob der Ort ein Bereich oder ein Querschnitt ist. Vorher trug
  // Profil ein blasses Grau und war auf /profile praktisch nicht zu erkennen.
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm transition ${
    active
      ? "brand-here font-semibold"
      : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

const MOBILE_MENU_ID = "product-mobile-menu";

/**
 * Eine Zeile im aufklappbaren Menue.
 *
 * min-h-11 sind 44 Pixel - die Groesse, unter der ein Ziel mit dem Daumen
 * nicht mehr zuverlaessig zu treffen ist.
 */
const MOBILE_MENU_ROW_CLASS =
  "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900";

function MobileMenuLink({
  href,
  active,
  onNavigate,
  badge,
  indented = false,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate: () => void;
  badge?: React.ReactNode;
  indented?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      // Der aktive Zustand ist hier ruhiger als die Pillen am Rechner: Eine
      // gefuellte Zeile ueber die ganze Breite waere ein Farbband, und zu
      // praesent war genau die Beschwerde.
      className={`${MOBILE_MENU_ROW_CLASS} ${indented ? "ml-4" : ""} ${
        active ? "bg-slate-100 font-semibold text-slate-900" : ""
      }`}
    >
      <span className="min-w-0 truncate">{children}</span>
      {badge}
    </Link>
  );
}

/** Drei Striche, offen ein Kreuz. */
function MenuGlyph({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 text-slate-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      {isOpen ? (
        <path d="M5 5l10 10M15 5L5 15" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" />
      )}
    </svg>
  );
}

function ConnectAttentionBadge({ count, label }: { count: number; label: string }) {
  if (count < 1) return null;
  return <span aria-label={label} title={label} className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white">{Math.min(count, 99)}</span>;
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
  hasConnect,
  hasConnectAccount,
  displayName,
  avatarId = null,
  avatarImageUrl = null,
  incomingOpenRequestCount,
  incomingConnectContactCount,
  unreadConnectMessageCount,
  researchConsentState: initialResearchConsentState,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const [navigationOverride, setNavigationOverride] = useState<NavigationOverride>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [researchConsentState, setResearchConsentState] = useState(initialResearchConsentState);

  // Nach jedem Wechsel des Ortes zu. Ohne das bleibt das Menue nach einem
  // Antippen offen stehen und verdeckt die Seite, auf der man gerade
  // angekommen ist - der haeufigste Fehler bei aufklappbaren Menues.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  configureResearchConsentState(researchConsentState);
  const resolvedFeedbackInvitationId = navigationOverride?.feedbackInvitationId ?? null;
  const resolvedActiveView =
    navigationOverride?.activeView ?? (pathname.startsWith("/advisor/") ? "advisor" : "founder");
  const advisorFallbackHref = "/advisor/dashboard#advisor-teams";
  const resolvedMatchingHref =
    resolvedActiveView === "advisor"
      ? navigationOverride?.matchingHref ?? advisorFallbackHref
      : navigationOverride?.matchingHref ?? "/connections";
  const isConnectOnly = hasConnect && !hasFounder && !hasAdvisor;
  const isSuspendedConnectOnly = hasConnectAccount && !hasConnect && !hasFounder && !hasAdvisor;
  const dashboardHref = isConnectOnly
    ? "/connect"
    : isSuspendedConnectOnly
      ? "/account"
      : resolvedActiveView === "advisor"
        ? "/advisor/dashboard"
        : "/dashboard";
  const connectAttentionCount = getConnectAttentionCount(incomingConnectContactCount, unreadConnectMessageCount);
  // Die Leiste traegt Bereiche - Orte, in denen man eine Weile arbeitet.
  // Vorher standen dort fuenf Eintraege nebeneinander, die drei verschiedene
  // Sorten waren: Bereiche, ein Querschnitt (Profil) und eine Unterseite
  // (Verbindungen). Genau deshalb las es sich nicht als "ich bin hier".
  //
  // Profil steht jetzt rechts bei Konto und Sprache. Verbindungen ist eine
  // Seite innerhalb von Align und vom Dashboard aus verlinkt - sie verwaist
  // dadurch nicht.
  //
  // Seit dem 20.09.2026 ist diese Liste die EINZIGE Quelle fuer die Bereiche:
  // Die Pillen ab 1024 Pixel und das aufklappbare Menue darunter lesen
  // dieselben Eintraege. Vorher stand Find und Connect direkt im JSX - mit
  // zwei Ansichten waeren daraus zwei Listen geworden, die auseinanderlaufen.
  const alignItem: NavigationItem[] = isConnectOnly ? [] : [
    {
      href: dashboardHref,
      label: t("areaAlign"),
      isActive: (currentPathname) =>
        resolvedActiveView === "advisor"
          ? currentPathname === "/advisor/dashboard"
          : currentPathname === "/dashboard" ||
            currentPathname === "/connections" ||
            currentPathname.startsWith("/teams/") ||
            currentPathname.startsWith("/founder-library") ||
            // Fragebogen und eigener Report gehoeren zu Align. Ohne das waere
            // die zweite Reihe genau dort verschwunden, wo der neue Eintrag
            // hinfuehrt - ein Reiter, der sich beim Anklicken aufloest.
            currentPathname.startsWith("/me/") ||
            currentPathname.startsWith("/founder-alignment"),
      // Align hatte als einziger Bereich keine eigene Navigation. Beide Seiten
      // waren nur vom Dashboard aus erreichbar - wer woanders stand, musste
      // erst dorthin zurueck.
      subItems:
        resolvedActiveView === "advisor"
          ? undefined
          : [
              {
                href: "/connections",
                label: t("alignConnections"),
                isActive: (currentPathname: string) =>
                  currentPathname === "/connections" || currentPathname.startsWith("/teams/"),
              },
              ...(hasFounder
                ? [
                    // GEMELDET AM 21.09.2026: Der eigene Report war nur ueber
                    // zwei Statuskarten auf dem Dashboard erreichbar, und die
                    // heissen nach dem Schritt ("Werte"), nicht nach dem
                    // Ergebnis. Hier steht er beim Namen und von jeder
                    // Align-Seite aus.
                    {
                      href: "/me/report",
                      label: t("alignOwnReport"),
                      isActive: (currentPathname: string) =>
                        currentPathname.startsWith("/me/report"),
                    },
                    {
                      href: "/founder-library",
                      label: t("alignLibrary"),
                      isActive: (currentPathname: string) =>
                        currentPathname.startsWith("/founder-library"),
                    },
                  ]
                : []),
            ],
    },
  ];

  const findItem: NavigationItem = {
    href: "/discovery",
    label: t("areaFind"),
    isActive: (currentPathname) => currentPathname.startsWith("/discovery"),
    badge: { kind: "intro", count: incomingOpenRequestCount },
  };

  const connectItem: NavigationItem = {
    href: "/connect",
    label: t("areaConnect"),
    isActive: (currentPathname) => currentPathname.startsWith("/connect"),
    badge: { kind: "attention", count: connectAttentionCount },
  };

  const navigationItems: NavigationItem[] = [
    ...alignItem,
    ...(resolvedActiveView === "advisor"
      ? hasConnect
        ? [connectItem]
        : []
      : [...(hasFounder ? [findItem] : []), ...(hasConnect ? [connectItem] : [])]),
  ];

  // Die zweite Reihe gehoert zu dem Bereich, in dem man gerade ist. Steht man
  // nirgends drin, gibt es sie nicht - eine leere Leiste waere ein Balken ohne
  // Aussage.
  const activeAreaSubItems =
    navigationItems.find((item) => item.isActive(pathname))?.subItems ?? [];

  // Auf dem Telefon steht statt der ganzen Reihe ein Knopf. Was dahinter
  // liegt, muss trotzdem sichtbar bleiben - deshalb traegt der Knopf die Summe
  // aller Zaehler. Sonst waere ein geschlossenes Menue ein blinder Fleck.
  const menuAttentionCount = connectAttentionCount + Math.max(0, incomingOpenRequestCount);

  function areaBadge(badge: AreaBadge | undefined) {
    if (!badge) return null;
    return badge.kind === "intro" ? (
      <IncomingRequestBadge count={badge.count} />
    ) : (
      <ConnectAttentionBadge
        count={badge.count}
        label={t("connectAttentionBadge", { count: badge.count })}
      />
    );
  }

  if (!isProductChromePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <ProductNavigationOverrideContext.Provider value={setNavigationOverride}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:px-10 xl:px-12">
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

              {/* Ab 1024 Pixeln stehen die Bereiche als Pillen in der Leiste.
                  Darunter liegen sie im aufklappbaren Menue - die Reihe hier
                  war auf einem Telefon der groessere Teil der Hoehe. */}
              <nav
                aria-label={t("navLabel")}
                className="hidden flex-wrap items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1 lg:flex"
              >
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.isActive(pathname) ? "page" : undefined}
                    className={`${areaLinkClassName(item.isActive(pathname))} inline-flex items-center gap-2`}
                  >
                    <span>{item.label}</span>
                    {areaBadge(item.badge)}
                  </Link>
                ))}
                {/* Bleibt in der Leiste: Das Advisor-Dashboard verlinkt diese
                    Seite nicht, sie waere sonst nicht erreichbar. */}
                {resolvedActiveView === "advisor" ? (
                  <Link
                    href={resolvedMatchingHref}
                    className={navLinkClassName(pathname.startsWith("/advisor/report"))}
                  >
                    {t("advisorConnections")}
                  </Link>
                ) : null}
              </nav>
            </div>

            {/* -----------------------------------------------------------
                GEMELDET AM 20.09.2026: "Menueansicht auf Handy schlecht, geht
                ueber Rand hinaus."

                Hier stand `flex items-center justify-end gap-3` - ohne
                flex-wrap und ohne min-w-0. Sechs Eintraege in einer Zeile, die
                nicht umbrechen DARF: Postfach mit Zaehler, Profil, Feedback,
                Ansichtswechsel, Sprache, Menue. Auf 360 Pixel Breite bleiben
                nach dem Innenabstand rund 310 uebrig - die Reihe braucht
                deutlich mehr und schob sich ueber den Rand.

                Die linke Gruppe und der aeussere Rahmen brechen laengst um;
                nur diese eine Reihe nicht. Mit dem Postfach ist sie kuerzlich
                noch laenger geworden.

                min-w-0 gehoert dazu: Ohne das weigert sich ein Flex-Kind,
                unter seine Inhaltsbreite zu schrumpfen, und laeuft ueber statt
                zu passen.

                NACHGEMELDET AM 20.09.2026: "Menuebereich im Handy ist noch ein
                bisschen zu praesent, zu gross." Der Umbruch hatte den
                Ueberlauf gegen HOEHE getauscht - aus einer Reihe wurden drei,
                und die Leiste nahm ein Viertel des Bildschirms.

                Deshalb jetzt zwei Fassungen: ab 1024 Pixeln diese Reihe wie
                bisher, darunter ein Knopf mit dem Menue. Der Umbruch bleibt
                trotzdem stehen - auch bei 1024 Pixeln kann ein langer Name die
                Reihe noch verlaengern.
                ----------------------------------------------------------- */}
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2">
              <div className="hidden min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 lg:flex">
                {/* Das Profil ist kein Bereich, sondern ein Querschnitt: Es
                    gehoert zu Konto und Sprache, nicht zwischen die Orte. Aber
                    es bleibt SICHTBAR - im Menue hinter dem Bild zu verstecken
                    war genau die Beschwerde, die es hierher gebracht hat. */}
                {/* Das Postfach steht hier und nicht zwischen den Bereichen:
                    Es ist ein Querschnitt wie das Profil - Gespraeche kommen
                    aus Connect und aus Find. Der Zaehler war ohnehin schon da,
                    er hing nur am Connect-Eintrag. */}
                {!isSuspendedConnectOnly ? (
                  <Link
                    href="/messages"
                    aria-current={pathname.startsWith("/messages") ? "page" : undefined}
                    className={`${navLinkClassName(pathname.startsWith("/messages"))} inline-flex items-center gap-2`}
                  >
                    {t("messages")}
                    <ConnectAttentionBadge
                      count={unreadConnectMessageCount}
                      label={t("unreadMessagesBadge", { count: unreadConnectMessageCount })}
                    />
                  </Link>
                ) : null}
                {!isSuspendedConnectOnly ? (
                  <Link
                    href="/profile"
                    aria-current={pathname.startsWith("/profile") ? "page" : undefined}
                    className={navLinkClassName(pathname.startsWith("/profile"))}
                  >
                    {t("profile")}
                  </Link>
                ) : null}
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
                <ProfileMenu
                  displayName={displayName}
                  avatarId={avatarId}
                  avatarImageUrl={avatarImageUrl}
                  accountOnly={isSuspendedConnectOnly}
                />
              </div>

              {/* Bis 1024 Pixel genau ein Element auf der rechten Seite. */}
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-controls={MOBILE_MENU_ID}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
              >
                <MenuGlyph isOpen={isMenuOpen} />
                <span>{isMenuOpen ? t("menuClose") : t("menuOpen")}</span>
                {/* Der Zaehler steht AUF dem Knopf, nicht nur dahinter: Ein
                    geschlossenes Menue darf nicht verbergen, dass etwas
                    wartet. */}
                {!isMenuOpen ? (
                  <ConnectAttentionBadge
                    count={menuAttentionCount}
                    label={t("menuAttentionBadge", { count: menuAttentionCount })}
                  />
                ) : null}
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------------
              Das aufklappbare Menue. Es steht IM Kopfbereich und schiebt ihn
              auf, statt sich als Schicht darueber zu legen: Eine Schicht
              braucht Hintergrund, Fokusfalle und Scroll-Sperre, und jeder
              dieser drei Teile ist eine eigene Fehlerquelle. Aufgeschoben
              scrollt die Seite einfach darunter weiter.
              ------------------------------------------------------------- */}
          {isMenuOpen ? (
            <div
              id={MOBILE_MENU_ID}
              className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-slate-200/80 bg-white/95 px-4 pb-4 pt-2 sm:px-6 lg:hidden"
            >
              {/* Wer hier angemeldet ist. Am Rechner steht der Name neben dem
                  Bild in der Leiste; auf dem Telefon war er nirgends zu sehen,
                  und in einer App auf dem Startbildschirm ist das die Frage,
                  die man zuerst hat. */}
              <div className="flex min-h-11 items-center gap-3 px-3 py-2">
                <ProfileAvatar
                  displayName={normalizeDisplayName(displayName) || t("profileFallback")}
                  avatarId={avatarId}
                  imageUrl={avatarImageUrl}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
                />
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {normalizeDisplayName(displayName) || t("profileFallback")}
                </span>
              </div>

              <nav aria-label={t("navLabel")} className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <div key={item.href} className="flex flex-col gap-1">
                    <MobileMenuLink
                      href={item.href}
                      active={item.isActive(pathname)}
                      onNavigate={closeMenu}
                      badge={areaBadge(item.badge)}
                    >
                      {item.label}
                    </MobileMenuLink>
                    {/* Die Unterseiten nur bei dem Bereich, in dem man steht -
                        dieselbe Regel wie in der zweiten Reihe am Rechner. */}
                    {item.isActive(pathname)
                      ? (item.subItems ?? []).map((subItem) => (
                          <MobileMenuLink
                            key={subItem.href}
                            href={subItem.href}
                            active={subItem.isActive(pathname)}
                            onNavigate={closeMenu}
                            indented
                          >
                            {subItem.label}
                          </MobileMenuLink>
                        ))
                      : null}
                  </div>
                ))}
                {resolvedActiveView === "advisor" ? (
                  <MobileMenuLink
                    href={resolvedMatchingHref}
                    active={pathname.startsWith("/advisor/report")}
                    onNavigate={closeMenu}
                  >
                    {t("advisorConnections")}
                  </MobileMenuLink>
                ) : null}
              </nav>

              <div className="mt-2 flex flex-col gap-1 border-t border-slate-200/80 pt-2">
                {!isSuspendedConnectOnly ? (
                  <MobileMenuLink
                    href="/messages"
                    active={pathname.startsWith("/messages")}
                    onNavigate={closeMenu}
                    badge={
                      <ConnectAttentionBadge
                        count={unreadConnectMessageCount}
                        label={t("unreadMessagesBadge", { count: unreadConnectMessageCount })}
                      />
                    }
                  >
                    {t("messages")}
                  </MobileMenuLink>
                ) : null}
                {!isSuspendedConnectOnly ? (
                  <MobileMenuLink
                    href="/profile"
                    active={pathname.startsWith("/profile")}
                    onNavigate={closeMenu}
                  >
                    {t("profile")}
                  </MobileMenuLink>
                ) : null}
                <MobileMenuLink href="/account" active={pathname.startsWith("/account")} onNavigate={closeMenu}>
                  {t("account")}
                </MobileMenuLink>
                <ProductFeedbackEntry
                  source="nav"
                  invitationId={resolvedFeedbackInvitationId}
                  variant="nav"
                  triggerClassName={MOBILE_MENU_ROW_CLASS}
                />
                <form action={signOutAction}>
                  <button type="submit" className={`${MOBILE_MENU_ROW_CLASS} w-full text-left`}>
                    {t("logout")}
                  </button>
                </form>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3">
                <LanguageSwitcher />
                <DashboardViewSwitch
                  activeView={resolvedActiveView}
                  hasFounder={hasFounder}
                  hasAdvisor={hasAdvisor}
                />
              </div>
            </div>
          ) : null}

          {/* Die zweite Reihe gilt ab 1024 Pixeln. Auf dem Telefon stehen
              dieselben Unterseiten im Menue unter ihrem Bereich - eine zweite
              Leiste waere dort nur weitere Hoehe. */}
          {activeAreaSubItems.length > 0 ? (
            <div className="mx-auto hidden w-full max-w-7xl px-4 pb-2 sm:px-6 md:px-10 lg:block xl:px-12">
              <nav aria-label={t("subNavLabel")} className="flex flex-wrap items-center gap-1">
                {activeAreaSubItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    aria-current={subItem.isActive(pathname) ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/40 ${
                      subItem.isActive(pathname)
                        ? "font-semibold text-slate-900 underline decoration-2 underline-offset-[6px]"
                        : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
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
  feedbackInvitationId,
  activeView,
  contextLabel,
}: {
  matchingHref?: string | null;
  feedbackInvitationId?: string | null;
  activeView?: "founder" | "advisor";
  contextLabel?: string | null;
}) {
  const setOverride = useContext(ProductNavigationOverrideContext);

  useEffect(() => {
    if (!setOverride) return;

    setOverride({
      matchingHref: matchingHref ?? undefined,
      feedbackInvitationId: feedbackInvitationId ?? undefined,
      activeView: activeView ?? undefined,
      contextLabel: contextLabel ?? undefined,
    });

    return () => {
      setOverride(null);
    };
  }, [activeView, contextLabel, feedbackInvitationId, matchingHref, setOverride]);

  return null;
}

function ProfileMenu({
  displayName,
  avatarId,
  avatarImageUrl,
  accountOnly,
}: {
  displayName: string | null;
  avatarId: string | null;
  avatarImageUrl: string | null;
  accountOnly: boolean;
}) {
  const t = useTranslations("navigation");
  const normalizedName = normalizeDisplayName(displayName) || t("profileFallback");
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
        <ProfileAvatar
          displayName={normalizedName}
          avatarId={avatarId}
          imageUrl={avatarImageUrl}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
        />
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
          {!accountOnly ? (
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              role="menuitem"
            >
              {t("editProfile")}
            </Link>
          ) : null}
          <Link
            href="/account"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            {t("account")}
          </Link>
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
      className="flex shrink-0 items-center rounded-full border border-slate-200/80 bg-white p-0.5 text-[11px] font-medium text-slate-500"
      aria-label={t("language.switchLabel")}
    >
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => selectLocale(item)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition ${
            locale === item ? "bg-slate-900 text-white" : "hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-pressed={locale === item}
          // Die Fahne ist Schmuck - der volle Name steht im Titel, damit eine
          // Vorlesesoftware nicht "DE Fahne" vorliest.
          title={t(`language.${item}`)}
        >
          <span>{t(`language.short.${item}`)}</span>
          <span aria-hidden>{t(`language.flag.${item}`)}</span>
        </button>
      ))}
    </div>
  );
}
