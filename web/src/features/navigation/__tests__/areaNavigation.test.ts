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
    "areaAlign",
    "areaFind",
    "areaConnect",
    "advisorFollow",
    "advisorInvite",
  ]) {
    assert.match(shell, new RegExp(`label: t\\("${area}"\\)`), `${area} fehlt als Bereich`);
  }
  // Der Organisationseintrag zeigt bei genau einer Organisation deren Namen, sonst "Organisation".
  assert.match(shell, /label: advisorOrgLabel/);
  assert.match(shell, /advisorOrgNames\.length === 1[\s\S]*?: t\("advisorOrg"\)/);
  // Align ist seit der UX-Neuordnung (19.10.2026) wieder ein Bereich - mit Profil und Team in der zweiten Reihe.
  // (Produktentscheidung: drei Produktbereiche Align, Find, Connect; Start davor.)
  assert.match(shell, /label: t\("areaAlign"\)/);

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
    // Align ist wieder ein Bereich (19.10.2026): Fragebögen, Profil, Team und Library liegen darunter.
    assert.equal(navigation.areaAlign, "Align");
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
    // Seit 04.11.2026 in eigenem Baustein: "Dein naechster Schritt".
    readFileSync("src/features/dashboard/DashboardNextStep.tsx", "utf8"),
    /brand-panel/,
    // Seit der UX-Neuordnung (19.10.2026) ist der Hauptweg eine Marken-Flaeche (derselbe Verlauf, gross, weisse
    // Schrift) - eine Klasse in globals.css, nicht kopiert.
    "der Hauptweg im Kopfbereich nutzt die Marken-Flaeche"
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
  // Verbindungen: ein Bereich der Leiste (seit 04.11.2026 nicht mehr
  // zusaetzlich eingeklappt auf der Startseite), und "Teams & Verbindungen"
  // markiert sich dort.
  assert.match(source(SHELL), /href: "\/connections"/);
  assert.match(source(SHELL), /currentPathname === "\/connections"/);

  // Die begleiteten Teams des Advisors: stehen in der Leiste, weil das
  // Advisor-Dashboard nicht dorthin verlinkt. Seit Phase 9.4A als Eintrag
  // "Teams" im Advisor-Baum statt als Extra-Link.
  assert.doesNotMatch(
    source("src/app/(product)/advisor/dashboard/page.tsx"),
    /href="\/advisor\/report/,
    "sobald das Dashboard verlinkt, darf der Eintrag aus der Leiste"
  );
  assert.match(source(SHELL), /href: "\/advisor\/begleitung",\s*label: t\("advisorFollow"\)/);
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
  // GEAENDERT AM 04.11.2026: Der eingeklappte Teams-Block unten ist weg.
  // "Teams & Verbindungen" ist ein Bereich der Leiste; auf der Startseite steht
  // das gewaehlte Team in "Dein Stand" neben dem naechsten Schritt, mit Link,
  // und weitere Teams sind dort waehlbar.
  const dashboard = source("src/app/(product)/dashboard/page.tsx");
  const aside = source("src/features/dashboard/DashboardAside.tsx");
  const nextAt = dashboard.indexOf("<DashboardNextStep");
  assert.ok(nextAt > -1 && dashboard.indexOf("<DashboardWaiting") > nextAt, "was ansteht folgt dem naechsten Schritt");
  assert.ok(dashboard.indexOf("<DashboardAside") > nextAt, "die leise Spalte steht daneben");
  assert.match(aside, /<Link href=\{teamPath!\}/);
  assert.match(aside, /href=\{`\/dashboard\?team=\$\{encodeURIComponent\(other\.id\)\}`\}/);
  assert.match(source(SHELL), /href: "\/connections",\s*label: t\("alignTeam"\)/);
});


test("das Profil steht im Menue hinter dem Bild, und der Ort wird vorgelesen", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  // Seit 30.10.2026 steht der Eintrag nicht mehr in der Leiste, sondern im Menue hinter dem Bild
  // und im Mobilmenue (dort wird der Ort weiterhin vorgelesen).
  assert.match(shell, /href="\/me\/profile"[\s\S]{0,120}active=\{isProfilePath\(pathname\)\}/);
});

test("wer einer Organisation angehoert, sieht den Advisor-Bereich - ohne dass das Einsicht gibt", () => {
  const data = readFileSync("src/features/dashboard/dashboardRoleData.ts", "utf8");
  assert.match(data, /advisorOrgNames\.length > 0/);
  assert.match(data, /\.from\("advisor_org_members"\)[\s\S]*?\.eq\("status", "active"\)/);
  // Nur Namen werden gelesen, keine Mitglieder- oder Teamdaten.
  assert.match(data, /\.from\("advisor_orgs"\)\.select\("id, name"\)/);
});
