import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const source = (path: string) => readFileSync(path, "utf8");
const SHELL = "src/features/navigation/ProductShell.tsx";
const CONNECT_PAGES = [
  "src/app/(product)/connect/page.tsx",
  "src/app/(product)/connect/problems/page.tsx",
  "src/app/(product)/connect/people/page.tsx",
  "src/app/(product)/connect/suggestions/page.tsx",
];
const DISCOVERY_PAGES = [
  "src/app/(product)/discovery/page.tsx",
  "src/app/(product)/discovery/saved/page.tsx",
  "src/app/(product)/discovery/searches/page.tsx",
  "src/app/(product)/discovery/intros/page.tsx",
];

// ---------------------------------------------------------------------------
// Die zweite Ebene in der Leiste
// ---------------------------------------------------------------------------
test("Align hat eigene Unterseiten in der Leiste", () => {
  // Bis 19.09.2026 war Align der einzige Bereich ohne eigene Navigation:
  // Verbindungen und Library waren nur vom Dashboard aus erreichbar. Wer
  // woanders stand, musste erst dorthin zurück.
  const shell = source(SHELL);
  assert.match(shell, /subItems/);
  assert.match(shell, /href: "\/connections"/);
  assert.match(shell, /href: "\/founder-library"/);
  assert.match(shell, /activeAreaSubItems/);
});

test("die Unterseiten stehen in einer eigenen Reihe, nicht neben den Bereichen", () => {
  // Der Punkt der ganzen Uebung: Vorher standen fünf Einträge nebeneinander,
  // die drei verschiedene Sorten waren - Bereiche, ein Querschnitt und eine
  // Unterseite. Genau deshalb las sich die Leiste nicht als "ich bin hier".
  // Eine zweite Ebene löst das, ohne die Seiten zu verstecken.
  const shell = source(SHELL);
  const mainNav = shell.indexOf('aria-label={t("navLabel")}');
  const subNav = shell.indexOf('aria-label={t("subNavLabel")}');
  assert.ok(mainNav > 0 && subNav > 0, "eine der beiden Navigationen fehlt");
  assert.ok(subNav > mainNav, "die Unterseiten stehen vor den Bereichen");

  // Und sie ist benannt - sonst ist es die zweite namenlose Navigation
  // direkt unter der ersten.
  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8")) as Record<string, string>;
    for (const key of ["subNavLabel", "alignConnections", "alignLibrary"]) {
      assert.ok(nav[key], `${locale}: ${key} fehlt`);
    }
  }
});

test("die Reihe erscheint nur im aktiven Bereich", () => {
  // Eine leere Leiste wäre ein Balken ohne Aussage.
  //
  // GEAENDERT AM 30.09.2026: Hier stand der Ausdruck woertlich
  // (`navigationItems.find(...)?.subItems`). Seit die Brotkrumenzeile
  // denselben aktiven Bereich braucht, steht er einmal als `activeArea` da -
  // die Pruefung haengt jetzt an der Sache und nicht an der Schreibweise.
  const shell = source(SHELL);
  assert.match(shell, /activeAreaSubItems\.length > 0 \?/);
  assert.match(shell, /const activeArea = navigationItems\.find\(\(item\) => item\.isActive\(pathname\)\)/);
  assert.match(shell, /const activeAreaSubItems = activeArea\?\.subItems/);
});

test("Align leuchtet auch in der Library, weil sie dort hingehört", () => {
  // Sonst würde der Bereich ausgehen, sobald man einem seiner eigenen
  // Unterpunkte folgt - und die zweite Reihe gleich mit verschwinden.
  const shell = source(SHELL);
  assert.match(shell, /currentPathname\.startsWith\("\/founder-library"\)/);
  assert.equal(isProductChromePath("/founder-library"), true);
  assert.equal(isProductChromePath("/founder-library/cliff"), true);
});

test("die Advisor-Ansicht bekommt die Align-Unterseiten nicht", () => {
  // Verbindungen und Library sind Founder-Seiten. In der Advisor-Ansicht
  // führte der Link ins Leere beziehungsweise auf eine Weiterleitung.
  assert.match(source(SHELL), /resolvedActiveView === "advisor"\s*\?\s*undefined/);
});

// ---------------------------------------------------------------------------
// Eine Regel fuer alle drei Bereiche
// ---------------------------------------------------------------------------
//
// GEWUENSCHT AM 30.09.2026: "Wenn das Menue tatsaechlich einheitlich ist, so
// wie wir das bei Align gemacht haben, fuer diese anderen beiden Bereiche
// auch, dann ist das ordentlicher."
//
// Vorher hatte ALIGN seine Ziele in der Leiste, FIND und Connect je eine
// eigene Reihe auf der Seite - drei Bereiche, zwei Muster, und auf den
// Unterseiten fehlte die Reihe teilweise ganz.
//
// Die Regel: ZIELE in die Leiste, AUSSCHNITTE auf die Seite.

test("alle drei Bereiche tragen ihre Ziele in der Leiste", () => {
  const shell = source(SHELL);
  for (const href of [
    // Align
    "/me/profile",
    "/connections",
    "/founder-library",
    // Find
    "/discovery/suche",
    "/discovery/profile",
    "/discovery/searches",
    // Connect
    "/connect",
    "/connect/my",
    "/connect/suggestions",
  ]) {
    assert.ok(shell.includes(`href: "${href}"`), `${href} steht nicht in der Leiste`);
  }
});

test("die eigenen Reihen auf den Seiten sind weg", () => {
  // Zwei Wege zu denselben Seiten heissen, dass man sich angewoehnt, in
  // beiden zu suchen.
  for (const weg of [
    "src/features/discovery/DiscoveryMineNav.tsx",
    "src/features/connect/ConnectMineNav.tsx",
  ]) {
    assert.ok(!existsSync(weg), `${weg} gibt es noch`);
  }
  for (const page of [...DISCOVERY_PAGES, ...CONNECT_PAGES]) {
    const text = source(page);
    assert.ok(!/MineNav/.test(text), `${page} traegt noch eine eigene Reihe`);
  }
});

test("Ausschnitte bleiben auf der Seite - und auf jeder, zu der sie gehoeren", () => {
  // "Fuer dich", "Suchen & filtern" und "Gemerkte" sind drei Blicke auf
  // dieselben Profile und keine drei Orte. Die Spec nennt sie in Abschnitt 2
  // als gleichrangige Reiter - das sind sie, nur auf der Flaeche.
  const tabs = source("src/features/discovery/FindTabs.tsx");
  for (const href of ["/discovery", "/discovery?mode=search", "/discovery/saved"]) {
    assert.ok(tabs.includes(`"${href}"`), `${href} fehlt in der Reiterreihe`);
  }
  for (const page of [
    "src/app/(product)/discovery/page.tsx",
    "src/app/(product)/discovery/saved/page.tsx",
  ]) {
    assert.match(source(page), /<FindTabs/, `${page} hat keine Reiterreihe`);
  }

  // Connect macht es genauso - und behaelt seine Zaehler, weil ein Reiter
  // ohne Zahl einen ins Leere klicken laesst.
  assert.match(source("src/features/connect/ConnectTabs.tsx"), /tabs\.map/);
});

test("die Leiste benennt jedes Ziel in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8")) as Record<
      string,
      string
    >;
    for (const key of [
      "findYourSearch",
      "findProfile",
      "findSearches",
      "connectProfile",
      "connectListings",
      "connectVentures",
      "connectSuggestions",
    ]) {
      assert.ok(nav[key], `${locale}: ${key} fehlt`);
    }
  }
});

test("der doppelte Weg auf der Find-Übersicht ist weg", () => {
  // Vorher stand "Profil bearbeiten" als Knopf unter dem Titel. Zusätzlich zur
  // Gruppe wären es zwei Wege zum selben Ziel, direkt übereinander.
  const page = source(DISCOVERY_PAGES[0]);
  assert.equal(
    (page.match(/href="\/discovery\/profile"/g) ?? []).length,
    0,
    "die alte Knopfreihe steht noch da"
  );
  // "Anfragen" bleibt: Das ist ein Eingang, kein eigener Besitz.
  assert.match(page, /href="\/discovery\/intros"/);
});
