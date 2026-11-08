/**
 * Die Seitenleiste fuer Founder, Find und Connect (Entwurf vom 08.11.2026, Variante A, freigegeben).
 *
 * Reine Darstellung: Die Bereiche und ihre Unterpunkte kommen aus der Navigation der ProductShell (eine Quelle),
 * hier steht nur, wie sie in der Leiste angeordnet werden - inklusive "selbst einrichten" (ausblenden, sortieren),
 * wie im Advisor-Bereich. Nichts davon gibt Zugang oder nimmt ihn: Jede Seite prueft ihren Zugang selbst, und ein
 * ausgeblendeter Bereich bleibt ueber Suche, Links und Adresse erreichbar.
 */

/** Die Bereiche der Leiste. "home" (Start) bleibt immer. */
export const FOUNDER_AREA_KEYS = ["home", "align", "find", "connect", "events"] as const;
export type FounderAreaKey = (typeof FOUNDER_AREA_KEYS)[number];

/** Start laesst sich nicht ausblenden - sonst sperrt man sich aus der eigenen Leiste aus. */
export const FIXED_FOUNDER_KEYS: FounderAreaKey[] = ["home"];

export type FounderNavChild = {
  href: string;
  /** Nur fuer Konten mit Connect allein: dort sind die Unterpunkte die Leiste und die Reiter unten. */
  icon?: string;
  label: string;
  active: boolean;
  count?: { value: number; label: string };
};

export type FounderNavItem = {
  key: FounderAreaKey;
  href: string;
  label: string;
  active: boolean;
  badge?: { value: number; label: string };
  children?: FounderNavChild[];
};

export type FounderNavPrefs = { hidden: string[]; order: string[] };

/** Ausgeblendete fallen weg ("Start" nie), der Rest steht in der gewaehlten Reihenfolge. "Start" bleibt vorn. */
export function applyFounderPrefs<T extends { key: string }>(items: T[], prefs: FounderNavPrefs | null): T[] {
  if (!prefs) return items;
  const rank = (key: string) => {
    const index = prefs.order.indexOf(key);
    return index === -1 ? prefs.order.length : index;
  };
  return items
    .filter((item) => (FIXED_FOUNDER_KEYS as string[]).includes(item.key) || !prefs.hidden.includes(item.key))
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aFixed = (FIXED_FOUNDER_KEYS as string[]).includes(a.item.key);
      const bFixed = (FIXED_FOUNDER_KEYS as string[]).includes(b.item.key);
      if (aFixed !== bFixed) return aFixed ? -1 : 1;
      return rank(a.item.key) - rank(b.item.key) || a.index - b.index;
    })
    .map((entry) => entry.item);
}

/** Die Bereiche in der gewaehlten Reihenfolge, ohne etwas auszublenden - fuer die Einstellungsseite. */
export function orderedFounderKeys(prefs: FounderNavPrefs | null, available: FounderAreaKey[] = [...FOUNDER_AREA_KEYS]): FounderAreaKey[] {
  return applyFounderPrefs(
    available.map((key) => ({ key })),
    prefs ? { hidden: [], order: prefs.order } : null,
  ).map((entry) => entry.key);
}

/**
 * Die vier Reiter unten auf dem Handy; der Rest steht unter "Mehr". Mit Bereichen: die ersten vier der Leiste
 * (Start, Align, Find, Connect in der Voreinstellung). Nur Connect: die ersten vier Unterpunkte, denn dort ist
 * Connect der ganze Raum.
 */
export const PHONE_TAB_COUNT = 4;

/** Connect allein auf dem Handy: diese vier stehen unten, Probleme und Unternehmen & Projekte unter "Mehr". */
export const CONNECT_PHONE_TABS = ["/connect", "/connect/people", "/connect/contacts", "/connect/my"];

/** Teilt die Unterpunkte von Connect in die Reiter unten und den Rest unter "Mehr". Reihenfolge der Reiter: wie oben. */
export function splitConnectTabs<T extends { href: string }>(children: T[]): { tabs: T[]; more: T[] } {
  const tabs = CONNECT_PHONE_TABS.flatMap((href) => children.filter((child) => child.href === href));
  return { tabs, more: children.filter((child) => !CONNECT_PHONE_TABS.includes(child.href)) };
}

/** Die Eintraege, die Suche und "Mehr" kennen: Bereiche und ihre Unterpunkte, in der Reihenfolge der Leiste. */
export function searchTargets(items: FounderNavItem[]): { key: string; label: string; href: string; parent?: string }[] {
  return items.flatMap((item) => [
    { key: item.key, label: item.label, href: item.href },
    ...(item.children ?? []).map((child) => ({ key: `${item.key}-${child.href}`, label: child.label, href: child.href, parent: item.label })),
  ]);
}

/** Der Ort fuer die Kopfzeile: "Connect › Menschen". Nur, was die Leiste selbst auch weiss. */
export function trailOf(items: FounderNavItem[]): string[] {
  const area = items.find((item) => item.active);
  if (!area) return [];
  const child = area.children?.find((entry) => entry.active);
  return child ? [area.label, child.label] : [area.label];
}
