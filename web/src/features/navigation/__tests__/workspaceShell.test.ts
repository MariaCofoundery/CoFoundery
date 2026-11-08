import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  MOBILE_TAB_KEYS,
  QUICK_CREATE,
  buildWorkspaceNav,
  flattenWorkspaceNav,
  isWorkspacePath,
} from "@/features/navigation/workspace/workspaceNav";

/**
 * Arbeitsbereich mit Seitenleiste (Entwurf 05.11.2026): Teamraum und Programm sind EINE Leiste. Die Tests halten
 * fest, welche Seite welche Station markiert, dass nichts doppelt oder verwaist ist und dass Founder-Ansicht und
 * Connect ihre Leiste oben behalten.
 */

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const messages = (locale: string) => JSON.parse(source(`messages/${locale}/navigation.json`)).workspace as Record<string, unknown>;

const withOrg = buildWorkspaceNav({ hasOrg: true, chatUnread: 3 });
const activeKeys = (pathname: string, tab: string | null = null, nav = withOrg, view: string | null = null) => flattenWorkspaceNav(nav).filter((item) => item.match(pathname, tab, view)).map((item) => item.key);

test("die Stationen stehen in drei Gruppen: Arbeiten, Programm, Netzwerk", () => {
  assert.deepEqual(withOrg.groups.map((group) => group.key), ["work", "program", "network"]);
  assert.deepEqual(withOrg.groups[0].items.map((item) => item.key), ["tasks", "chat", "calendar", "pages"]);
  assert.deepEqual(withOrg.groups[1].items.map((item) => item.key), ["teams", "plan", "social", "report", "funding"]);
  assert.deepEqual(withOrg.groups[2].items.map((item) => item.key), ["follow", "content", "events"]);
  assert.equal(withOrg.home.key, "home");
  assert.equal(withOrg.setup?.key, "setup");
});

test("ohne Organisation gibt es keinen Teamraum und kein Programm - nur Begleitung, das Anlegen und Events", () => {
  const solo = buildWorkspaceNav({ hasOrg: false });
  assert.deepEqual(flattenWorkspaceNav(solo).map((item) => item.key), ["home", "follow", "myProgram", "events"]);
  assert.equal(solo.setup, null);
});

test("jede Seite markiert genau eine Station", () => {
  const cases: [string, string | null, string][] = [
    ["/advisor/dashboard", null, "home"],
    ["/advisor/los-gehts", null, "home"],
    ["/advisor/teamraum", null, "tasks"],
    ["/advisor/teamraum/aufgaben", null, "tasks"],
    ["/advisor/teamraum/wer-macht-was", null, "tasks"],
    ["/advisor/teamraum/chat", null, "chat"],
    ["/advisor/teamraum/chat/abc", null, "chat"],
    ["/advisor/kalender", null, "calendar"],
    ["/advisor/kalender", null, "calendar"],
    ["/advisor/teamraum/social-media", null, "social"],
    ["/advisor/teamraum/seiten", null, "pages"],
    ["/advisor/organisation", null, "teams"],
    ["/advisor/organisation", "program", "teams"],
    ["/advisor/programm/abc", null, "teams"],
    ["/advisor/organisation", "report", "report"],
    ["/advisor/organisation", "funding", "funding"],
    ["/advisor/organisation/foerderung", null, "funding"],
    ["/advisor/begleitung", null, "follow"],
    ["/advisor/person/abc", null, "follow"],
    ["/advisor/einladen", null, "follow"],
    ["/team-intake/abc", null, "follow"],
    ["/advisor/organisation", "materials", "content"],
    ["/advisor/organisation", "experts", "content"],
    ["/events", null, "events"],
    ["/events/neu", null, "events"],
    ["/advisor/organisation", "members", "setup"],
    ["/advisor/organisation", "features", "setup"],
    ["/advisor/organisation", "enroll", "setup"],
  ];
  for (const [pathname, tab, expected] of cases) assert.deepEqual(activeKeys(pathname, tab), [expected], `${pathname}${tab ? `?tab=${tab}` : ""}`);
  // Der Programmplan ist der Kalender mit ?ansicht=plan - eine eigene Station, nicht beide zugleich.
  assert.deepEqual(activeKeys("/advisor/kalender", null, withOrg, "plan"), ["plan"]);
  assert.deepEqual(activeKeys("/advisor/kalender", null, withOrg, "woche"), ["calendar"]);
});

test("der Chat-Zaehler steht am Chat, sonst nirgends", () => {
  assert.equal(flattenWorkspaceNav(withOrg).find((item) => item.key === "chat")?.badge, 3);
  assert.equal(flattenWorkspaceNav(withOrg).filter((item) => item.badge !== undefined).length, 1);
  assert.equal(flattenWorkspaceNav(buildWorkspaceNav({ hasOrg: true })).find((item) => item.key === "chat")?.badge, undefined);
});

test("die Seitenleiste tragen nur Advisor-Seiten, Events, Team-Runden, Postfach und Konto", () => {
  for (const pathname of ["/advisor/dashboard", "/advisor/kalender", "/events", "/events/neu", "/team-intake", "/messages", "/account"]) assert.equal(isWorkspacePath(pathname), true, pathname);
  for (const pathname of ["/dashboard", "/connect", "/connections", "/discovery", "/me/profile", "/teams/abc", "/admin", "/programm"]) assert.equal(isWorkspacePath(pathname), false, pathname);
});

test("+ Neu fuehrt nur an Ziele, die es gibt", () => {
  assert.deepEqual(QUICK_CREATE.map((entry) => entry.key), ["task", "event", "events", "post", "message"]);
  const stations = ["/advisor/teamraum/aufgaben", "/advisor/kalender", "/advisor/teamraum/chat"];
  for (const entry of QUICK_CREATE) assert.ok(stations.some((station) => entry.href.startsWith(station)), entry.href);
});

test("auf dem Handy bleiben vier Reiter und Mehr", () => {
  assert.deepEqual(MOBILE_TAB_KEYS, ["home", "tasks", "calendar", "chat"]);
});

test("Texte in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(messages("de")).sort(), keys(messages("en")).sort());
  const de = messages("de") as { items: Record<string, string>; create: Record<string, unknown> };
  for (const item of flattenWorkspaceNav(withOrg).concat(flattenWorkspaceNav(buildWorkspaceNav({ hasOrg: false })))) assert.ok(de.items[item.key], item.key);
  for (const entry of QUICK_CREATE) assert.ok(de.create[entry.key], entry.key);
});

test("die Seitenleiste ersetzt die Leiste oben nur in der Advisor-Ansicht", () => {
  const shell = source("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /const useWorkspace = hasAdvisor && resolvedActiveView === "advisor" && !isConnectOnly && !isSuspendedConnectOnly && isWorkspacePath\(pathname\);/);
  // Die Founder-Leiste mit ihren Bereichen steht weiter da.
  assert.match(shell, /<header className="sticky top-0 z-40 border-b border-slate-200\/80 bg-white\/78 backdrop-blur-xl print:hidden">/);
  // Der Arbeitsbereich ist reine Darstellung: kein Zugang haengt daran.
  assert.doesNotMatch(source("src/features/navigation/workspace/WorkspaceChrome.tsx"), /supabase|createClient|rpc\(/);
});

test("Seitenleiste, Kopfleiste, Reiter unten und Suche sind da - und nichts davon druckt", () => {
  const chrome = source("src/features/navigation/workspace/WorkspaceChrome.tsx");
  assert.match(chrome, /<aside aria-label=\{tw\("navLabel"\)\}[^>]*print:hidden/);
  assert.match(chrome, /<header className="sticky top-0 z-40[^"]*print:hidden/);
  assert.match(chrome, /<nav aria-label=\{tw\("tabsLabel"\)\}[^>]*lg:hidden/);
  assert.match(chrome, /event\.metaKey \|\| event\.ctrlKey/);
  // Die Suche sagt ehrlich, was sie durchsucht.
  assert.match(source("messages/de/navigation.json"), /Inhalte noch nicht/);
});

test("zwei Programme: das gewaehlte steht in der Seitenleiste, bleibt gemerkt und blendet die anderen aus", () => {
  const chrome = source("src/features/navigation/workspace/WorkspaceChrome.tsx");
  assert.match(chrome, /function ProgramSwitcher/);
  assert.match(chrome, /document\.cookie = `\$\{ACTIVE_ORG_COOKIE\}=\$\{id\}; path=\/; samesite=lax`/);
  assert.match(chrome, /next\.set\("org", id\)/);
  assert.match(chrome, /borderTopColor: color\.dot/);
  // Das Programm aus dem Cookie steht in allen Abfragen vorn; Heute und Events zeigen nur dieses.
  assert.match(source("src/features/advisor/orgData.ts"), /activeFirst\(list, activeId\)/);
  assert.match(source("src/app/(product)/advisor/dashboard/page.tsx"), /const orgs = allOrgs\.slice\(0, 1\);/);
  assert.match(source("src/app/(product)/events/page.tsx"), /getMyAdvisorOrgs\(client\)\)\.slice\(0, 1\)/);
  // Nur Darstellung: der Cookie ist kein Zugang.
  assert.doesNotMatch(source("src/features/advisor/activeOrg.ts"), /rpc\(|supabase/);
});
