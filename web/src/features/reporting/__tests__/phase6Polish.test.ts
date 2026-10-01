import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Phase 6 - der letzte Polish, festgehalten.
 *
 * Jede Zusage hier ist eine Entscheidung aus `docs/profile-phase-6-final-polish.md`.
 * Sie stehen beisammen, damit niemand eine davon zurueckdreht, ohne den
 * Bericht dazu zu lesen.
 */

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const messages = (locale: string, file: string) =>
  JSON.parse(source(join("messages", locale, `${file}.json`)));

const MAPS = join("src", "features", "instruments", "align", "AlignMaps.tsx");
const DRUCK = join("src", "app", "me", "profile", "print", "page.tsx");
const DAS_BIST_DU = join("src", "app", "me", "profile", "page.tsx");

test("die WorkMap ist im Druck dichter - mit denselben Daten", () => {
  // Beide Druckfassungen nehmen die dichte Karte, die Bildschirmseite nicht.
  assert.match(codeOnly(DRUCK), /<WorkMap sections=\{workProfile\.sections\} density="print" \/>/);
  assert.match(codeOnly(DAS_BIST_DU), /<WorkMap sections=\{workProfile\.sections\} \/>/);

  // Dieselben Zeilen, dieselbe Beschriftung, dieselbe Punktreihe, dieselbe
  // Antwort - die Dichte aendert nur Abstaende und Spalten.
  const karte = codeOnly(MAPS);
  const workMap = karte.slice(karte.indexOf("export async function WorkMap"), karte.indexOf("export async function DifferenceMap"));
  assert.equal([...workMap.matchAll(/group\.rows\.map\(/g)].length, 1, "die dichte Fassung hat eigene Zeilen");
  assert.equal([...workMap.matchAll(/<Punktreihe /g)].length, 1);
  assert.match(workMap, /row\.ordinal\.label/);
  assert.match(workMap, /kurz\(row\.itemId\)/);
  // Ein Thema bricht nie ueber zwei Spalten.
  assert.match(workMap, /break-inside-avoid/);

  // Keine Zahl, kein Mittelwert - auch nicht in der dichten Fassung.
  assert.doesNotMatch(workMap, /toFixed|reduce\(|mean|average|score/i);
});

test("der fruehere Bericht heisst nirgends mehr aktuell", () => {
  for (const locale of ["de", "en"]) {
    const chrome = messages(locale, "report").individual;
    assert.ok(chrome.sections.profileThen, locale);
    assert.ok(chrome.labels.dimensionOverviewTitleThen, locale);
    assert.doesNotMatch(chrome.sections.profileThen + chrome.labels.dimensionOverviewTitleThen, /aktuell|gerade|current|now/i);
  }
  // Ueberall, wo er als Altbestand steht.
  assert.match(codeOnly(DAS_BIST_DU), /<SelfReportView[^\n]{0,160}legacy \/>/);
  assert.match(codeOnly(DRUCK), /<SelfReportView[^\n]{0,160}legacy \/>/);
});

test("die Einschraenkungshinweise stehen je einmal", () => {
  for (const locale of ["de", "en"]) {
    const align = messages(locale, "alignment");
    // Der Satz unter der Synthese sagt es - die Einleitung darueber nicht noch einmal.
    assert.doesNotMatch(align.synthesis.intro, /Punktzahl|Vergleich|score|comparison/i, locale);
    assert.match(align.synthesis.note, /Diagnose|diagnosis/);
    // Die Karte sagt „kein Abschnittswert" und nicht noch einmal „keine Punktzahl".
    assert.doesNotMatch(align.maps.workIntro, /Punktzahl|score/i, locale);

    // Zwei Ueberschriften hintereinander mit „- und was nicht" waren eine zu viel.
    const profil = messages(locale, "profile").founderProfile;
    assert.doesNotMatch(profil.whatThisIs.title, /und was nicht|what it does not/, locale);
    assert.equal(profil.workProfile.note, locale === "de" ? "Selbstauskunft, kein Testergebnis." : profil.workProfile.note);
  }
  // Der ausfuehrliche Hinweis bleibt vollstaendig.
  const note = messages("de", "report").instrumentNote;
  for (const key of ["selfReport", "notATest", "snapshot", "purpose"]) assert.ok(note[key], key);
});

test("Ueber dich heisst nur noch die Seite und der Abschnitt - nicht die Station", () => {
  for (const [locale, station] of [["de", "Du & dein Hintergrund"], ["en", "You & your background"]]) {
    const capability = messages(locale, "capability");
    assert.equal(capability.aboutYou.stations.basis.title, station);
    // Die Schrittseite heisst wie ihre Karte.
    assert.equal(capability.identity.title, station);
    // Und kein Feld darin heisst wie die Seite.
    assert.notEqual(capability.identity.bio, capability.title);
  }
});

test("der Rollentext ist sachlich", () => {
  for (const locale of ["de", "en"]) {
    const finding = messages(locale, "capability").readout.findings.canButHandsOver;
    assert.doesNotMatch(finding.title + finding.text, /brennt|nicht dein Platz|behalten willst|when it matters|your seat/i, locale);
  }
  assert.equal(
    messages("de", "capability").readout.findings.canButHandsOver.title,
    "Erfahrung vorhanden – Verantwortung lieber abgeben",
  );
});

test("Seitentitel, Manifest und Logos haengen am zentralen Namen", () => {
  for (const datei of [
    join("src", "app", "layout.tsx"),
    join("src", "app", "manifest.ts"),
    join("src", "features", "navigation", "ProductShell.tsx"),
    join("src", "components", "marketing", "LandingTopNav.tsx"),
    join("src", "features", "connect", "PublicConnectShell.tsx"),
  ]) {
    const code = codeOnly(datei);
    assert.match(code, /from "@\/features\/brand"/, datei);
    assert.doesNotMatch(code, /"CoFoundery( Align)?"/, datei);
  }
});

test("ein offener Hinweis landet nicht im Ausdruck", () => {
  // Fest positionierte Ebenen druckt Chrome auf JEDE Seite.
  assert.match(source(join("src", "features", "research", "ResearchConsentNotice.tsx")), /fixed inset-0[^"]*print:hidden/);
});

test("Phase 6.1: keine empirische Behauptung in den Rollenvergleichen", () => {
  // Das Produkt sagt, es messe nichts - dann darf kein Satz behaupten, etwas
  // wirke sich „messbar" aus, werde „teuer" oder sei „riskant".
  const verboten = /messbar|teuer|riskant|blinde Flecken|erspart|measurab|expensive|risky|blind spots|saves a lot/i;
  for (const locale of ["de", "en"]) {
    const c = messages(locale, "capability");
    const texte = [
      ...Object.values(c.comparison.states).map((s) => (s as { text: string }).text),
      ...Object.values(c.team.states).map((s) => (s as { text: string }).text),
      ...Object.values(c.comparison.overlap),
      c.ownership.text,
    ];
    for (const text of texte) assert.doesNotMatch(String(text), verboten, `${locale}: ${text}`);
  }
});

test("Phase 6.1: die fruehere Fassung heisst nicht mehr „neu“", () => {
  for (const locale of ["de", "en"]) {
    const titel = messages(locale, "alignment").advisor.newVersionTitle;
    assert.doesNotMatch(titel, /neue|new|aktuell|current|v2/i, locale);
  }
});
