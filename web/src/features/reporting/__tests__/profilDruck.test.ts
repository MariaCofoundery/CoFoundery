import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { BRAND_SLUG } from "@/features/brand";
import {
  PRINT_MODES,
  SHORT_LIMITS,
  limited,
  parseIncludeLegacy,
  parsePrintMode,
  printFileName,
} from "@/features/reporting/profilePrint";
import { DIRECTION_PER_FACET, STRENGTHS_IN_SUMMARY } from "@/features/reporting/profileSummary";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DRUCK = join("src", "app", "me", "profile", "print", "page.tsx");
const SEITE = join("src", "app", "me", "profile", "page.tsx");
const WAHL = join("src", "features", "reporting", "ProfilePdfChoice.tsx");
const CSS = join("src", "app", "globals.css");

// ---------------------------------------------------------------------------
// Zwei Fassungen, und die Adresse entscheidet
// ---------------------------------------------------------------------------

test("der Modus steht in der Adresse, nicht im Bildschirm", () => {
  // Bis zum 01.10.2026 hing der Inhalt des PDFs daran, welche Aufklapper
  // gerade offen waren. Zwei Menschen mit demselben Profil bekamen zwei
  // verschiedene Dokumente, und niemand konnte sehen, warum.
  assert.deepEqual([...PRINT_MODES], ["short", "full"]);
  assert.equal(parsePrintMode("full"), "full");
  assert.equal(parsePrintMode("short"), "short");

  // KURZ IST DIE VOREINSTELLUNG: Wer ohne Angabe hier landet, bekommt die
  // Fassung mit weniger persoenlichen Angaben - nicht die mit mehr.
  for (const unsinn of [undefined, null, "", "lang", "FULL", "../full", 1]) {
    assert.equal(parsePrintMode(unsinn), "short", String(unsinn));
  }

  const druck = codeOnly(DRUCK);
  assert.match(druck, /const mode = parsePrintMode\(params\.mode\)/);
  assert.match(druck, /const voll = mode === "full"/);
});

test("der Zustand der Leseseite beeinflusst das Dokument nicht", () => {
  const druck = codeOnly(DRUCK);
  // Kein Aufklapper im Dokument, auch kein geerbter.
  assert.ok(!/<ProfileDetails|<details/.test(druck), "ein Aufklapper im Dokument");
  // Und die Leseseite klappt beim Drucken nichts mehr auf.
  assert.ok(!codeOnly(SEITE).includes("OpenDetailsForPrint"));
});

test("die Wahl steht vor dem Klick, und es sind zwei", () => {
  const wahl = codeOnly(WAHL);
  const ziele = [...wahl.matchAll(/href="(\/me\/profile\/print\?mode=\w+)"/g)].map((t) => t[1]);
  assert.deepEqual(ziele, ["/me/profile/print?mode=short", "/me/profile/print?mode=full"]);
  // Keine dritte Fassung: Eine „mittlere" haette keine Zielgruppe, die man
  // benennen kann.
  assert.equal(ziele.length, PRINT_MODES.length);
});

// ---------------------------------------------------------------------------
// Was in welcher Fassung steht
// ---------------------------------------------------------------------------

test("die Antworten aus dem Bogen stehen nur in der Langfassung", () => {
  const druck = codeOnly(DRUCK);

  const karte = druck.indexOf("<WorkMap sections={workProfile.sections}");
  const antworten = druck.indexOf("<ReportViewV21");
  assert.ok(karte > 0, "die WorkMap fehlt");
  assert.ok(antworten > 0, "die Antworten fehlen");

  // Die historische WorkMap bleibt in der Langfassung. Die neue Signature ist in beiden Fassungen.
  // Also kommt sie im Abschnitt „Wie du arbeitest", bevor der sich nach dem
  // Modus verzweigt. (Weiter oben gibt es eine Verzweigung fuer das
  // Kennzeichen „Kurzprofil" / „Ausfuehrliches Profil"; die zaehlt nicht.)
  const abschnitt = druck.slice(druck.indexOf("{voll && workProfile ?"));
  assert.ok(
    abschnitt.indexOf("<WorkMap") < abschnitt.indexOf("{voll ? ("),
    "die WorkMap haengt am Modus",
  );

  // Die Antworten dagegen stehen hinter genau dieser Verzweigung.
  assert.ok(
    abschnitt.indexOf("{voll ? (") < abschnitt.indexOf("<ReportViewV21"),
    "die Antworten stehen auch in der Kurzfassung",
  );
  assert.equal([...druck.matchAll(/<ReportViewV21/g)].length, 1);
});

test("die ganze Bereichsliste steht nur in der Langfassung", () => {
  const druck = codeOnly(DRUCK);
  // Sie entsteht gar nicht erst, wenn die Kurzfassung gemeint ist - das ist
  // staerker als eine Verzweigung beim Zeichnen.
  assert.match(druck, /const faehigkeitenNachFamilie = voll\s*\?/);
  assert.match(druck, /faehigkeitenNachFamilie\.map/);
  // Die Deckungskarte steht in beiden.
  assert.match(druck, /<CoverageMap/);
});

test("die Kurzfassung begrenzt, ohne eine Rangfolge zu erfinden", () => {
  // Es gibt keine „wichtigste Faehigkeit" und keine „Top 5" - das Modell
  // kennt so etwas nicht, und eine Begrenzung darf es nicht erfinden.
  const druck = codeOnly(DRUCK);
  assert.ok(
    !/top|wichtigste|ranked|sort\(\(a, b\) => b\./i.test(druck),
    "die Druckseite sortiert nach Bedeutung",
  );

  // Begrenzt wird in der vorhandenen Reihenfolge, und wo etwas wegfaellt,
  // steht ein Satz darueber.
  assert.deepEqual(limited([1, 2, 3], 2), { shown: [1, 2], rest: 1 });
  assert.deepEqual(limited([1, 2], 5), { shown: [1, 2], rest: 0 });
  assert.deepEqual(limited([1, 2, 3], null), { shown: [1, 2, 3], rest: 0 });
  assert.match(druck, /print\.more/);

  // Die beiden sichtbaren Dichten sind dieselben wie auf der Seite - die
  // Kurzfassung ist, was dort offen steht, und keine dritte Fassung.
  assert.equal(SHORT_LIMITS.strengths, STRENGTHS_IN_SUMMARY);
  assert.equal(SHORT_LIMITS.directionPerFacet, DIRECTION_PER_FACET);
});

// ---------------------------------------------------------------------------
// Was nie mitkommt
// ---------------------------------------------------------------------------

test("der Altbestand ist nie in der Kurzfassung und nur auf Auswahl in der langen", () => {
  const druck = codeOnly(DRUCK);
  assert.match(druck, /const includeLegacy = mode === "full" && parseIncludeLegacy\(params\.legacy\)/);
  assert.match(druck, /\{includeLegacy && report \?/);

  // Abgewaehlt, bis jemand ihn dazunimmt.
  assert.equal(parseIncludeLegacy(undefined), false);
  assert.equal(parseIncludeLegacy("0"), false);
  assert.equal(parseIncludeLegacy("true"), false);
  assert.equal(parseIncludeLegacy("1"), true);

  // Und er kommt flach: In der Zusammenfassung stecken seine Kapitel in
  // Aufklappern, und ein zugeklapptes `details` im PDF waere eine leere Seite.
  assert.match(druck, /density="full"/);
});

test("Belege, Herkunft und Erzaehlungen bleiben draussen", () => {
  const druck = codeOnly(DRUCK);

  // Sie gehoeren zur Entscheidung, etwas zu uebernehmen - nicht zu der
  // Person, die danach dasteht.
  for (const verboten of [
    "evidenceQuote",
    "evidence_quote",
    "originLabel",
    "origins\\.",
    "narrative",
    "source_turn_id",
  ]) {
    assert.ok(
      !new RegExp(verboten).test(druck),
      `die Druckfassung zeigt ${verboten}`,
    );
  }

  // Die Zahl der Belege steht auch nicht da: Sie sagt dem Leser nichts, was
  // er nachsehen koennte.
  assert.match(druck, /evidenceCount: null/);
});

test("der Zustand des Baukastens kommt nicht mit", () => {
  const druck = codeOnly(DRUCK);
  for (const verboten of [
    "person_section_marks",
    "SectionMarkToggle",
    "aboutYou",
    "recommendNextStep",
    "buildAboutYou",
  ]) {
    assert.ok(!druck.includes(verboten), `die Druckfassung zeigt ${verboten}`);
  }

  // Keine Handlungsaufforderungen im Dokument: Der Leser bekommt ein
  // Founderprofil und keinen Formularstatus. Die Leiste darueber wird nicht
  // mitgedruckt (`no-print`) und darf deshalb Knoepfe tragen.
  const dokument = druck.slice(druck.indexOf("<header"));
  assert.ok(!/<EditLink|href="\/profile\?step=/.test(dokument), "ein Bearbeiten-Weg im Dokument");
  assert.match(druck, /className="no-print mb-8"/);
});

test("leere Abschnitte entfallen ohne Hinweis", () => {
  // Auf der eigenen Seite ist „hier koennte noch etwas stehen" eine
  // Einladung. In einer weitergegebenen Fassung ist es eine Aussage ueber
  // einen Menschen, gerichtet an jemanden, der nichts daran aendern kann.
  const druck = codeOnly(DRUCK);
  assert.ok(!/<MissingSection|missingCapability|missingWorkProfile|\.empty\b/.test(druck));

  for (const bedingung of [
    /\{voll && workProfile \?/,
    /\{strengths\.length > 0 \?/,
    /\{orderedEntries\.length > 0 \?/,
    /\{growingInto\.length > 0 \?/,
    /\{confirmedResources\.length > 0 \?/,
    /\{directionStatements\.length > 0 \?/,
    /\{ventures\.length > 0 \?/,
  ]) {
    assert.match(druck, bedingung);
  }
});

test("die Einschraenkungen bleiben auch im Dokument stehen", () => {
  // Was die Seite als Verfahren NICHT ist, ist in der weitergegebenen
  // Fassung das Wichtigste.
  const druck = codeOnly(DRUCK);
  assert.match(druck, /<InstrumentNote/);
  assert.match(druck, /whatThisIs\.title/);
});

// ---------------------------------------------------------------------------
// Der Dateiname
// ---------------------------------------------------------------------------

test("der Dateiname traegt Fassung, Namen und Tag - und sonst nichts", () => {
  const tag = new Date(2026, 9, 1);

  assert.equal(
    printFileName("short", "Nora Testerin", tag),
    `${BRAND_SLUG}-das-bist-du-kurz-nora-testerin-2026-10-01`,
  );
  assert.equal(
    printFileName("full", "Nora Testerin", tag),
    `${BRAND_SLUG}-das-bist-du-ausfuehrlich-nora-testerin-2026-10-01`,
  );

  // Umlaute werden zerlegt und ihre Zeichen entfernt (ö wird o, NICHT oe),
  // ß wird ss, alles andere wird zum Strich - ein Dateiname wandert weiter
  // als das Dokument selbst.
  assert.equal(
    printFileName("short", "Jörg Weiß-Müller", tag),
    `${BRAND_SLUG}-das-bist-du-kurz-jorg-weiss-muller-2026-10-01`,
  );

  // Kein Konto, keine Mailadresse, keine Kennung.
  assert.ok(!printFileName("full", "a@b.de", tag).includes("@"));

  // Bleibt vom Namen nichts uebrig, steht dort auch nichts - statt einer
  // Reihe Striche.
  assert.equal(
    printFileName("short", "．．．", tag),
    `${BRAND_SLUG}-das-bist-du-kurz-2026-10-01`,
  );
  assert.equal(printFileName("short", null, tag), `${BRAND_SLUG}-das-bist-du-kurz-2026-10-01`);
});

test("der Dateiname kommt aus dem Seitentitel", () => {
  // Beim „Als PDF sichern" schlaegt der Browser `document.title` vor; einen
  // `Content-Disposition` gibt es beim Drucken nicht.
  const druck = codeOnly(DRUCK);
  assert.match(druck, /export async function generateMetadata/);
  assert.match(druck, /title: printFileName\(/);
  // Und die Seite wird nicht indexiert.
  assert.match(druck, /robots: \{ index: false/);
});

// ---------------------------------------------------------------------------
// Papier
// ---------------------------------------------------------------------------

test("die Druckregeln kennen Ueberschriften und lange Listen", () => {
  const css = source(CSS);
  const druckteil = css.slice(css.indexOf("@media print"));

  // Eine Ueberschrift allein am Seitenende ist das haeufigste Missgeschick
  // beim Drucken von Webseiten.
  assert.match(druckteil, /\.profile-print-root h2,?\s*\n\s*\.profile-print-root h3 \{[\s\S]*?break-after: avoid-page/);

  // Lange Listen duerfen umbrechen, kurze Kaesten bleiben zusammen.
  assert.match(druckteil, /\.profile-print-root \.page-section \{[\s\S]*?break-inside: auto/);
  assert.match(druckteil, /\.profile-print-root \.print-keep \{[\s\S]*?break-inside: avoid/);

  // Und das Dokument traegt beide Klassen.
  assert.match(codeOnly(DRUCK), /print-document-root profile-print-root/);
});

test("beide Sprachen sagen dasselbe ueber die Druckfassungen", () => {
  const bundle = (locale: string) =>
    JSON.parse(source(join("messages", locale, "profile.json"))).founderProfile.print as Record<
      string,
      string
    >;

  const de = bundle("de");
  const en = bundle("en");
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());

  for (const locale of ["de", "en"]) {
    const p = bundle(locale);
    for (const key of [
      "chooseTitle",
      "badgeShort",
      "badgeFull",
      "shortText",
      "fullText",
      "privacy",
      "legacyLabel",
      "footer",
      "more",
    ]) {
      assert.ok(p[key]?.trim(), `${locale}: print.${key} fehlt`);
    }
    // Der Markenname steht nicht im Text, sondern kommt als Wert.
    assert.match(p.footer, /\{brand\}/, `${locale}: der Markenname ist eingetippt`);
    assert.match(p.more, /\{count, plural,/, `${locale}: ungebeugt`);
  }
});
