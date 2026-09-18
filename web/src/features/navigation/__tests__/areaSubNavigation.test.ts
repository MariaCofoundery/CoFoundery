import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const source = (path: string) => readFileSync(path, "utf8");
const SHELL = "src/features/navigation/ProductShell.tsx";
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
  const shell = source(SHELL);
  assert.match(shell, /activeAreaSubItems\.length > 0 \?/);
  assert.match(shell, /navigationItems\.find\(\(item\) => item\.isActive\(pathname\)\)\?\.subItems/);
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
// Der Weg zum Eigenen in Find
// ---------------------------------------------------------------------------
test("aus Find führt ein Weg zum eigenen Suchprofil", () => {
  const nav = source("src/features/discovery/DiscoveryMineNav.tsx");
  for (const href of ["/discovery/profile", "/discovery/searches", "/discovery/saved"]) {
    assert.ok(nav.includes(`"${href}"`), `${href} ist von Find aus nicht erreichbar`);
  }
  assert.match(nav, /aria-label=\{t\("mine\.label"\)\}/);
});

test("der Weg steht auf jeder Find-Seite, nicht nur auf der Übersicht", () => {
  // "Meine Suchen" war vorher überhaupt nur aus dem Speichern-Formular heraus
  // erreichbar - praktisch eine Sackgasse.
  for (const page of DISCOVERY_PAGES) {
    assert.match(source(page), /<DiscoveryMineNav \/>/, `${page} hat keinen Weg zum Eigenen`);
  }
});

test("Find und Connect zeigen denselben Weg an derselben Stelle", () => {
  // Zwei Bereiche, zwei Muster zu lernen, wäre die schlechtere Hälfte von
  // beidem. Beide Gruppen heißen gleich und sehen gleich aus.
  const find = source("src/features/discovery/DiscoveryMineNav.tsx");
  const connect = source("src/features/connect/ConnectMineNav.tsx");
  for (const shared of ["mine.label", "min-h-11", "focus-visible:ring-2", "rounded-full border"]) {
    assert.ok(find.includes(shared) && connect.includes(shared), `${shared} fehlt in einer der beiden`);
  }

  for (const locale of ["de", "en"]) {
    const discovery = JSON.parse(readFileSync(`messages/${locale}/discovery.json`, "utf8")) as {
      mine: Record<string, string>;
    };
    const connectCopy = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      mine: Record<string, string>;
    };
    assert.equal(
      discovery.mine.label,
      connectCopy.mine.label,
      `${locale}: die Gruppe heißt in Find anders als in Connect`
    );
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
