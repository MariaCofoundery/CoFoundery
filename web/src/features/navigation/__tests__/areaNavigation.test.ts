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

  // Seit dem 20.09.2026 gibt es ZWEI Ansichten derselben Bereiche: die Pillen
  // ab 1024 Pixeln und das aufklappbare Menue darunter. Beide lesen
  // `navigationItems` - deshalb prueft dieser Test die Liste und nicht mehr
  // das JSX einer der beiden Ansichten.
  // Seit Phase 9.4A: Founder-Baum (Start, Profil, Teams & Verbindungen, Find,
  // Connect) und Advisor-Baum (Start, Personen & Gruppen, Teams, Intake).
  for (const area of [
    "areaStart",
    "areaProfile",
    "areaTeams",
    "areaFind",
    "areaConnect",
    "advisorPeople",
    "advisorTeams",
    "advisorIntake",
  ]) {
    assert.match(shell, new RegExp(`label: t\\("${area}"\\)`), `${area} fehlt als Bereich`);
  }
  // Kein globales Align mehr.
  assert.doesNotMatch(shell, /t\("areaAlign"\)/);

  // In der zusammengesetzten Liste stehen nur benannte Eintraege. Stuende dort
  // eine Adresse, waere sie in genau einer der beiden Ansichten sichtbar.
  const assembledAt = shell.indexOf("const navigationItems: NavigationItem[] = [");
  const subItemsAt = shell.indexOf("const activeAreaSubItems");
  assert.ok(assembledAt > -1 && subItemsAt > assembledAt);
  assert.doesNotMatch(
    shell.slice(assembledAt, subItemsAt),
    /href/,
    "ein Bereich steht direkt in der Liste statt als benannter Eintrag"
  );

  // Ein Querschnitt und eine Unterseite gehoeren nicht zwischen die Bereiche.
  const barStart = shell.indexOf('aria-label={t("navLabel")}');
  const barEnd = shell.indexOf("</nav>", barStart);
  assert.ok(barStart > -1 && barEnd > barStart);
  const bar = shell.slice(barStart, barEnd);
  assert.match(bar, /navigationItems\.map/);
  assert.doesNotMatch(bar, /href="\/profile"/, "das Profil ist kein Bereich");
  assert.doesNotMatch(bar, /href="\/connections"/, "Verbindungen ist ein Bereichseintrag, kein Extra-Link");
});

test("the areas are named as one system", () => {
  for (const locale of ["de", "en"]) {
    const navigation = readJson(`messages/${locale}/navigation.json`);
    assert.equal(navigation.areaFind, "Find");
    assert.equal(navigation.areaConnect, "Connect");
    assert.equal(navigation.areaStart, "Start");
    // Align ist als Sammelbereich entfallen (Phase 9.4A).
    assert.equal(navigation.areaAlign, undefined);
  }
});

test("exactly one point is filled: the one you are standing on", () => {
  const shell = source(SHELL);
  // Der aktive Zustand war ein 18-Prozent-Schleier, und Discovery trug eine
  // Dauer-CTA-Farbe - das Auffaelligste zeigte nie den aktuellen Ort.
  assert.doesNotMatch(shell, /discoveryCtaClassName/);
  // Markenfarben, aber zurueckhaltend: ein weicher Verlauf von Lila nach
  // Tuerkis, die Schrift im Lila, die Kante eine Haarlinie im Inneren. Die
  // erste Fassung hatte Vollton, Ring UND Schatten - drei laute Signale
  // gleichzeitig, den ganzen Tag im Blickfeld.
  assert.match(shell, /active \? "brand-here font-semibold"/);
  const css = readFileSync("src/app/globals.css", "utf8");
  const rule = css.slice(css.indexOf(".brand-here {"), css.indexOf("}", css.indexOf(".brand-here {")));
  assert.match(rule, /linear-gradient/);
  assert.match(rule, /rgba\(124, 58, 237/, "das Lila");
  assert.match(rule, /rgba\(103, 232, 249/, "das Tuerkis");
  assert.doesNotMatch(rule, /color: #fff|color: white/, "keine weisse Schrift mehr");

  // Und eine Stelle fuer beide Orte, sonst laufen sie auseinander.
  assert.match(
    readFileSync("src/app/(product)/dashboard/page.tsx", "utf8"),
    /brand-here/,
    "der Hauptweg im Kopfbereich nutzt dieselbe Klasse"
  );
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
  // Verbindungen: vom Dashboard verlinkt, und "Teams & Verbindungen" markiert
  // sich dort.
  assert.match(source("src/app/(product)/dashboard/page.tsx"), /href="\/connections"/);
  assert.match(source(SHELL), /currentPathname === "\/connections"/);

  // Die begleiteten Teams des Advisors: stehen in der Leiste, weil das
  // Advisor-Dashboard nicht dorthin verlinkt. Seit Phase 9.4A als Eintrag
  // "Teams" im Advisor-Baum statt als Extra-Link.
  assert.doesNotMatch(
    source("src/app/(product)/advisor/dashboard/page.tsx"),
    /href="\/advisor\/report/,
    "sobald das Dashboard verlinkt, darf der Eintrag aus der Leiste"
  );
  assert.match(source(SHELL), /href: resolvedMatchingHref,\s*label: t\("advisorTeams"\)/);
});

test("the routes did not move with the labels", () => {
  const shell = source(SHELL);
  // Beschriftungen und Adressen sind zwei Entscheidungen. Die Adressen stecken
  // in Magic Links, Lesezeichen, der Sitemap und in Rueckwegen.
  // href[:=]: Die Bereiche stehen als Liste (href: "..."), alles andere
  // weiterhin als Attribut im JSX (href="...").
  assert.match(shell, /href[:=]\s*"\/discovery"/);
  assert.match(shell, /href[:=]\s*"\/connect"/);
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
  // Seit 05.10.2026 im Kopf am Rechner erst ab 2xl (compact), im Menue immer.
  assert.match(shell, /<span aria-hidden className=\{compact \? "hidden 2xl:inline" : undefined\}>\{t\(`language\.flag\./);
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

test("the connections are reachable near the top of the dashboard", () => {
  // GEAENDERT IN PHASE 9.4A: Der Kopfbereich traegt keine drei Wege mehr. Die
  // Teams und Verbindungen sind der erste Inhaltsbereich nach dem, was
  // ansteht - und ein eigener Bereich in der Leiste.
  const dashboard = source("src/app/(product)/dashboard/page.tsx");
  const tasksAt = dashboard.indexOf('id="dashboard-block-tasks"');
  const teamsAt = dashboard.indexOf('id="dashboard-block-connections"');
  const linkAt = dashboard.indexOf('href="/connections"', teamsAt);
  const profileAt = dashboard.indexOf('id="dashboard-block-profile"');
  assert.ok(tasksAt > -1 && teamsAt > tasksAt, "Teams folgen direkt auf das, was ansteht");
  assert.ok(linkAt > teamsAt && linkAt < profileAt, "der Weg zu allen Verbindungen steht im Teams-Bereich");
  assert.match(source(SHELL), /href: "\/connections",\s*label: t\("areaTeams"\)/);
});

test("auch Profil leuchtet auf, wenn man dort ist", () => {
  // Maria am 18.09.2026: Der Reiter Profil war auf /profile praktisch nicht zu
  // erkennen - er trug ein blasses Grau, waehrend die Bereiche den
  // Markenverlauf tragen. "Ich bin hier" ist dieselbe Aussage, egal ob der Ort
  // ein Bereich oder ein Querschnitt ist.
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const navLink = shell.slice(
    shell.indexOf("function navLinkClassName"),
    shell.indexOf("function ConnectAttentionBadge")
  );
  assert.match(navLink, /brand-here font-semibold/);
  assert.doesNotMatch(navLink, /bg-slate-100 text-slate-950/);

  // Und der Ort wird weiterhin auch vorgelesen, nicht nur gefaerbt.
  assert.match(shell, /href="\/profile"[\s\S]{0,120}aria-current=\{pathname\.startsWith\("\/profile"\) \? "page"/);
});
