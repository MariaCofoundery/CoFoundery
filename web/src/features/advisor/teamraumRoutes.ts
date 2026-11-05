/**
 * Adressen des Teamraums. Seit dem 05.11.2026 ein eigener Bereich im Hauptmenue (Wunsch Maria: "ein eigener
 * Arbeitsraum") statt einer Reitergruppe der Organisation. Jeder Teil hat einen eigenen Pfad, damit die zweite
 * Reihe im Menue ihn erkennt; die Organisation steht als ?org= daneben.
 *
 * Alte Adressen (/advisor/organisation?tab=tasks, /advisor/organisation/chat?chat=...) stehen in gespeicherten
 * Hinweisen, Push-Mitteilungen und der gemerkten letzten Stelle. Sie werden weitergeleitet (legacyTeamraumPath).
 */
export const TEAMRAUM_SECTIONS = ["week", "tasks", "chat", "social", "pages", "who"] as const;
export type TeamraumSection = (typeof TEAMRAUM_SECTIONS)[number];

export const TEAMRAUM_BASE = "/advisor/teamraum";

const SEGMENT: Record<TeamraumSection, string> = {
  week: "",
  tasks: "aufgaben",
  chat: "chat",
  social: "social-media",
  pages: "seiten",
  who: "wer-macht-was",
};

export const isTeamraumSection = (value: unknown): value is TeamraumSection => (TEAMRAUM_SECTIONS as readonly unknown[]).includes(value);

export function teamraumPath(section: TeamraumSection) {
  return SEGMENT[section] ? `${TEAMRAUM_BASE}/${SEGMENT[section]}` : TEAMRAUM_BASE;
}

/** Ein Teil des Teamraums einer Organisation, mit weiteren Angaben (Filter, Ansicht, geoeffnete Aufgabe ...). Leere Angaben fallen weg. */
export function teamraumHref(section: TeamraumSection, orgId: string | null, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ ...(orgId ? { org: orgId } : {}), ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== "")) });
  const text = params.toString();
  return text ? `${teamraumPath(section)}?${text}` : teamraumPath(section);
}

/** Ein einzelnes Gespraech, als ganze Seite. */
export function teamraumChatHref(orgId: string, chatId: string, extra: Record<string, string> = {}) {
  return `${TEAMRAUM_BASE}/chat/${chatId}?${new URLSearchParams({ org: orgId, ...extra }).toString()}`;
}

/** Welcher Teil gehoert zu diesem Pfad? Fuer das Menue; ein Gespraech zaehlt zum Chat. */
export function teamraumSectionOfPath(pathname: string): TeamraumSection | null {
  if (pathname === TEAMRAUM_BASE) return "week";
  if (!pathname.startsWith(`${TEAMRAUM_BASE}/`)) return null;
  const segment = pathname.slice(TEAMRAUM_BASE.length + 1).split("/")[0];
  return TEAMRAUM_SECTIONS.find((section) => SEGMENT[section] === segment && segment !== "") ?? null;
}

/**
 * Eine alte Adresse der Organisation auf den Teamraum umschreiben: der Reiter wird zum Pfad, alles andere
 * bleibt. Keine Teamraum-Adresse: null.
 */
export function legacyTeamraumPath(query: Record<string, string | undefined>): string | null {
  if (!isTeamraumSection(query.tab)) return null;
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key !== "tab" && key !== "org" && typeof value === "string") extra[key] = value;
  }
  return teamraumHref(query.tab, query.org ?? null, extra);
}
