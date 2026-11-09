import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONNECT_PHONE_TABS,
  FIXED_FOUNDER_KEYS,
  FOUNDER_AREA_KEYS,
  applyFounderPrefs,
  orderedFounderKeys,
  searchTargets,
  splitConnectTabs,
  trailOf,
  type FounderNavItem,
} from "@/features/navigation/founder/founderNav";

const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

const item = (key: FounderNavItem["key"], extra: Partial<FounderNavItem> = {}): FounderNavItem => ({ key, href: `/${key}`, label: key, active: false, ...extra });
const items = FOUNDER_AREA_KEYS.map((key) => item(key));

test("die eigene Leiste: ausgeblendete fallen weg, Start bleibt immer vorn", () => {
  assert.deepEqual(applyFounderPrefs(items, null).map((entry) => entry.key), ["home", "align", "find", "connect", "events"]);
  assert.deepEqual(applyFounderPrefs(items, { hidden: ["find", "events"], order: [] }).map((entry) => entry.key), ["home", "align", "connect"]);
  // Start lässt sich nicht ausblenden - auch nicht, wenn es drinsteht.
  assert.ok(applyFounderPrefs(items, { hidden: ["home"], order: [] }).some((entry) => entry.key === "home"));
  assert.deepEqual(FIXED_FOUNDER_KEYS, ["home"]);
  // Reihenfolge: gewählte zuerst, der Rest in der Voreinstellung; Start bleibt trotzdem vorn.
  assert.deepEqual(applyFounderPrefs(items, { hidden: [], order: ["events", "connect"] }).map((entry) => entry.key), ["home", "events", "connect", "align", "find"]);
  assert.deepEqual(applyFounderPrefs(items, { hidden: [], order: ["home", "connect"] }).map((entry) => entry.key)[0], "home");
});

test("die Einstellungsseite sieht auch ausgeblendete Bereiche, in der gewählten Reihenfolge", () => {
  assert.deepEqual(orderedFounderKeys({ hidden: ["find"], order: ["events", "find"] }), ["home", "events", "find", "align", "connect"]);
  // Ohne Connect-Mitgliedschaft gibt es den Bereich in der Liste nicht.
  assert.ok(!orderedFounderKeys(null, ["home", "align", "find", "events"]).includes("connect"));
});

test("Connect allein: vier Reiter wie im Entwurf, der Rest unter Mehr", () => {
  const children = ["/connect", "/connect/people", "/connect/problems", "/connect/ventures", "/connect/contacts", "/connect/my"].map((href) => ({ href }));
  const { tabs, more } = splitConnectTabs(children);
  assert.deepEqual(tabs.map((entry) => entry.href), CONNECT_PHONE_TABS);
  assert.deepEqual(more.map((entry) => entry.href), ["/connect/problems", "/connect/ventures"]);
});

test("Ort und Suche kommen aus den Bereichen der Leiste", () => {
  const nav = [
    item("home"),
    item("connect", { active: true, children: [{ href: "/connect", label: "Entdecken", active: false }, { href: "/connect/people", label: "Menschen", active: true }] }),
  ];
  assert.deepEqual(trailOf(nav), ["connect", "Menschen"]);
  assert.deepEqual(trailOf([item("home")]), []);
  assert.deepEqual(trailOf([item("home", { active: true })]), ["home"]);
  const targets = searchTargets(nav);
  assert.deepEqual(targets.map((entry) => entry.label), ["home", "connect", "Entdecken", "Menschen"]);
  assert.equal(targets[3].parent, "connect");
});

test("die Shell: Founder-Ansicht und Connect allein bekommen die Seitenleiste, sonst bleibt alles wie es war", () => {
  const shell = code("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /const useFounderShell = !useWorkspace && !isSuspendedConnectOnly && \(isConnectOnly \|\| \(isFounderView && hasFounder\)\)/);
  // Die Bereiche haben eine Quelle: navigationItems. Die Leiste liest sie, sie baut keine eigenen.
  assert.match(shell, /navigationItems\.flatMap\(\(item\) =>\s*item\.key/);
  for (const key of ["home", "align", "find", "connect", "events"]) assert.match(shell, new RegExp(`key: "${key}"`), key);
  // Beide Seitenleisten teilen sich dieselben Werkzeuge rechts oben.
  assert.equal((shell.match(/slots=\{chromeSlots\}/g) ?? []).length, 2);
  // Die alte Leiste oben bleibt für alle übrigen (z. B. Advisor ausserhalb des Arbeitsbereichs, gesperrtes Connect).
  assert.match(shell, /<header className="sticky top-0 z-40 border-b border-slate-200\/80/);
  // Die Pop-ups der Plattform und die Einwilligung gibt es in beiden.
  const founder = shell.slice(shell.indexOf("<FounderChrome"), shell.indexOf("</FounderChrome>"));
  assert.match(founder, /<AnnouncementPopup \/>/);
  assert.match(founder, /ResearchConsentNotice/);
});

test("die Leiste: Reiter nur auf dem Handy, Unterpunkte nur beim aktiven Bereich, keine Rechte aus der Anzeige", () => {
  const chrome = code("src/features/navigation/founder/FounderChrome.tsx");
  // Die Reiterleiste darf nicht per style auf `display` gesetzt werden - das hebt lg:hidden auf.
  assert.match(chrome, /className="fixed inset-x-0 bottom-0 z-40 grid [^"]*min-\[700px\]:hidden"/);
  assert.doesNotMatch(chrome, /style=\{\{ display:/);
  assert.match(chrome, /folded\[item\.key\] \?\? item\.active/);
  // Bei Connect allein gibt es keine eigene Leiste zum Anpassen.
  assert.match(chrome, /connectOnly \? null : \(\s*<Link href="\/me\/seitenleiste"/);
  assert.doesNotMatch(chrome, /has(Founder|Advisor|Connect)\b/);
});

test("ausblenden und sortieren: nur eigene Zeile, nur bekannte Bereiche, Start nie", () => {
  const sql = readFileSync("../supabase/migrations/20270402120000_founder_nav_prefs.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /array\['home', 'align', 'find', 'connect', 'events'\]/);
  assert.match(sql, /'home' = any \(v_hidden\)/);
  assert.match(sql, /on delete cascade/);
  const actions = code("src/features/navigation/founder/founderNavPrefsActions.ts");
  assert.match(actions, /FIXED_FOUNDER_KEYS\.includes\(key\)/);
  assert.match(actions, /save_founder_nav_prefs/);
  assert.match(actions, /is_network_member/);
  // Die Seite führt Menschen ohne Founder-Rolle weg.
  assert.match(code("src/app/me/seitenleiste/page.tsx"), /if \(!roleViews\.hasFounder\) redirect\(/);
  // Der Datenexport kennt die Tabelle.
  assert.match(code("src/features/account/accountExport.ts"), /table: "founder_nav_prefs"/);
});

test("deutsch und englisch haben dieselben Schlüssel für die Founder-Leiste", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/navigation.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/navigation.json", "utf8"));
  assert.deepEqual(keys(de.founder).sort(), keys(en.founder).sort());
  assert.deepEqual(keys(de.settings).sort(), keys(en.settings).sort());
});
