import { TEAMRAUM_BASE, teamraumPath, teamraumSectionOfPath } from "@/features/advisor/teamraumRoutes";
import type { OrgRights, OrgRole } from "@/features/advisor/orgRights";

/**
 * Die Stationen des Advisor-Arbeitsbereichs (Entwurf vom 05.11.2026, freigegeben): EINE Seitenleiste fuer
 * Teamraum und Programm statt zweier getrennter Bereiche. Reine Darstellung - jede Seite prueft ihren Zugang selbst.
 *
 * Oben steht, was taeglich gebraucht wird (Heute, Aufgaben, Chat, Kalender), darunter Programm und Netzwerk,
 * unten das Seltene (Einrichten). Der Termin ist der Knoten: Kalender, Heute und Chat oeffnen dasselbe Panel.
 */

export type WorkspaceIcon =
  | "home"
  | "tasks"
  | "chat"
  | "calendar"
  | "social"
  | "pages"
  | "teams"
  | "plan"
  | "report"
  | "funding"
  | "follow"
  | "content"
  | "events"
  | "setup";

export type WorkspaceItemKey =
  | "home"
  | "tasks"
  | "chat"
  | "calendar"
  | "social"
  | "pages"
  | "teams"
  | "plan"
  | "report"
  | "funding"
  | "follow"
  | "content"
  | "events"
  | "setup"
  | "myProgram";

export type WorkspaceGroupKey = "work" | "program" | "network";

export type WorkspaceNavItem = {
  key: WorkspaceItemKey;
  href: string;
  icon: WorkspaceIcon;
  /** Zaehler, der am Eintrag steht (ungelesene Chat-Nachrichten). */
  badge?: number;
  /** Unterpunkte, nur sichtbar, solange man im Eintrag ist. */
  children?: { key: "followList" | "invite"; href: string; match: (pathname: string) => boolean }[];
  match: (pathname: string, tab: string | null, view?: string | null) => boolean;
};

export type WorkspaceNav = {
  home: WorkspaceNavItem;
  groups: { key: WorkspaceGroupKey; items: WorkspaceNavItem[] }[];
  setup: WorkspaceNavItem | null;
};

const ORG = "/advisor/organisation";
const tabHref = (tab: string) => `${ORG}?tab=${tab}`;
export const CALENDAR_PATH = "/advisor/kalender";
/** Wert von ?ansicht= fuer den Programmplan. */
export const PLAN_VIEW = "plan";

const FOLLOW_BASES = ["/advisor/begleitung", "/advisor/group", "/advisor/person", "/advisor/review", "/advisor/report", "/advisor/snapshot", "/advisor/session"];
export const isFollowPath = (pathname: string) => FOLLOW_BASES.some((base) => pathname === base || pathname.startsWith(`${base}/`));
export const isInvitePath = (pathname: string) =>
  pathname === "/advisor/einladen" || pathname === "/team-intake" || pathname.startsWith("/team-intake/") || pathname.startsWith("/advisor/intake");

const SETUP_TABS = ["enroll", "page", "features", "members", "access", "profile", "settings", "success"];
const CONTENT_TABS = ["materials", "learning", "partners"];
const onOrg = (pathname: string) => pathname === ORG;

/** Welche Seiten tragen die Seitenleiste: der Advisor-Bereich, Events, Team-Runden, Postfach und Konto. */
export function isWorkspacePath(pathname: string) {
  return (
    pathname.startsWith("/advisor/") ||
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/team-intake" ||
    pathname.startsWith("/team-intake/") ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/") ||
    pathname === "/account"
  );
}

export function buildWorkspaceNav({ hasOrg, chatUnread = 0 }: { hasOrg: boolean; chatUnread?: number }): WorkspaceNav {
  const home: WorkspaceNavItem = {
    key: "home",
    href: "/advisor/dashboard",
    icon: "home",
    match: (pathname) => pathname === "/advisor/dashboard" || pathname === "/advisor/los-gehts",
  };

  const follow: WorkspaceNavItem = {
    key: "follow",
    href: "/advisor/begleitung",
    icon: "follow",
    match: (pathname) => isFollowPath(pathname) || isInvitePath(pathname),
    children: [
      { key: "followList", href: "/advisor/begleitung", match: isFollowPath },
      { key: "invite", href: "/advisor/einladen", match: isInvitePath },
    ],
  };
  const events: WorkspaceNavItem = {
    key: "events",
    href: "/events",
    icon: "events",
    match: (pathname) => pathname === "/events" || pathname.startsWith("/events/"),
  };

  if (!hasOrg) {
    // Ohne Organisation gibt es keinen Teamraum und kein Programm: das Anlegen steht an dessen Stelle.
    const myProgram: WorkspaceNavItem = {
      key: "myProgram",
      href: ORG,
      icon: "teams",
      match: (pathname) => onOrg(pathname) || pathname.startsWith("/advisor/programm/") || pathname === "/advisor/beispiel",
    };
    return { home, groups: [{ key: "network", items: [follow, myProgram, events] }], setup: null };
  }

  const inTeamraum = (pathname: string, sections: string[]) => {
    const section = teamraumSectionOfPath(pathname);
    return section !== null && sections.includes(section);
  };

  return {
    home,
    groups: [
      {
        key: "work",
        items: [
          // "Diese Woche" und "Wer macht was" gehoeren zum Aufgaben-Eintrag.
          { key: "tasks", href: teamraumPath("tasks"), icon: "tasks", match: (pathname) => inTeamraum(pathname, ["tasks", "week", "who"]) },
          { key: "chat", href: teamraumPath("chat"), icon: "chat", ...(chatUnread > 0 ? { badge: chatUnread } : {}), match: (pathname) => inTeamraum(pathname, ["chat"]) },
          // Der Kalender haelt auch die Posts (Ebene "Posts"); Vorlagen und Kampagnen stehen unter Programm.
          { key: "calendar", href: CALENDAR_PATH, icon: "calendar", match: (pathname, _tab, view) => pathname === CALENDAR_PATH && view !== PLAN_VIEW },
          { key: "pages", href: teamraumPath("pages"), icon: "pages", match: (pathname) => inTeamraum(pathname, ["pages"]) },
        ],
      },
      {
        key: "program",
        items: [
          {
            key: "teams",
            href: tabHref("program"),
            icon: "teams",
            match: (pathname, tab) => (onOrg(pathname) && (tab === null || tab === "overview" || tab === "program")) || pathname.startsWith("/advisor/programm/") || pathname === "/advisor/beispiel",
          },
          // Der Programmplan: alle Termine als Liste, hier traegt man sie ein (einzeln, mehrere auf einmal, Formate).
          { key: "plan", href: `${CALENDAR_PATH}?ansicht=${PLAN_VIEW}`, icon: "plan", match: (pathname, _tab, view) => pathname === CALENDAR_PATH && view === PLAN_VIEW },
          { key: "social", href: teamraumPath("social"), icon: "social", match: (pathname) => inTeamraum(pathname, ["social"]) },
          { key: "report", href: tabHref("report"), icon: "report", match: (pathname, tab) => onOrg(pathname) && (tab === "report" || tab === "contentReport") },
          { key: "funding", href: tabHref("funding"), icon: "funding", match: (pathname, tab) => (onOrg(pathname) && tab === "funding") || pathname === "/advisor/organisation/foerderung" },
        ],
      },
      {
        key: "network",
        items: [
          follow,
          { key: "content", href: tabHref("materials"), icon: "content", match: (pathname, tab) => onOrg(pathname) && tab !== null && CONTENT_TABS.includes(tab) },
          events,
        ],
      },
    ],
    setup: { key: "setup", href: tabHref("enroll"), icon: "setup", match: (pathname, tab) => onOrg(pathname) && tab !== null && SETUP_TABS.includes(tab) },
  };
}

/**
 * Was die Rolle sehen darf: Die Leiste bietet nur an, was die Person oeffnen darf (Anzeige - die Datenbank prueft es).
 * Gast: Heute, Kalender, Programmplan und - mit dem Recht - die Auswertung. Ohne `room` fehlen Aufgaben, Chat, Seiten und
 * Social; ohne `results` die Auswertung; "Einrichten" nur, wer etwas einrichten darf.
 */
export function limitNavByRights(nav: WorkspaceNav, role: OrgRole | undefined, rights: OrgRights | undefined): WorkspaceNav {
  if (!role || !rights) return nav;
  const drop = new Set<WorkspaceItemKey>();
  if (role === "guest") {
    for (const key of ["tasks", "chat", "pages", "teams", "social", "funding", "follow", "content", "events", "myProgram"] as WorkspaceItemKey[]) drop.add(key);
  } else {
    if (!rights.room) for (const key of ["tasks", "chat", "pages", "social"] as WorkspaceItemKey[]) drop.add(key);
  }
  if (!rights.results) drop.add("report");
  const mayConfigure = role === "owner" || rights.invite || rights.teams || rights.profile || rights.plan;
  return {
    home: nav.home,
    groups: nav.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => !drop.has(item.key)) }))
      .filter((group) => group.items.length > 0),
    setup: mayConfigure && role !== "guest" ? nav.setup : null,
  };
}

/**
 * Die eigene Seitenleiste (20270331120000): ausgeblendete Stationen fallen weg, der Rest steht in der gewaehlten
 * Reihenfolge innerhalb seiner Gruppe. "Heute" und "Einrichten" bleiben immer; Gruppen ohne Station verschwinden.
 * Reine Darstellung: Suche, Links und Adressen erreichen auch ausgeblendete Stationen.
 */
export type NavPrefs = { hidden: string[]; order: string[] };
export const FIXED_NAV_KEYS: WorkspaceItemKey[] = ["home", "setup"];
export const NAV_ITEM_KEYS: WorkspaceItemKey[] = ["home", "tasks", "chat", "calendar", "pages", "teams", "plan", "social", "report", "funding", "follow", "content", "events", "setup", "myProgram"];

export function applyNavPrefs(nav: WorkspaceNav, prefs: NavPrefs | null): WorkspaceNav {
  if (!prefs) return nav;
  const rank = (key: string) => {
    const index = prefs.order.indexOf(key);
    return index === -1 ? prefs.order.length : index;
  };
  const visible = (item: WorkspaceNavItem) => FIXED_NAV_KEYS.includes(item.key) || !prefs.hidden.includes(item.key);
  return {
    home: nav.home,
    groups: nav.groups
      .map((group) => ({ ...group, items: group.items.filter(visible).map((item, index) => ({ item, index })).sort((a, b) => rank(a.item.key) - rank(b.item.key) || a.index - b.index).map((entry) => entry.item) }))
      .filter((group) => group.items.length > 0),
    setup: nav.setup,
  };
}

/** Die Stationen je Gruppe in der gewaehlten Reihenfolge - auch die ausgeblendeten (fuer die Einstellungsseite). */
export function orderedGroups(nav: WorkspaceNav, prefs: NavPrefs | null) {
  const order = prefs?.order ?? [];
  const rank = (key: string) => (order.indexOf(key) === -1 ? order.length : order.indexOf(key));
  return nav.groups.map((group) => ({ key: group.key, items: group.items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item.key) - rank(b.item.key) || a.index - b.index).map((entry) => entry.item) }));
}

/** Alle Eintraege in der Reihenfolge der Leiste - fuer Suche und "Mehr" auf dem Handy. */
export function flattenWorkspaceNav(nav: WorkspaceNav): WorkspaceNavItem[] {
  return [nav.home, ...nav.groups.flatMap((group) => group.items), ...(nav.setup ? [nav.setup] : [])];
}

/** Die fuenf Reiter unten auf dem Handy; der Rest steht unter "Mehr". Fehlt ein Eintrag (keine Organisation), faellt er weg. */
export const MOBILE_TAB_KEYS: WorkspaceItemKey[] = ["home", "tasks", "calendar", "chat"];

/**
 * "+ Neu": etwas von ueberall anlegen. Nur Ziele, die es gibt; die Formulare oeffnen als Panel auf der Seite
 * (`neu=` im Pfad). Ohne Organisation gibt es nichts anzulegen.
 */
export const QUICK_CREATE = [
  { key: "task", href: `${TEAMRAUM_BASE}/aufgaben?new=1` },
  { key: "event", href: `${CALENDAR_PATH}?neu=termin` },
  { key: "events", href: `${CALENDAR_PATH}?neu=liste` },
  { key: "post", href: `${CALENDAR_PATH}?neu=post` },
  { key: "message", href: `${TEAMRAUM_BASE}/chat` },
] as const;
