import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, string>;

const SHELL = "src/features/navigation/ProductShell.tsx";

/**
 * Drei Bereiche, und man sieht, in welchem man ist.
 *
 * Vorher standen fuenf Eintraege nebeneinander, die drei verschiedene Sorten
 * waren: Bereiche, ein Querschnitt (Profil) und eine Unterseite
 * (Verbindungen). Genau deshalb las sich die Leiste nicht als "ich bin hier".
 */

test("the bar carries areas, and only areas", () => {
  const shell = source(SHELL);
  const barStart = shell.indexOf('aria-label={t("navLabel")}');
  const barEnd = shell.indexOf("</nav>", barStart);
  assert.ok(barStart > -1 && barEnd > barStart);
  const bar = shell.slice(barStart, barEnd);

  // Align kommt ueber navigationItems in die Leiste, Find und Connect stehen
  // direkt darin - geprueft wird beides an seiner Stelle.
  assert.match(shell, /label: t\("areaAlign"\)/);
  assert.match(bar, /navigationItems\.map/);
  for (const area of ["areaFind", "areaConnect"]) {
    assert.match(bar, new RegExp(`t\\("${area}"\\)`), `${area} fehlt in der Leiste`);
  }
  // Ein Querschnitt und eine Unterseite gehoeren nicht dazwischen.
  assert.doesNotMatch(bar, /href="\/profile"/, "das Profil ist kein Bereich");
  assert.doesNotMatch(bar, /href="\/connections"/, "Verbindungen ist eine Seite in Align");
});

test("the three areas are named as one system", () => {
  for (const locale of ["de", "en"]) {
    const navigation = readJson(`messages/${locale}/navigation.json`);
    assert.equal(navigation.areaAlign, "Align");
    assert.equal(navigation.areaFind, "Find");
    assert.equal(navigation.areaConnect, "Connect");
  }
});

test("exactly one point is filled: the one you are standing on", () => {
  const shell = source(SHELL);
  // Der aktive Zustand war ein 18-Prozent-Schleier, und Discovery trug eine
  // Dauer-CTA-Farbe - das Auffaelligste zeigte nie den aktuellen Ort.
  assert.doesNotMatch(shell, /discoveryCtaClassName/);
  // Markenfarben: Lila als Grund, weisse Schrift, tuerkiser Ring - beides
  // die vorhandenen Tokens, damit die Leiste im Farbraum des Produkts bleibt.
  assert.match(shell, /var\(--brand-accent\)[\s\S]{0,120}font-semibold text-white/);
  assert.match(shell, /ring-2 ring-\[color:var\(--brand-primary\)\]/);
  assert.doesNotMatch(
    shell,
    /bg-\[color:var\(--brand-primary\)\]\/18/,
    "kein Farbschleier mehr als aktiver Zustand"
  );
});

test("being somewhere is announced, not only coloured", () => {
  const shell = source(SHELL);
  // Ohne aria-current ist "du bist hier" eine reine Farbaussage - fuer eine
  // Vorlesesoftware gaebe es den Ort nicht.
  const occurrences = shell.match(/aria-current=\{[^}]*"page"[^}]*\}/g) ?? [];
  assert.ok(occurrences.length >= 4, `aria-current fehlt: ${occurrences.length}`);
});

test("nothing was stranded by taking it out of the bar", () => {
  // Verbindungen: vom Dashboard verlinkt, und Align markiert sich dort.
  assert.match(source("src/app/(product)/dashboard/page.tsx"), /href="\/connections"/);
  assert.match(source(SHELL), /currentPathname === "\/connections"/);

  // Founder-Verbindungen des Advisors: bleibt in der Leiste, weil das
  // Advisor-Dashboard nicht dorthin verlinkt.
  assert.doesNotMatch(
    source("src/app/(product)/advisor/dashboard/page.tsx"),
    /href="\/advisor\/report/,
    "sobald das Dashboard verlinkt, darf der Eintrag aus der Leiste"
  );
  assert.match(source(SHELL), /t\("advisorConnections"\)/);
});

test("the routes did not move with the labels", () => {
  const shell = source(SHELL);
  // Beschriftungen und Adressen sind zwei Entscheidungen. Die Adressen stecken
  // in Magic Links, Lesezeichen, der Sitemap und in Rueckwegen.
  assert.match(shell, /href="\/discovery"/);
  assert.match(shell, /href="\/connect"/);
  assert.doesNotMatch(shell, /href="\/find"/);
  assert.doesNotMatch(shell, /href="\/align"/);
});

test("the language switch is a footnote, not a button pair", () => {
  const shell = source(SHELL);
  // Kuerzer und kleiner: DE/EN statt "Deutsch"/"English", 11px statt 12px.
  assert.match(shell, /t\(`language\.short\.\$\{item\}`\)/);
  assert.match(shell, /text-\[11px\]/);

  // Die Fahne ist Schmuck und aria-hidden. Der volle Name steht im title -
  // eine Vorlesesoftware soll nicht "DE Flagge Deutschland" sagen, und eine
  // Sprache ist ohnehin kein Land.
  assert.match(shell, /<span aria-hidden>\{t\(`language\.flag\./);
  assert.match(shell, /title=\{t\(`language\.\$\{item\}`\)\}/);

  for (const locale of ["de", "en"]) {
    const common = JSON.parse(readFileSync(`messages/${locale}/common.json`, "utf8")) as {
      language: { short: Record<string, string>; flag: Record<string, string>; de: string };
    };
    assert.equal(common.language.short.de, "DE");
    assert.equal(common.language.short.en, "EN");
    assert.ok(common.language.flag.de.length > 0);
    // Der volle Name bleibt erhalten - er traegt jetzt den title.
    assert.ok(common.language.de.length > 2);
  }
});

test("the connections are reachable from the top of Align", () => {
  const dashboard = source("src/app/(product)/dashboard/page.tsx");
  const heroAt = dashboard.indexOf("data-dashboard-hero");
  const linkAt = dashboard.indexOf('href="/connections"');
  const quoteAt = dashboard.indexOf("hero.quoteEyebrow");
  assert.ok(heroAt > -1 && linkAt > heroAt, "der Weg steht im Kopfbereich");
  assert.ok(linkAt < quoteAt, "und noch vor dem Zitat, nicht darunter");
  assert.match(dashboard, /hero\.heroConnectionsCount/, "mit der Zahl, nicht nur als Wort");
});
