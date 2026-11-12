"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RememberLastPlace } from "@/features/navigation/RememberLastPlace";
import { useLocale, useTranslations } from "next-intl";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { clearAllInterviewDrafts } from "@/features/interviews/interviewDrafts";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import { IncomingRequestBadge } from "@/features/discovery/IncomingRequestBadge";
import { ProductFeedbackEntry } from "@/features/feedback/ProductFeedbackEntry";
import { AnnouncementPopup } from "@/features/announcements/AnnouncementPopup";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { alignRoomHref, alignRoomOfPath } from "@/features/align/alignModel";
import { getConnectAttentionCount, getMessagesAttentionCount } from "@/features/connect/connectPresentation";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { ResearchConsentNotice } from "@/features/research/ResearchConsentNotice";
import { configureResearchConsentState, type ResearchConsentState } from "@/features/research/client";
import {
  resolveActiveView,
  workContextToStore,
  writeWorkContextCookie,
  type WorkContext,
} from "@/features/navigation/workContext";
import { TEAMRAUM_BASE, TEAMRAUM_SECTIONS, teamraumPath, teamraumSectionOfPath, type TeamraumSection } from "@/features/advisor/teamraumRoutes";
import { WorkspaceChrome } from "@/features/navigation/workspace/WorkspaceChrome";
import { FounderChrome } from "@/features/navigation/founder/FounderChrome";
import type { FounderAreaKey, FounderNavItem, FounderNavPrefs } from "@/features/navigation/founder/founderNav";
import { getIncomingRequestBadgePresentation } from "@/features/discovery/discoveryIntroTypes";
import { isWorkspacePath } from "@/features/navigation/workspace/workspaceNav";
import type { AdvisorOrgListEntry } from "@/features/dashboard/dashboardRoleData";

type Props = {
  children: React.ReactNode;
  hasFounder: boolean;
  hasAdvisor: boolean;
  /** Eine Organisation: ihr Name steht im Menue. Mehrere oder keine: "Organisation". */
  advisorOrgNames?: string[];
  advisorSoloOrg?: boolean;
  /** Dieselben Organisationen mit Kennung (Programm-Umschalter in der Seitenleiste) und die gewaehlte. */
  advisorOrgList?: AdvisorOrgListEntry[];
  activeOrgId?: string | null;
  /** Die eigene Seitenleiste des Advisor-Arbeitsbereichs (20270331120000). */
  advisorNavPrefs?: { hidden: string[]; order: string[] } | null;
  /** Die eigene Founder-Leiste (20270402120000): ausgeblendet und Reihenfolge. */
  founderNavPrefs?: FounderNavPrefs | null;
  hasConnect: boolean;
  hasConnectAccount: boolean;
  /** Ein eigenes Team ist in einem Programm oder dazu eingeladen - nur dann steht "Programm" im Menue. */
  /** Das zuletzt benutzte Team: dorthin fuehren "Wir" und "Unser Vorhaben" in der zweiten Reihe von Align. */
  alignTeamId?: string | null;
  /** Ungelesene Nachrichten im Teamraum-Chat (alle eigenen Chats, stummgeschaltete nicht). */
  advisorChatUnread?: number;
  displayName: string | null;
  avatarId?: string | null;
  avatarImageUrl?: string | null;
  incomingOpenRequestCount: number;
  incomingConnectContactCount: number;
  /** Wie viele Vorschlaege auf eine Entscheidung warten. */
  newConnectSuggestionCount?: number;
  /** Empfehlungen, die auf die Zustimmung dieser Person warten. */
  pendingRecommendationCount?: number;
  unreadConnectMessageCount: number;
  /** Hinweise, die auf eine Antwort warten - siehe inAppNotice.ts. */
  waitingNoticeCount: number;
  researchConsentState: ResearchConsentState;
  /** Die Frage nach der Forschung wurde diesem Konto schon einmal gezeigt - dann kommt sie nicht wieder. */
  researchPromptSeen?: boolean;
  /** Nur Darstellung: ob der Menueeintrag "Admin" erscheint. Der Zugang selbst wird auf /admin serverseitig geprueft. */
  isPlatformAdmin?: boolean;
  /** Neues Feedback plus offene Meldungen - die Zahl am Menuepunkt "Admin". */
  adminAttentionCount?: number;
  /** Zuletzt genutzter Arbeitskontext aus dem Cookie - nur Darstellung, siehe workContext.ts. */
  storedWorkContext?: WorkContext | null;
};

/**
 * Der Zaehler an einem Bereich. Zwei Sorten, weil zwei verschiedene Dinge
 * gezaehlt werden - Vorstellungsanfragen bei Find, Kontaktanfragen und
 * ungelesene Nachrichten bei Connect.
 */
type AreaBadge = { kind: "intro" | "attention" | "suggestions" | "chat"; count: number };

type NavigationItem = {
  /** Nur fuer die Founder-Leiste: welcher ihrer Bereiche das ist. */
  key?: FounderAreaKey;
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  badge?: AreaBadge;
  /** Eine zweite, ruhigere Zahl neben der ersten - bei Connect: neue Vorschlaege. */
  extraBadge?: AreaBadge;
  /**
   * Seiten INNERHALB dieses Bereichs.
   *
   * Sie stehen in einer zweiten Reihe und nur dann, wenn man in dem Bereich
   * ist - nicht neben den Bereichen. Genau dieses Mischen hatte die Leiste
   * vorher unlesbar gemacht: fuenf Eintraege, die drei verschiedene Sorten
   * waren. Eine eigene Ebene loest das, ohne die Seiten zu verstecken.
   */
  subItems?: {
    href: string;
    label: string;
    isActive: (pathname: string) => boolean;
    /**
     * Eine Zahl neben dem Namen — wenn dort etwas wartet.
     *
     * NICHT ROT, sondern das Lila aus dem Logo. Rot ist fuer das reserviert,
     * wo ein Mensch auf eine Antwort wartet: eine Anfrage, eine Nachricht. Ein
     * Vorschlag wartet nicht, und eine rote Zahl, die auch fuer Unwichtiges
     * leuchtet, verliert ihre Bedeutung fuer das Wichtige.
     */
    count?: { value: number; label: string };
  }[];
};

const TEAMRAUM_LABEL: Record<TeamraumSection, "teamraumWeek" | "teamraumTasks" | "teamraumChat" | "teamraumSocial" | "teamraumPages" | "teamraumWho"> = {
  week: "teamraumWeek",
  tasks: "teamraumTasks",
  chat: "teamraumChat",
  social: "teamraumSocial",
  pages: "teamraumPages",
  who: "teamraumWho",
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
  // Klasse wie die Hauptaktion im Dashboard-Kopfbereich, damit beide nicht
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
/** "Mein Profil": die Lese-Ansicht und alle Bearbeitungsschritte gehoeren zu einem Menuepunkt. */
function isProfilePath(pathname: string) {
  return pathname.startsWith("/me/profile") || pathname === "/profile" || pathname.startsWith("/profile/");
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

/** Eine Sprechblase - das Postfach als Symbol, der Zaehler haengt oben rechts daran. */
function MessagesGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function ConnectAttentionBadge({ count, label }: { count: number; label: string }) {
  if (count < 1) return null;
  return <span aria-label={label} title={label} className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white">{Math.min(count, 99)}</span>;
}

/**
 * Neue Vorschlaege: dasselbe Lila wie das Logo, nicht rot. Rot bleibt dem
 * vorbehalten, wo ein Mensch auf eine Antwort wartet. Ein Vorschlag wartet
 * nicht - er soll nur bemerkt werden.
 */
function NewSuggestionsBadge({ count, label }: { count: number; label: string }) {
  if (count < 1) return null;
  return <span aria-label={label} title={label} className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#6d49e0] px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white">{Math.min(count, 99)}</span>;
}

/**
 * Das rosa Herz fuer Admins: Im Admin-Bereich wartet etwas (neues Feedback,
 * offene Meldungen). Es sitzt am Bild oben rechts und zaehlt nicht mit - es sagt
 * nur "schau mal nach". Fuer alle anderen gibt es es nicht.
 */
function AdminHeart({ count, label, className = "" }: { count: number; label: string; className?: string }) {
  if (count < 1) return null;
  return (
    <span role="img" aria-label={label} title={label} className={`inline-flex ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 drop-shadow-[0_0_0_#fff]" aria-hidden="true">
        <path
          d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c1.9 0 3.3 1 4.1 2.3L12 9.6l1.9-2.3C14.7 6 16.1 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"
          fill="#ec4899"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
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
  advisorOrgNames = [],
  advisorSoloOrg = false,
  advisorOrgList = [],
  activeOrgId = null,
  advisorNavPrefs = null,
  founderNavPrefs = null,
  hasConnect,
  hasConnectAccount,
  alignTeamId = null,
  advisorChatUnread = 0,
  displayName,
  avatarId = null,
  avatarImageUrl = null,
  incomingOpenRequestCount,
  incomingConnectContactCount,
  newConnectSuggestionCount = 0,
  pendingRecommendationCount = 0,
  unreadConnectMessageCount,
  waitingNoticeCount,
  researchConsentState: initialResearchConsentState,
  researchPromptSeen = true,
  isPlatformAdmin = false,
  adminAttentionCount = 0,
  storedWorkContext: initialStoredWorkContext = null,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const tConnect = useTranslations("connect");
  const [navigationOverride, setNavigationOverride] = useState<NavigationOverride>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [researchConsentState, setResearchConsentState] = useState(initialResearchConsentState);
  const [researchPromptClosed, setResearchPromptClosed] = useState(false);
  // Als Zustand und nicht nur als Prop: Das Root-Layout rendert bei einem
  // Seitenwechsel im Browser nicht neu, die Prop waere danach veraltet.
  const [storedWorkContext, setStoredWorkContext] = useState<WorkContext | null>(initialStoredWorkContext);

  // "Zuletzt in diesem Kontext gearbeitet": Eindeutige Founder- oder
  // Advisor-Seiten merken sich den Kontext, gemeinsame Seiten lesen ihn nur.
  // Nur bei Doppelrolle - workContextToStore liefert sonst nichts.
  // NUR IM SPEICHER DIESES TABS. Ein Cookie entsteht erst, wenn jemand den
  // Kontext ausdruecklich umschaltet (chooseWorkContext) - nicht beim blossen
  // Oeffnen einer Seite.
  useEffect(() => {
    const next = workContextToStore({ pathname, hasFounder, hasAdvisor });
    if (next && next !== storedWorkContext) setStoredWorkContext(next);
  }, [pathname, hasFounder, hasAdvisor, storedWorkContext]);

  function chooseWorkContext(next: WorkContext) {
    if (!(hasFounder && hasAdvisor)) return;
    writeWorkContextCookie(next);
    setStoredWorkContext(next);
  }

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
  const showResearchNotice = hasFounder && researchConsentState === "undecided" && !researchPromptSeen && !researchPromptClosed;
  const resolvedFeedbackInvitationId = navigationOverride?.feedbackInvitationId ?? null;
  // Reine Darstellung: welcher Baum steht und wohin "Start" fuehrt. Zugang
  // entscheidet jede Seite selbst.
  const resolvedActiveView = resolveActiveView({
    pathname,
    override: navigationOverride?.activeView ?? null,
    hasFounder,
    hasAdvisor,
    stored: storedWorkContext,
  });
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
  // Am Postfach zaehlen ungelesene Nachrichten und wartende Hinweise
  // zusammen: Beide fuehren dorthin, und zwei Punkte waeren zwei Fragen an
  // denselben Ort.
  const messagesAttentionCount = getMessagesAttentionCount(unreadConnectMessageCount, waitingNoticeCount);
  // Die Leiste traegt Bereiche - Orte, in denen man eine Weile arbeitet.
  // Seit dem 20.09.2026 ist diese Liste die EINZIGE Quelle fuer die Bereiche:
  // Die Pillen ab 1280 Pixel und das aufklappbare Menue darunter lesen
  // dieselben Eintraege.
  //
  // ---------------------------------------------------------------------
  // KEIN GLOBALES ALIGN MEHR (Phase 9.4A)
  // ---------------------------------------------------------------------
  //
  // "Align" markierte Dashboard, eigenes Profil und Teams zugleich - ein
  // Sammelbegriff statt eines Ortes. Die Funktionen bleiben, sie stehen jetzt
  // dort, wo sie hingehoeren: das eigene Bild unter Profil, Team Alignment im
  // Team, Advisor-Reviews im Advisor-Kontext. Keine Route hat sich bewegt.
  const isFounderView = resolvedActiveView === "founder";
  // ---------------------------------------------------------------------
  // ALIGN IST WIEDER EIN BEREICH (UX-Neuordnung, Oktober 2026)
  // ---------------------------------------------------------------------
  //
  // Phase 9.4A hatte „Align" als Sammelbegriff abgeschafft, weil es Dashboard,
  // Profil und Teams zugleich markierte. Die Produktentscheidung vom
  // 19.10.2026 ist eine andere Aufteilung: Es gibt DREI Produktbereiche -
  // Align, Find, Connect - und davor „Start" als Uebersicht ueber alle drei.
  // Align traegt in seiner zweiten Reihe den Weg des Alignments:
  //
  //   Fragebögen  ->  Profil  ->  Team  ->  Library
  //
  // Die Seiten selbst haben sich nicht bewegt; nur die Leiste fasst sie
  // zusammen. Wer „Wie du arbeitest" oder „So willst du gründen" sucht, findet
  // sie unter Fragebögen; die Ergebnisse stehen im Profil, der Vergleich im Team.
  const isProfileArea = (currentPathname: string) =>
    currentPathname.startsWith("/me/") ||
    currentPathname === "/profile" ||
    currentPathname.startsWith("/profile/");
  const isQuestionnairesArea = (currentPathname: string) =>
    currentPathname === "/fragebogen" ||
    currentPathname.startsWith("/fragebogen/") ||
    currentPathname.startsWith("/research/workstyle-pretest") ||
    currentPathname.startsWith("/founder-alignment/profil") ||
    currentPathname.startsWith("/founder-alignment/pilot") ||
    currentPathname.startsWith("/founder-alignment/versionen") ||
    // „Was du aufbauen willst" ist die eigene Sicht EINER Person auf ein
    // Vorhaben - jede beantwortet es fuer sich. Der Vergleich bleibt im Team.
    currentPathname.startsWith("/founder-alignment/vorhaben");
  const isTeamsArea = (currentPathname: string) =>
    currentPathname === "/connections" ||
    currentPathname.startsWith("/teams/") ||
    currentPathname === "/invite/new" ||
    currentPathname.startsWith("/report/") ||
    // Vorhaben, Vergleich und fruehere Workbookstaende sind Teamkontext.
    (currentPathname.startsWith("/founder-alignment") && !isQuestionnairesArea(currentPathname));
  const isProgramArea = (currentPathname: string) => currentPathname === "/programm" || currentPathname.startsWith("/programm/");
  const isLibraryArea = (currentPathname: string) => currentPathname.startsWith("/founder-library");

  const founderItems: NavigationItem[] = isConnectOnly || !isFounderView ? [] : [
    {
      key: "home",
      href: "/dashboard",
      label: t("areaStart"),
      isActive: (currentPathname) => currentPathname === "/dashboard",
    },
    {
      key: "align",
      // Align hat eine eigene Uebersicht (Entwurf vom 12.11.2026): Ich, Wir, Unser Vorhaben.
      href: hasFounder ? "/align" : "/connections",
      label: t("areaAlign"),
      isActive: (currentPathname) =>
        currentPathname === "/align" ||
        isQuestionnairesArea(currentPathname) ||
        isProfileArea(currentPathname) ||
        isTeamsArea(currentPathname) ||
        isLibraryArea(currentPathname) ||
        isProgramArea(currentPathname),
      // DREI RAEUME, EIN WEG: erst das eigene Bild, dann das Team, dann das gemeinsame Vorhaben.
      // Das Programm liegt im Raum "Wir" (die Uebersicht verlinkt es dort); die Fragebögen erreicht man
      // ueber das Profil, die Library ueber Teamseite und Founder Setup.
      subItems: hasFounder
        ? [
            {
              href: "/align",
              label: t("alignOverview"),
              isActive: (currentPathname: string) => alignRoomOfPath(currentPathname) === "overview",
            },
            {
              href: alignRoomHref("ich", alignTeamId),
              label: t("alignMe"),
              isActive: (currentPathname: string) => alignRoomOfPath(currentPathname) === "ich",
            },
            {
              href: alignRoomHref("wir", alignTeamId),
              label: t("alignWe"),
              isActive: (currentPathname: string) => alignRoomOfPath(currentPathname) === "wir",
            },
            {
              href: alignRoomHref("vorhaben", alignTeamId),
              label: t("alignVenture"),
              isActive: (currentPathname: string) => alignRoomOfPath(currentPathname) === "vorhaben",
            },
          ]
        : [
            // Das Team gilt auch ohne Founder-Rolle - sonst waere die zweite Reihe leer.
            {
              href: "/connections",
              label: t("alignTeam"),
              isActive: (currentPathname: string) =>
                isTeamsArea(currentPathname) || isLibraryArea(currentPathname) || isProgramArea(currentPathname),
            },
          ],
    },
  ];

  // Der Advisor-Baum: nur bestehende Ziele. Vorher stand hier nur ein Eintrag
  // zum Advisor-Dashboard; Personen, Reviews und Intake erreichte man nur ueber
  // Anker dort, und auf den Unterseiten zeigte die Leiste keinen Ort.
  const advisorOrgLabel =
    advisorOrgNames.length === 0 || (advisorSoloOrg && advisorOrgNames.length === 1)
      ? t("advisorMyProgram")
      : advisorOrgNames.length === 1
      ? advisorOrgNames[0].length > 16
        ? `${advisorOrgNames[0].slice(0, 15).trimEnd()}…`
        : advisorOrgNames[0]
      : t("advisorOrg");
  const isAdvisorFollowArea = (currentPathname: string) =>
    ["/advisor/begleitung", "/advisor/group", "/advisor/person", "/advisor/review", "/advisor/report", "/advisor/snapshot", "/advisor/session"].some(
      (base) => currentPathname === base || currentPathname.startsWith(`${base}/`),
    );
  // Person, Team und Team-Runde (frueher „Intake") an einem Ort.
  const isAdvisorInviteArea = (currentPathname: string) =>
    currentPathname === "/advisor/einladen" ||
    currentPathname === "/team-intake" ||
    currentPathname.startsWith("/team-intake/") ||
    currentPathname.startsWith("/advisor/intake");
  const advisorItems: NavigationItem[] = isConnectOnly || isFounderView || !hasAdvisor ? [] : [
    {
      href: "/advisor/dashboard",
      label: t("areaStart"),
      isActive: (currentPathname) => currentPathname === "/advisor/dashboard" || currentPathname === "/advisor/los-gehts",
    },
    {
      // Alles, was man begleitet: Teams, Personen, Gruppenauswertungen - und
      // die Seiten dazu (Person, Review, Report, Snapshot, Sitzung).
      //
      // EINLADEN STEHT SEIT DEM 05.11.2026 HIER (Wunsch Maria): Eine Einladung ist
      // der Anfang einer Begleitung, kein eigener Ort. Sie hat in der zweiten Reihe
      // ihren Platz behalten - Person, Team-Runde und Team ins Programm an einem Ort.
      href: "/advisor/begleitung",
      label: t("advisorFollow"),
      isActive: (currentPathname) => isAdvisorFollowArea(currentPathname) || isAdvisorInviteArea(currentPathname),
      subItems: [
        { href: "/advisor/begleitung", label: t("advisorFollowList"), isActive: isAdvisorFollowArea },
        { href: "/advisor/einladen", label: t("advisorInvite"), isActive: isAdvisorInviteArea },
      ],
    },
    {
      href: "/advisor/organisation",
      label: advisorOrgLabel,
      // Die Seiten eines Teams im Programm erreicht man ueber die Organisation.
      isActive: (currentPathname) =>
        currentPathname === "/advisor/organisation" ||
        currentPathname.startsWith("/advisor/organisation/") ||
        currentPathname.startsWith("/advisor/programm/") ||
        currentPathname === "/advisor/beispiel",
    },
    // ---------------------------------------------------------------------
    // DER TEAMRAUM IST EIN EIGENER BEREICH (05.11.2026)
    // ---------------------------------------------------------------------
    //
    // Vorher eine Reitergruppe der Organisation, drei Klicks tief unter einem
    // grossen Kopf. Maria: "ein eigener Arbeitsraum" - dort arbeitet das Team
    // der Organisation jeden Tag, das ist etwas anderes als die Teams im
    // Programm zu betreuen. Nur wer in einer Organisation ist, hat einen.
    ...(advisorOrgNames.length > 0
      ? [
          {
            href: TEAMRAUM_BASE,
            label: t("advisorTeamraum"),
            badge: advisorChatUnread > 0 ? ({ kind: "chat", count: advisorChatUnread } as const) : undefined,
            isActive: (currentPathname: string) => teamraumSectionOfPath(currentPathname) !== null,
            subItems: TEAMRAUM_SECTIONS.map((section) => ({
              href: teamraumPath(section),
              label: t(TEAMRAUM_LABEL[section]),
              isActive: (currentPathname: string) => teamraumSectionOfPath(currentPathname) === section,
              ...(section === "chat" && advisorChatUnread > 0
                ? { count: { value: advisorChatUnread, label: t("teamraumChatCount", { count: advisorChatUnread }) } }
                : {}),
            })),
          },
        ]
      : []),
  ];

  const findItem: NavigationItem = {
    key: "find",
    href: "/discovery",
    label: t("areaFind"),
    isActive: (currentPathname) => currentPathname.startsWith("/discovery"),
    badge: { kind: "intro", count: incomingOpenRequestCount },
    // ---------------------------------------------------------------------
    // EINE REGEL FUER ALLE DREI BEREICHE
    // ---------------------------------------------------------------------
    //
    // GEWUENSCHT AM 30.09.2026: "Wenn das Menue tatsaechlich einheitlich ist,
    // so wie wir das bei Align gemacht haben, fuer diese anderen beiden
    // Bereiche auch, dann ist das ordentlicher."
    //
    // Die Regel, nach der sich entscheidet, was hier steht und was auf der
    // Seite bleibt:
    //
    //   HIER stehen ZIELE - Orte, an die man geht: das Eigene und das
    //   Aufgehobene. Sie sind von ueberall erreichbar, tragen die Krume und
    //   sagen damit, wo man ist.
    //
    //   AUF DER SEITE bleiben AUSSCHNITTE - welchen Teil derselben Sache man
    //   gerade ansieht. "Fuer dich" und "Suchen & filtern" sind zwei Blicke
    //   auf dieselben Profile, nicht zwei Orte.
    //
    // Vorher war es umgekehrt verteilt: ALIGN hatte seine Ziele hier, FIND
    // und Connect je eine eigene Reihe auf der Seite - drei Bereiche, zwei
    // Muster, und auf den Unterseiten fehlte die Reihe teilweise ganz.
    subItems: [
      {
        href: "/discovery",
        label: t("findDiscover"),
        isActive: (currentPathname: string) =>
          currentPathname === "/discovery" ||
          currentPathname.startsWith("/discovery/saved") ||
          /^\/discovery\/(?!intros|profile|suche|searches)[^/]+/.test(currentPathname),
      },
      {
        href: "/discovery/intros",
        label: t("findIntros"),
        isActive: (currentPathname: string) => currentPathname.startsWith("/discovery/intros"),
        ...(incomingOpenRequestCount > 0
          ? { count: { value: incomingOpenRequestCount, label: t("findIntroCount", { count: incomingOpenRequestCount }) } }
          : {}),
      },
      {
        href: "/discovery/profile",
        label: t("findMyProfile"),
        isActive: (currentPathname: string) =>
          currentPathname.startsWith("/discovery/profile") ||
          currentPathname.startsWith("/discovery/suche") ||
          currentPathname.startsWith("/discovery/searches"),
      },
    ],
  };

  const connectItem: NavigationItem = {
    key: "connect",
    href: "/connect",
    label: t("areaConnect"),
    isActive: (currentPathname) => currentPathname.startsWith("/connect"),
    badge: { kind: "attention", count: connectAttentionCount },
    extraBadge: { kind: "suggestions", count: newConnectSuggestionCount },
    // Eine einzige Leiste: die vier Arten zu entdecken, dann Kontakte und
    // Mein Connect. Es gibt keine zweite Reiterreihe auf den Seiten mehr -
    // vorher stand "Probleme" zweimal da, und "Entdecken" fuehrte auf dieselbe
    // Seite wie "Connect" darueber.
    subItems: [
      {
        href: "/connect",
        label: tConnect("tabs.listings"),
        isActive: (path: string) => path === "/connect" || /^\/connect\/(listings|suggestions)(\/|$)/.test(path),
        // Neue Vorschlaege: lila Zahl. Sie verschwindet, wenn die Liste geoeffnet wurde.
        ...(newConnectSuggestionCount > 0 ? { count: { value: newConnectSuggestionCount, label: tConnect("mine.suggestionCount", { count: newConnectSuggestionCount }) } } : {}),
      },
      { href: "/connect/people", label: tConnect("tabs.people"), isActive: (path: string) => /^\/connect\/people(?:\/|$)/.test(path) },
      // Die Arbeitsraeume gehoeren seit 05.11.2026 zum Bereich "Probleme".
      { href: "/connect/problems", label: tConnect("tabs.problems"), isActive: (path: string) => /^\/connect\/(problems|workspaces)(?:\/|$)/.test(path) },
      { href: "/connect/ventures", label: tConnect("tabs.ventures"), isActive: (path: string) => path.startsWith("/connect/ventures") && !path.startsWith("/connect/ventures/mine") },
      {
        href: "/connect/empfehlungen",
        label: tConnect("tabs.recommendations"),
        isActive: (path: string) => path.startsWith("/connect/empfehlungen"),
        // Eine Person soll erfahren, dass jemand sie empfehlen will - ohne Zahl wuerde es niemand finden.
        ...(pendingRecommendationCount > 0 ? { count: { value: pendingRecommendationCount, label: tConnect("recommendations.pendingCount", { count: pendingRecommendationCount }) } } : {}),
      },
      {
        href: "/connect/contacts",
        label: t("connectContacts"),
        isActive: (path: string) => path.startsWith("/connect/contacts") || path.startsWith("/connect/messages"),
        ...(connectAttentionCount > 0 ? { count: { value: connectAttentionCount, label: t("connectAttentionBadge", { count: connectAttentionCount }) } } : {}),
      },
      { href: "/connect/my", label: t("connectMine"), isActive: (path: string) => ["/connect/my", "/connect/profile", "/connect/searches", "/connect/ventures/mine"].some((prefix) => path.startsWith(prefix)) },
    ],
  };

  // Events (20270323120000): Programm-Termine und das Startup-Oekosystem - fuer Gruendende und Advisor gleich,
  // deshalb ein eigener Bereich am Ende. Nicht fuer reine Connect-Konten.
  const eventsItem: NavigationItem = {
    key: "events",
    href: "/events",
    label: t("areaEvents"),
    isActive: (currentPathname) => currentPathname === "/events" || currentPathname.startsWith("/events/"),
  };
  const navigationItems: NavigationItem[] = [
    ...founderItems,
    ...advisorItems,
    ...(isFounderView && hasFounder ? [findItem] : []),
    ...(hasConnect ? [connectItem] : []),
    ...((hasFounder || hasAdvisor) && !isConnectOnly ? [eventsItem] : []),
  ];
  // Wer den Founder-Baum mit Profil sieht, hat den Editor dort. Fuer alle
  // anderen (Advisor-Ansicht, nur Connect) bleibt der sichtbare Weg rechts -
  // ihn hinter dem Bild zu verstecken war schon einmal die Beschwerde.
  const showProfileShortcut = !isSuspendedConnectOnly && !(isFounderView && hasFounder && !isConnectOnly);

  // Die zweite Reihe gehoert zu dem Bereich, in dem man gerade ist. Steht man
  // nirgends drin, gibt es sie nicht - eine leere Leiste waere ein Balken ohne
  // Aussage.
  const activeArea = navigationItems.find((item) => item.isActive(pathname));
  const activeAreaSubItems = activeArea?.subItems ?? [];

  // ---------------------------------------------------------------------
  // WO BIN ICH
  // ---------------------------------------------------------------------
  //
  // GEMELDET AM 30.09.2026: „Ich weiss nicht, wo ich bin. Ich weiss nicht,
  // wie ich easy irgendwo anders hinkomme." Das ist nicht dasselbe wie ein
  // fehlender Zurueck-Link - die gibt es fast ueberall. Es fehlt die
  // ORTSANGABE: Man steht auf einer Seite und sieht eine Ueberschrift, aber
  // nicht, wo sie liegt.
  //
  // DIE KRUMEN KOMMEN AUS DEM NAVIGATIONSBAUM, NICHT AUS DEM PFAD. Aus dem
  // Pfad gebaut stuende dort „Teams › 3f2a-91c8-… › Setup“ - eine Kennung,
  // die niemandem etwas sagt und die Zeile unbrauchbar macht. Aus dem Baum
  // kommen nur Namen, die wir selbst vergeben haben.
  //
  // Deshalb hoechstens zwei Stufen: Bereich und Unterbereich. Tiefer weiss
  // der Baum nichts, und zu raten waere schlimmer als zu schweigen - die
  // Ueberschrift der Seite steht ohnehin direkt darunter.
  const activeSubItem = activeAreaSubItems.find((subItem) => subItem.isActive(pathname));
  // Phase 11.7B: NUR WENN SIE ETWAS SAGT. Ab 1280 Pixeln zeigen die Pille und
  // die zweite Reihe schon Bereich und Unterbereich - dieselbe Angabe ein
  // drittes Mal war nur Hoehe. Auf dem Telefon traegt der Menueknopf den
  // Bereich; die Krume erscheint dort nur auf Seiten UNTERHALB eines
  // Unterbereichs (z. B. ein einzelnes Inserat) und nie auf Teamseiten, die
  // ihren eigenen Weg zurueck ("← Verbindungen") haben.
  const breadcrumbAddsOrientation =
    Boolean(activeArea && activeSubItem) &&
    pathname !== activeSubItem?.href &&
    pathname !== activeArea?.href &&
    !pathname.startsWith("/teams/");
  const breadcrumb = activeArea && breadcrumbAddsOrientation
    ? [
        { href: activeArea.href, label: activeArea.label },
        ...(activeSubItem ? [{ href: activeSubItem.href, label: activeSubItem.label }] : []),
      ]
    : [];

  // Auf dem Telefon steht statt der ganzen Reihe ein Knopf. Was dahinter
  // liegt, muss trotzdem sichtbar bleiben - deshalb traegt der Knopf die Summe
  // aller Zaehler. Sonst waere ein geschlossenes Menue ein blinder Fleck.
  const menuAttentionCount = connectAttentionCount + Math.max(0, incomingOpenRequestCount) + Math.max(0, waitingNoticeCount);

  function areaBadge(badge: AreaBadge | undefined, extra?: AreaBadge): React.ReactNode {
    if (!badge) return null;
    const extraBadge = extra ? areaBadge(extra) : null;
    if (badge.kind === "suggestions") {
      return <NewSuggestionsBadge count={badge.count} label={tConnect("mine.suggestionCount", { count: badge.count })} />;
    }
    if (badge.kind === "chat") {
      // Lila wie die Vorschlaege: Eine Nachricht im Team wartet nicht wie eine Anfrage, sie soll bemerkt werden.
      return <NewSuggestionsBadge count={badge.count} label={t("advisorChatUnread", { count: badge.count })} />;
    }
    const main = badge.kind === "intro" ? (
      <IncomingRequestBadge count={badge.count} />
    ) : (
      <ConnectAttentionBadge
        count={badge.count}
        label={t("connectAttentionBadge", { count: badge.count })}
      />
    );
    return extraBadge ? <>{main}{extraBadge}</> : main;
  }

  if (!isProductChromePath(pathname)) {
    return <>{children}</>;
  }

  // Die Werkzeuge rechts oben und unter "Mehr" - fuer beide Seitenleisten (Advisor und Founder) dieselben.
  const chromeSlots = {
            profile: (
              <ProfileMenu
                displayName={displayName}
                avatarId={avatarId}
                avatarImageUrl={avatarImageUrl}
                accountOnly={false}
                isPlatformAdmin={isPlatformAdmin}
                adminAttentionCount={adminAttentionCount}
                showName={false}
              />
            ),
            language: <LanguageSwitcher compact />,
            viewSwitch: <DashboardViewSwitch activeView={resolvedActiveView} hasFounder={hasFounder} hasAdvisor={hasAdvisor} onSelect={chooseWorkContext} compact />,
            feedback: (
              <ProductFeedbackEntry
                source="nav"
                invitationId={resolvedFeedbackInvitationId}
                variant="nav"
                triggerClassName="shrink-0 whitespace-nowrap rounded-full border border-violet-300 px-3 py-1.5 text-[13px] font-semibold text-violet-700 transition hover:bg-violet-50"
              />
            ),
            moreExtras: (
              <>
                <div className="flex min-h-11 items-center gap-3 px-3 py-2">
                  <ProfileAvatar
                    displayName={normalizeDisplayName(displayName) || t("profileFallback")}
                    avatarId={avatarId}
                    imageUrl={avatarImageUrl}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{normalizeDisplayName(displayName) || t("profileFallback")}</span>
                </div>
                <MobileMenuLink
                  href="/messages"
                  active={pathname.startsWith("/messages")}
                  onNavigate={closeMenu}
                  badge={<ConnectAttentionBadge count={messagesAttentionCount} label={t("messagesAttentionBadge", { count: messagesAttentionCount })} />}
                >
                  {t("messages")}
                </MobileMenuLink>
                <MobileMenuLink href="/me/profile" active={isProfilePath(pathname)} onNavigate={closeMenu}>
                  {t("myProfile")}
                </MobileMenuLink>
                <MobileMenuLink href="/account" active={pathname.startsWith("/account")} onNavigate={closeMenu}>
                  {t("account")}
                </MobileMenuLink>
                {isPlatformAdmin ? (
                  <MobileMenuLink href="/admin" active={pathname === "/admin" || pathname.startsWith("/admin/")} onNavigate={closeMenu}>
                    {t("admin")}{adminAttentionCount > 0 ? ` (${Math.min(adminAttentionCount, 99)})` : ""}
                  </MobileMenuLink>
                ) : null}
                <ProductFeedbackEntry source="nav" invitationId={resolvedFeedbackInvitationId} variant="nav" triggerClassName={MOBILE_MENU_ROW_CLASS} />
                <form action={signOutAction} onSubmit={() => clearAllInterviewDrafts()}>
                  <button type="submit" className={`${MOBILE_MENU_ROW_CLASS} w-full text-left`}>
                    {t("logout")}
                  </button>
                </form>
                <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3">
                  <LanguageSwitcher />
                  <DashboardViewSwitch activeView={resolvedActiveView} hasFounder={hasFounder} hasAdvisor={hasAdvisor} onSelect={chooseWorkContext} />
                </div>
              </>
            ),
  };

  // ---------------------------------------------------------------------
  // ADVISOR-ARBEITSBEREICH MIT SEITENLEISTE (Entwurf vom 05.11.2026, freigegeben)
  // ---------------------------------------------------------------------
  //
  // Teamraum und Programm waren zwei getrennte Bereiche mit je eigener Reihe: man kam schwer hin und her.
  // In der Advisor-Ansicht steht jetzt EINE Seitenleiste mit allen Stationen und oben eine schlanke Leiste
  // (Organisation, Suche, "+ Neu", Nachrichten, Profil); auf dem Handy fuenf Reiter unten. Die Founder-Ansicht
  // und Connect behalten die Leiste oben. Reine Darstellung - jede Seite prueft ihren Zugang selbst.
  const useWorkspace = hasAdvisor && resolvedActiveView === "advisor" && !isConnectOnly && !isSuspendedConnectOnly && isWorkspacePath(pathname);
  if (useWorkspace) {
    return (
      <ProductNavigationOverrideContext.Provider value={setNavigationOverride}>
        <RememberLastPlace />
        <WorkspaceChrome
          hasOrg={advisorOrgNames.length > 0}
          orgLabel={advisorOrgLabel}
          orgs={advisorOrgList}
          activeOrgId={activeOrgId}
          navPrefs={advisorNavPrefs}
          chatUnread={advisorChatUnread}
          messagesCount={messagesAttentionCount}
          slots={chromeSlots}
        >
          {children}
          {showResearchNotice ? <ResearchConsentNotice onDecision={setResearchConsentState} onLater={() => setResearchPromptClosed(true)} /> : null}
          <AnnouncementPopup />
        </WorkspaceChrome>
      </ProductNavigationOverrideContext.Provider>
    );
  }

  // ---------------------------------------------------------------------
  // FOUNDER-ANSICHT MIT SEITENLEISTE (Entwurf vom 08.11.2026, Variante A, freigegeben)
  // ---------------------------------------------------------------------
  //
  // Dieselbe Bauart wie der Advisor-Arbeitsbereich: links die Bereiche, der aktive klappt auf und zeigt seine
  // Unterpunkte; oben Ort, Suche, Nachrichten, Profil; auf dem Handy vier Reiter und "Mehr". Fuer die Founder-Ansicht
  // und fuer Konten nur mit Connect (dort sind die Unterpunkte die Leiste). Die Eintraege kommen aus
  // `navigationItems` - es gibt weiter nur EINE Quelle fuer die Bereiche. Reine Darstellung: jede Seite prueft ihren
  // Zugang selbst. Wer nur Advisor ist, behaelt die Leiste oben auf den Seiten ausserhalb des Arbeitsbereichs.
  const useFounderShell = !useWorkspace && !isSuspendedConnectOnly && (isConnectOnly || (isFounderView && hasFounder));
  if (useFounderShell) {
    const areaBadgeOf = (badge: AreaBadge | undefined): FounderNavItem["badge"] => {
      if (!badge || badge.count < 1) return undefined;
      if (badge.kind === "intro") {
        const presentation = getIncomingRequestBadgePresentation(badge.count);
        return presentation ? { value: badge.count, label: t(presentation.messageKey, { count: badge.count }) } : undefined;
      }
      return { value: badge.count, label: t("connectAttentionBadge", { count: badge.count }) };
    };
    const childIcons: Record<string, string> = {
      "/connect": "discover",
      "/connect/people": "people",
      "/connect/problems": "problems",
      "/connect/ventures": "ventures",
      "/connect/contacts": "contacts",
      "/connect/my": "mine",
    };
    const founderNavItems: FounderNavItem[] = navigationItems.flatMap((item) =>
      item.key
        ? [
            {
              key: item.key,
              href: item.href,
              label: item.label,
              active: item.isActive(pathname),
              badge: areaBadgeOf(item.badge),
              children: (item.subItems ?? []).map((subItem) => ({
                href: subItem.href,
                label: subItem.label,
                active: subItem.isActive(pathname),
                icon: childIcons[subItem.href],
                count: subItem.count,
              })),
            },
          ]
        : [],
    );
    return (
      <ProductNavigationOverrideContext.Provider value={setNavigationOverride}>
        <RememberLastPlace />
        <FounderChrome
          items={founderNavItems}
          connectOnly={isConnectOnly}
          prefs={founderNavPrefs}
          dashboardHref={dashboardHref}
          messagesCount={messagesAttentionCount}
          slots={chromeSlots}
        >
          {children}
          {showResearchNotice ? <ResearchConsentNotice onDecision={setResearchConsentState} onLater={() => setResearchPromptClosed(true)} /> : null}
          <AnnouncementPopup />
        </FounderChrome>
      </ProductNavigationOverrideContext.Provider>
    );
  }

  return (
    <ProductNavigationOverrideContext.Provider value={setNavigationOverride}>
      <div className="min-h-screen">
        <RememberLastPlace />
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl print:hidden">
          {/* -----------------------------------------------------------
              GEMELDET AM 05.10.2026: "Connect steht selbst bei 2048 Pixeln
              allein in einer zweiten Zeile."

              Nicht zu wenig Platz, sondern falsch verteilt: Die linke Gruppe
              (Logo + Bereiche) trug min-w-0 und die Bereichs-Pille flex-wrap.
              Wurde es rechts eng - mit dem Founder/Advisor-Wechsel immer, der
              Rahmen ist wegen max-w-7xl ab 1280 Pixeln stets gleich breit -,
              hat Flex die LINKE Gruppe geschrumpft, und die Pille brach um.

              Jetzt umgekehrt: Bereiche schrumpfen nie (shrink-0, flex-nowrap),
              die Werkzeuge rechts nehmen nur den Rest und werden kompakter.
              Und erst ab 1280 Pixeln (xl) gibt es die Reihe - darunter den
              Menue-Knopf. Einen Zwischenzustand mit zweizeiliger Reihe gibt es
              nicht mehr.
              ----------------------------------------------------------- */}
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 md:px-10 xl:flex-nowrap xl:px-12">
            <div className="flex min-w-0 flex-wrap items-center gap-4 md:gap-5 xl:shrink-0 xl:flex-nowrap xl:gap-4">
              <Link
                href={dashboardHref}
                className="flex min-w-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/40"
                aria-label={t("logoLabel")}
              >
                <BrandLogo className="h-8 md:h-9" priority sizes="(min-width: 768px) 144px, 128px" />
              </Link>
              {/* Solange die Testphase laeuft: ein ruhiges Etikett, das sagt, wo man ist. */}
              {/* Mit fuenf Bereichen (Advisor-Ansicht) ist die Leiste zwischen 1280 und 1536 Pixeln voll: Dann
                  weicht das Etikett, damit die Werkzeuge rechts nicht ueber die Bereiche geschoben werden. */}
              <span className={`-ml-1 hidden rounded-full border border-violet-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 ${navigationItems.length >= 5 ? "sm:inline-flex xl:hidden 2xl:inline-flex" : "sm:inline-flex"}`}>
                {t("betaBadge")}
              </span>

              {/* Ab 1280 Pixeln stehen die Bereiche als Pillen in der Leiste.
                  Darunter liegen sie im aufklappbaren Menue - die Reihe hier
                  war auf einem Telefon der groessere Teil der Hoehe. */}
              <nav
                aria-label={t("navLabel")}
                className="hidden shrink-0 flex-nowrap items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1 xl:flex"
              >
                {navigationItems.map((item, index) => (
                  <span key={item.href} className="inline-flex shrink-0 items-center gap-1">
                    {/* Eine feine Linie trennt die Bereiche - Start | Align | Find | Connect
                        lesen sich so als eigene Orte, nicht als eine Liste. */}
                    {index > 0 ? <span aria-hidden="true" className="mr-0.5 h-5 w-px bg-slate-200" /> : null}
                    <Link
                      href={item.href}
                      aria-current={item.isActive(pathname) ? "page" : undefined}
                      className={`${areaLinkClassName(item.isActive(pathname))} inline-flex items-center gap-2`}
                    >
                      <span>{item.label}</span>
                      {areaBadge(item.badge, item.extraBadge)}
                    </Link>
                  </span>
                ))}
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

                Deshalb jetzt zwei Fassungen: ab 1280 Pixeln (seit 05.10.2026,
                vorher 1024) diese Reihe, darunter ein Knopf mit dem Menue. Am
                Rechner bricht die Reihe nicht um: Sie nimmt den Platz rechts
                der Bereiche (flex-1), und was nicht passt, kuerzt zuerst den
                Kontonamen.
                ----------------------------------------------------------- */}
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 xl:flex-1 xl:flex-nowrap">
              <div className="hidden min-w-0 flex-wrap items-center justify-end gap-x-1 gap-y-1 xl:flex xl:flex-nowrap">
                {/* Das Profil steht nicht mehr als eigener Eintrag in der Leiste: Es liegt im
                    Menue hinter dem Bild rechts (und im Mobilmenue). Die Leiste war mit
                    fuenf Advisor-Bereichen zu voll, und das Postfach ueberlappte Connect. */}
                {/* Das Postfach steht hier und nicht zwischen den Bereichen:
                    Es ist ein Querschnitt wie das Profil - Gespraeche kommen
                    aus Connect und aus Find. Der Zaehler war ohnehin schon da,
                    er hing nur am Connect-Eintrag. */}
                {!isSuspendedConnectOnly ? (
                  <Link
                    href="/messages"
                    aria-current={pathname.startsWith("/messages") ? "page" : undefined}
                    aria-label={t("messages")}
                    title={t("messages")}
                    className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                      pathname.startsWith("/messages")
                        ? "brand-here"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <MessagesGlyph />
                    <span className="absolute -right-0.5 -top-0.5">
                      <ConnectAttentionBadge
                        count={messagesAttentionCount}
                        label={t("messagesAttentionBadge", { count: messagesAttentionCount })}
                      />
                    </span>
                  </Link>
                ) : null}
                <ProductFeedbackEntry
                  source="nav"
                  invitationId={resolvedFeedbackInvitationId}
                  variant="nav"
                  // In der Testphase auffaellig genug, ohne Inhalt zu verdecken: umrandet, immer sichtbar.
                  triggerClassName="shrink-0 whitespace-nowrap rounded-full border border-violet-300 px-3 py-1.5 text-[13px] font-semibold text-violet-700 transition hover:bg-violet-50"
                />
                <DashboardViewSwitch
                  activeView={resolvedActiveView}
                  hasFounder={hasFounder}
                  hasAdvisor={hasAdvisor}
                  onSelect={chooseWorkContext}
                  compact
                />

                <LanguageSwitcher compact />
                {/* Mit dem Founder/Advisor-Wechsel ist die Reihe am vollsten -
                    dann nur das Bild, der Name steht im aufgeklappten Menue. */}
                <ProfileMenu
                  displayName={displayName}
                  avatarId={avatarId}
                  avatarImageUrl={avatarImageUrl}
                  accountOnly={isSuspendedConnectOnly}
                  isPlatformAdmin={isPlatformAdmin}
                  adminAttentionCount={adminAttentionCount}
                  showName={!(hasFounder && hasAdvisor)}
                />
              </div>

              {/* Bis 1280 Pixel genau ein Element auf der rechten Seite. */}
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-controls={MOBILE_MENU_ID}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 xl:hidden"
              >
                <MenuGlyph isOpen={isMenuOpen} />
                {/* Phase 11.7B: Geschlossen traegt der Knopf den aktuellen
                    Bereich - das ist auf dem Telefon die Ortsangabe, statt
                    einer eigenen Brotkrumen-Reihe. */}
                <span className="max-w-[11rem] truncate">{isMenuOpen ? t("menuClose") : activeArea?.label ?? t("menuOpen")}</span>
                {!isMenuOpen && activeArea ? <span className="sr-only">{` – ${t("menuOpen")}`}</span> : null}
                {/* Der Zaehler steht AUF dem Knopf, nicht nur dahinter: Ein
                    geschlossenes Menue darf nicht verbergen, dass etwas
                    wartet. */}
                {!isMenuOpen ? (
                  <ConnectAttentionBadge
                    count={menuAttentionCount}
                    label={t("menuAttentionBadge", { count: menuAttentionCount })}
                  />
                ) : null}
                {/* Das rosa Herz fuer Admins, wenn im Admin-Bereich etwas wartet. */}
                {!isMenuOpen && isPlatformAdmin ? (
                  <AdminHeart count={adminAttentionCount} label={t("adminAttention", { count: adminAttentionCount })} />
                ) : null}
                {/* Neue Vorschlaege daneben, lila: Sie zaehlen nicht zur roten Summe. */}
                {!isMenuOpen ? (
                  <NewSuggestionsBadge
                    count={newConnectSuggestionCount}
                    label={tConnect("mine.suggestionCount", { count: newConnectSuggestionCount })}
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
              className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-slate-200/80 bg-white/95 px-4 pb-4 pt-2 sm:px-6 xl:hidden"
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
                      badge={areaBadge(item.badge, item.extraBadge)}
                    >
                      {item.label}
                    </MobileMenuLink>
                    {/* Die Unterseiten nur bei dem Bereich, in dem man steht -
                        dieselbe Regel wie in der zweiten Reihe am Rechner. */}
                    {item.isActive(pathname)
                      ? (item.subItems ?? []).map((subItem) => (
                          <MobileMenuLink
                            key={`${subItem.href}:${subItem.label}`}
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
              </nav>

              <div className="mt-2 flex flex-col gap-1 border-t border-slate-200/80 pt-2">
                {!isSuspendedConnectOnly ? (
                  <MobileMenuLink
                    href="/messages"
                    active={pathname.startsWith("/messages")}
                    onNavigate={closeMenu}
                    badge={
                      <ConnectAttentionBadge
                        count={messagesAttentionCount}
                        label={t("messagesAttentionBadge", { count: messagesAttentionCount })}
                      />
                    }
                  >
                    {t("messages")}
                  </MobileMenuLink>
                ) : null}
                {/* DIE BEIDEN PERSOENLICHEN SEITEN STEHEN NEBENEINANDER - fuer
                    alle, die den Founder-Bereich "Profil" nicht sehen
                    (Advisor-Ansicht, nur Connect). "Das bist du" liest mehr als
                    Founder-Daten: Faehigkeiten, Staerken, Richtung. In der
                    Founder-Ansicht stehen beide unter "Profil". */}
                {showProfileShortcut ? (
                  <>
                    <MobileMenuLink
                      href="/me/profile"
                      active={isProfilePath(pathname)}
                      onNavigate={closeMenu}
                    >
                      {t("myProfile")}
                    </MobileMenuLink>
                  </>
                ) : null}
                <MobileMenuLink href="/account" active={pathname.startsWith("/account")} onNavigate={closeMenu}>
                  {t("account")}
                </MobileMenuLink>
                {isPlatformAdmin ? (
                  <MobileMenuLink href="/admin" active={pathname === "/admin" || pathname.startsWith("/admin/")} onNavigate={closeMenu}>
                    {t("admin")}{adminAttentionCount > 0 ? ` (${Math.min(adminAttentionCount, 99)})` : ""}
                  </MobileMenuLink>
                ) : null}
                <ProductFeedbackEntry
                  source="nav"
                  invitationId={resolvedFeedbackInvitationId}
                  variant="nav"
                  triggerClassName={MOBILE_MENU_ROW_CLASS}
                />
                <form action={signOutAction} onSubmit={() => clearAllInterviewDrafts()}>
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
                  onSelect={chooseWorkContext}
                />
              </div>
            </div>
          ) : null}

          {/* Die zweite Reihe gilt ab 1280 Pixeln. Auf dem Telefon stehen
              dieselben Unterseiten im Menue unter ihrem Bereich - eine zweite
              Leiste waere dort nur weitere Hoehe. */}
          {activeAreaSubItems.length > 0 ? (
            <div className="mx-auto hidden w-full max-w-7xl px-4 pb-1 sm:px-6 md:px-10 xl:block xl:px-12">
              <nav aria-label={t("subNavLabel")} className="flex flex-wrap items-center gap-1">
                {activeAreaSubItems.map((subItem) => (
                  <Link
                    key={`${subItem.href}:${subItem.label}`}
                    href={subItem.href}
                    aria-current={subItem.isActive(pathname) ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]/40 ${
                      subItem.isActive(pathname)
                        ? "font-semibold text-slate-900 underline decoration-2 underline-offset-[6px]"
                        : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {subItem.label}
                    {subItem.count ? (
                      <span
                        aria-label={subItem.count.label}
                        className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#6d49e0] px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white"
                      >
                        {Math.min(subItem.count.value, 99)}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>

        {/* ---------------------------------------------------------------
            AUF JEDER EBENE UND AUF JEDEM GERAET
            ---------------------------------------------------------------

            Die zweite Reihe gibt es erst ab 1280 Pixeln und nur in Bereichen mit Unterseiten.
            Diese Zeile gibt es immer - gerade auf dem Telefon, wo die
            Bereiche hinter einem Knopf liegen und man sonst gar nicht sieht,
            worin man steht.

            EIN EINTRAG IST NUR DANN „HIER“, WENN ER WIRKLICH HIER IST.
            Erster Anlauf markierte immer den letzten - auf
            /connect/listings/abc stand dann „Connect“ als aktuelle Seite, und
            der Weg nach /connect war weg. Verglichen wird deshalb die
            Adresse, nicht die Position in der Liste. */}
        {breadcrumb.length > 0 ? (
          <nav
            aria-label={t("breadcrumbLabel")}
            className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 md:px-10 xl:hidden xl:px-12"
          >
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {breadcrumb.map((krume, index) => (
                <li key={`${index}:${krume.href}`} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true">›</span> : null}
                  {krume.href === pathname ? (
                    <span aria-current="page" className="font-medium text-slate-700">
                      {krume.label}
                    </span>
                  ) : (
                    <Link href={krume.href} className="hover:text-slate-900 hover:underline">
                      {krume.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {children}
        {showResearchNotice ? (
          <ResearchConsentNotice onDecision={setResearchConsentState} onLater={() => setResearchPromptClosed(true)} />
        ) : null}
        {/* Mitteilungen der Plattform. Wartet auf ein freies Fenster, siehe AnnouncementPopup. */}
        <AnnouncementPopup />
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
  isPlatformAdmin = false,
  adminAttentionCount = 0,
  showName = true,
}: {
  displayName: string | null;
  avatarId: string | null;
  avatarImageUrl: string | null;
  accountOnly: boolean;
  isPlatformAdmin?: boolean;
  adminAttentionCount?: number;
  showName?: boolean;
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
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 py-1 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="relative inline-flex shrink-0">
          <ProfileAvatar
            displayName={normalizedName}
            avatarId={avatarId}
            imageUrl={avatarImageUrl}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
            fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
          />
          {isPlatformAdmin ? (
            <AdminHeart count={adminAttentionCount} label={t("adminAttention", { count: adminAttentionCount })} className="absolute -right-1.5 -top-1.5" />
          ) : null}
        </span>
        {/* Der Name ist das Erste, was weicht: kuerzer (truncate), und bei
            vollem Kopf gar nicht - nie die Bereiche links. */}
        <span className={showName ? "hidden min-w-0 max-w-28 truncate xl:inline" : "sr-only"}>{normalizedName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-slate-500"
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
          {/* Erst pflegen, dann ansehen - dieselbe Reihenfolge wie im
              Mobilmenue. "Das bist du" steht hier, weil es fuer jeden
              funktioniert, der ein Konto hat: Es liest Faehigkeiten,
              Staerken und Richtung, nicht nur Align. */}
          {!accountOnly ? (
            <>
              <Link
                href="/me/profile"
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                role="menuitem"
              >
                {t("myProfile")}
              </Link>
            </>
          ) : null}
          <Link
            href="/account"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            role="menuitem"
          >
            {t("account")}
          </Link>
          {isPlatformAdmin ? (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              role="menuitem"
            >
              <span className="flex flex-wrap items-center gap-2">
                {t("admin")}
                {adminAttentionCount > 0 ? <span aria-label={t("adminAttention", { count: adminAttentionCount })} className="rounded-full bg-[#6d49e0] px-2 py-0.5 text-center text-[12px] font-bold text-white">{Math.min(adminAttentionCount, 99)}</span> : null}
              </span>
            </Link>
          ) : null}
          <form action={signOutAction} onSubmit={() => clearAllInterviewDrafts()}>
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

/** compact: am Rechner im Kopf ohne Fahnen - die Leiste ist sonst zu voll. */
function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
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
            locale === item ? "bg-slate-100 font-semibold text-slate-900" : "hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-pressed={locale === item}
          // Die Fahne ist Schmuck - der volle Name steht im Titel, damit eine
          // Vorlesesoftware nicht "DE Fahne" vorliest.
          title={t(`language.${item}`)}
        >
          <span>{t(`language.short.${item}`)}</span>
          <span aria-hidden className={compact ? "hidden 2xl:inline" : undefined}>{t(`language.flag.${item}`)}</span>
        </button>
      ))}
    </div>
  );
}
