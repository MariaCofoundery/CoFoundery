import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/me/profile/page.tsx";
const CAPABILITY = "src/features/reporting/FounderProfileCapability.tsx";
const BASE = "src/features/reporting/FounderProfileBase.tsx";

// ---------------------------------------------------------------------------
// Das Founderprofil
// ---------------------------------------------------------------------------
//
// GEWUENSCHT AM 21.09.2026: "Ein Accelerator hat mich jetzt gefragt nach dem
// Einzeltest, und da haette ich gerne, dass man da eben auch so eine
// Einzelauswertung hat fuer eine einzelne Person und nicht nur in
// Kompatibilitaet mit einem anderen Founder."
//
// Architektur in `web/docs/founder-profile-and-advisor-access-brief.md`.

test("das Profil liest die vorhandenen Quellen und legt keine neue an", () => {
  // DIE ENTSCHEIDUNG: keine eigene Profiltabelle. Eine Kopie laeuft genau dann
  // auseinander, wenn jemand eine Angabe zurueckzieht - wer seine
  // Sichtbarkeit aendert, aber in einer zweiten Tabelle steht die Angabe noch,
  // hat nicht widerrufen, sondern nur den einen Ort geaendert, den er kannte.
  const page = codeOnly(PAGE);
  assert.match(page, /getPersonCore/);
  assert.match(page, /getLatestSelfAlignmentReport/);
  assert.match(page, /getOwnCapabilityEntries/);
  // Kein Schreibzugriff, keine eigene Tabelle, keine Server Action.
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|"use server"/);
  assert.doesNotMatch(page, /founder_profiles|person_profile_snapshots/);
});

test("das Selbstbild wird nicht nachgebaut, sondern dasselbe Bauteil benutzt", () => {
  // Zwei Ansichten derselben Auswertung waeren zwei Orte, an denen ein
  // Dimensionsname stehen kann - und einer davon waere irgendwann der alte.
  assert.match(codeOnly(PAGE), /<SelfReportView report=\{report\}/);
});

test("die Erzaehlungen aus dem Interview stehen nicht im Profil", () => {
  // DIE WICHTIGSTE ZUSAGE DIESER SEITE. Sie ist zum Ausdrucken und
  // Weitergeben gedacht, und Frage 3 des Interviews fragt ausdruecklich nach
  // dem Leben ausserhalb der Erwerbsarbeit - dort stehen dann Pflege,
  // Ehrenamt, Familie. Wer sein Profil weitergibt, gibt Faehigkeiten weiter,
  // nicht diese Geschichten.
  const capability = codeOnly(CAPABILITY);
  assert.doesNotMatch(capability, /\.narrative/);
  assert.doesNotMatch(codeOnly(PAGE), /\.narrative/);
  // Die ANZAHL der Belege ist erlaubt und gewollt: Sie sagt, dass hinter dem
  // Haken ein Ereignis steht, ohne es zu erzaehlen.
  assert.match(capability, /entry\.evidence\.length/);
});

test("es gibt keine Gesamtzahl und keinen Score", () => {
  // Ein unvalidiertes Instrument, das eine Zahl je Person ausgibt, wird als
  // Auswahlkriterium benutzt, sobald es existiert - und dann entscheidet diese
  // Zahl darueber, wer in ein Programm kommt. Den Schaden traegt die Person.
  const all = [codeOnly(PAGE), codeOnly(CAPABILITY), codeOnly(BASE)].join("\n");
  assert.doesNotMatch(all, /score|Score|percent|Prozent|ranking|Rangliste|gesamt|overall/);
});

test("das Profil behauptet nichts Ungebautes", () => {
  // Das Produkt verspricht hier nur, was es hat. Derselbe Grundsatz wie beim
  // Interview, das nicht behauptet, ein Coach zu fragen, solange es keinen
  // gibt.
  //
  // GEÄNDERT AM 22.09.2026: Hier stand zusätzlich, dass das Wort "Direction"
  // auf der Seite gar nicht vorkommen darf - damals, weil es die Perspektive
  // noch nicht gab. Jetzt gibt es sie, und sie steht hier: bestätigte
  // Aussagen, nach Rubriken. Die Zusage ist dieselbe geblieben, nur ist der
  // Ausschluss nicht mehr ihr Inhalt.
  const all = [source(PAGE), source("messages/de/profile.json"), source("messages/en/profile.json")].join("\n");
  assert.doesNotMatch(all, /demnaechst|coming soon|in Vorbereitung/i);
});

test("die vierte Säule zeigt nur Bestätigtes - und keine Geschichten", () => {
  // GEWÜNSCHT AM 22.09.2026: "Das Interview gehört auch auf die
  // Gesamtbild-Seite."
  //
  // Es wird dieselbe Grenze gezogen wie bei den Fähigkeiten: Die Antworten
  // aus dem Gespräch bleiben, wo sie hingehören. Auf ein Profil, das man
  // ausdruckt und weitergibt, gehören die Aussagen - nicht die Geschichten,
  // aus denen sie entstanden sind.
  const page = codeOnly(PAGE);
  assert.match(page, /getDirectionStatements/);
  assert.doesNotMatch(page, /getDirectionAnswers|direction_statement_proposals/);
  const view = codeOnly("src/features/reporting/FounderProfileDirection.tsx");
  assert.doesNotMatch(view, /quote|evidence|answer/);
  // Und ein fehlender Teil wird benannt, mit dem Weg dorthin.
  assert.match(page, /href="\/profile\/direction"/);
});

test("eine fehlende Saeule wird benannt, aber nicht mitgedruckt", () => {
  // Ein Profil, dem ohne Hinweis ein Drittel fehlt, sieht aus wie ein
  // vollstaendiges Profil einer Person, ueber die es wenig zu sagen gibt.
  // Im weitergegebenen Ausdruck waere der Hinweis dagegen eine Aufforderung
  // an die falsche Person.
  const page = codeOnly(PAGE);
  assert.match(page, /MissingPillar/);
  assert.match(page, /className="no-print mt-6 rounded-2xl border border-dashed/);
  assert.match(page, /href="\/me\/base"/);
  assert.match(page, /href="\/profile\/interview"/);
});

test("die Seite ist die eigene und gibt nichts frei", () => {
  // `/me/*` ist die eigene Ansicht. Wer sie weitergibt, tut es selbst und
  // bewusst, per Ausdruck oder PDF. Ein Freigabeweg fuer Advisors und
  // Acceleratoren ist ein eigenes Vorhaben mit eigener Einwilligung.
  const page = codeOnly(PAGE);
  assert.match(page, /redirect\("\/login\?next=\/me\/profile"\)/);
  assert.match(page, /getOwnCapabilityEntries\(supabase, user\.id\)/);
  // Kein Fremdzugriff: keine userId aus Parametern, keine Freigabe-RPC.
  assert.doesNotMatch(page, /params|searchParams|get_disclosed_capability|advisor/);
  assert.match(page, /PrintReportButton/);
});

test("die Bereiche stehen in der Reihenfolge des Vokabulars", () => {
  // Sonst in der Folge, in der jemand sie eingetragen hat - und das liest sich
  // wie eine Rangfolge, die niemand gemeint hat.
  assert.match(codeOnly(PAGE), /areaOrder\.get\(a\.area_id\)/);
});

test("die Profilseite fuehrt zum zusammengestellten Profil", () => {
  // Ohne Weg dorthin gibt es die Seite nur fuer den, der die Adresse kennt.
  const profilePage = codeOnly("src/app/(product)/profile/page.tsx");
  assert.match(profilePage, /href="\/me\/profile"/);
  assert.match(profilePage, /viewFounderProfile/);
});

test("beide Sprachen haben alle Saetze", () => {
  const keys = ["eyebrow", "unnamed", "intro", "backToDashboard"];
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(source(`messages/${locale}/profile.json`)) as {
      founderProfile: Record<string, Record<string, string> | string>;
    };
    const block = bundle.founderProfile;
    for (const key of keys) {
      assert.ok(block[key], `${locale}: ${key} fehlt`);
    }
    for (const section of ["base", "capability", "missingReport", "missingCapability"]) {
      assert.ok(block[section], `${locale}: ${section} fehlt`);
    }
    const capability = block.capability as Record<string, string>;
    assert.match(capability.evidenceCount, /plural/, `${locale}: die Anzahl beugt nicht`);
    const capabilityBundle = JSON.parse(source(`messages/${locale}/capability.json`)) as Record<string, unknown>;
    assert.ok(capabilityBundle.viewFounderProfile, `${locale}: der Weg dorthin hat kein Label`);
  }
});
