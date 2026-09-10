import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONNECT_CONTACT_KEYS,
  CONNECT_ERROR_KEYS,
  CONNECT_LIFECYCLE_KEYS,
  CONNECT_PUBLICATION_KEYS,
  CONNECT_SAFETY_KEYS,
} from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

// ---------------------------------------------------------------------------
// S1 — ein Name fuer eine Seite
// ---------------------------------------------------------------------------
test("every label that points at /profile uses the same word", () => {
  for (const locale of ["de", "en"]) {
    const nav = readJson(`messages/${locale}/navigation.json`) as Record<string, string>;
    // Leiste und Menue hinter dem Bild zeigen auf dasselbe Ziel und hiessen
    // vorher verschieden - das war die gemeldete Desorientierung.
    assert.equal(nav.profile, nav.editProfile, `${locale}: zwei Namen fuer ein Ziel`);
  }

  const dashboard = JSON.stringify(readJson("messages/de/dashboard.json"));
  assert.doesNotMatch(dashboard, /Profildaten bearbeiten/);
});

test("the profile page names itself, not one of its sections", () => {
  const de = readJson("messages/de/capability.json") as Record<string, Record<string, string>>;
  // "Was du mitbringst" war der h1 der ganzen Seite und beschrieb damit nur
  // den Capability-Teil von sechs Abschnitten.
  assert.notEqual(de.title as unknown as string, "Was du mitbringst");
  assert.equal(de.summary.sectionTitle, "Was du mitbringst", "der Titel gehoert zum Abschnitt");
  assert.match(source("src/app/(product)/profile/page.tsx"), /t\("summary\.sectionTitle"\)/);
});

test("the Discovery link says which profile it opens", () => {
  const de = readJson("messages/de/discovery.json") as Record<string, Record<string, string>>;
  // Hiess "Mein Profil bearbeiten", fuehrte aber zum Suchprofil.
  assert.doesNotMatch(de.v2.editProfile, /^Mein Profil/);
  assert.match(de.v2.editProfile, /Suchprofil/);
});

// ---------------------------------------------------------------------------
// S2 — ein Muster statt sieben Allowlists
// ---------------------------------------------------------------------------
test("knownKey accepts only listed keys", () => {
  assert.equal(knownKey("save", CONNECT_ERROR_KEYS), "save");
  assert.equal(knownKey("  save  ", CONNECT_ERROR_KEYS), "save");
  assert.equal(knownKey("gibtEsNicht", CONNECT_ERROR_KEYS), null);
  assert.equal(knownKey(undefined, CONNECT_ERROR_KEYS), null);
  assert.equal(knownKey("", CONNECT_ERROR_KEYS), null);
});

test("no Connect page hands a raw query value to t() any more", () => {
  const pages = [
    "src/app/(product)/connect/my/page.tsx",
    "src/app/(product)/connect/contacts/page.tsx",
    "src/app/(product)/connect/messages/[conversationId]/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/contact/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/edit/page.tsx",
    "src/app/(product)/connect/listings/new/page.tsx",
    "src/app/(product)/connect/profile/page.tsx",
    "src/app/(product)/profile/page.tsx",
  ];

  for (const page of pages) {
    const text = source(page);
    // Ein unbekannter Wert wuerde sonst als roher Schluesselpfad auf der Seite
    // landen - next-intl wirft nicht, es rendert den Pfad.
    assert.doesNotMatch(
      text,
      /t\(`[a-zA-Z.]*\$\{(params|query)\.[a-zA-Z]+\}/,
      `${page} gibt einen Query-Wert ungeprueft an t()`
    );
  }
});

test("every listed feedback key has copy in both locales", () => {
  const lists: [string, readonly string[], string][] = [
    ["errors", CONNECT_ERROR_KEYS, "errors"],
    ["success.profile", CONNECT_PUBLICATION_KEYS, "success.profile"],
    ["success.listing", CONNECT_PUBLICATION_KEYS, "success.listing"],
    ["success.lifecycle", CONNECT_LIFECYCLE_KEYS, "success.lifecycle"],
    ["contact.success", CONNECT_CONTACT_KEYS, "contact.success"],
    ["safety.success", CONNECT_SAFETY_KEYS, "safety.success"],
  ];

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    for (const [name, keys, path] of lists) {
      const node = path.split(".").reduce<unknown>((current, part) => {
        return current && typeof current === "object"
          ? (current as Record<string, unknown>)[part]
          : undefined;
      }, messages) as Record<string, string> | undefined;
      assert.ok(node, `${locale}: ${path} fehlt`);
      for (const key of keys) {
        assert.ok(node?.[key], `${locale}: ${name}.${key} fehlt`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// S3 — Rueckfrage vor dem Loeschen
// ---------------------------------------------------------------------------
test("removing a narrated evidence asks first", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  const button = source("src/features/ui/ConfirmSubmitButton.tsx");

  assert.match(page, /<ConfirmSubmitButton/);
  assert.match(page, /summary\.removeEvidenceQuestion/);
  // Der erste Klick darf nicht absenden.
  assert.match(button, /if \(!asking\) \{/);
  assert.match(button, /type="button" onClick=\{\(\) => setAsking\(true\)\}/);
  // Kein window.confirm: nicht uebersetzbar und sieht wie ein Systemfehler aus.
  assert.doesNotMatch(button, /window\.confirm\(/);
  // Und die Rueckfrage muss auch ohne Maus ankommen.
  assert.match(button, /confirmRef\.current\?\.focus\(\)/);

  for (const locale of ["de", "en"]) {
    const summary = (readJson(`messages/${locale}/capability.json`).summary as Record<string, string>);
    assert.ok(summary.removeEvidenceQuestion, `${locale}: Frage fehlt`);
    assert.ok(summary.removeEvidenceConfirm, `${locale}: Bestaetigung fehlt`);
    assert.ok(summary.removeEvidenceCancel, `${locale}: Abbruch fehlt`);
  }
});

// ---------------------------------------------------------------------------
// S4 — Ausgang aus dem Fluss
// ---------------------------------------------------------------------------
test("the snapshot flow can be left at any step", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  assert.match(page, /t\("steps\.later"\)/);
  assert.match(page, /<Link href="\/profile"/, "ein Weg zur Uebersicht");

  for (const locale of ["de", "en"]) {
    const steps = readJson(`messages/${locale}/capability.json`).steps as Record<string, string>;
    assert.ok(steps.later, `${locale}: steps.later fehlt`);
  }
});

test("finished steps look different from upcoming ones", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  // Vorher waren beide grau: die Anzeige zeigte, wo man ist, aber nicht, was
  // schon sitzt.
  assert.match(page, /const done = index < position/);
  assert.match(page, /aria-current=\{step === name \? "step" : undefined\}/);
});

// ---------------------------------------------------------------------------
// S5 — stabile Schluessel statt deutscher Saetze als Verbindung
// ---------------------------------------------------------------------------
test("the Discovery publish check no longer joins on a German sentence", () => {
  const validation = source("src/features/discovery/discoveryValidation.ts");
  const feedback = source("src/features/discovery/discoveryProfileFeedback.ts");

  // Der Satz war der Schluessel zwischen Pruefung und Anzeige, und die
  // Abbildung verwarf still, was sie nicht kannte.
  assert.match(validation, /issues\.push\("displayName"\)/);
  assert.doesNotMatch(validation, /issues\.push\("[A-ZÄÖÜ]/, "keine Saetze mehr");
  assert.doesNotMatch(feedback, /publishIssueByValidationText/);
  assert.doesNotMatch(feedback, /export function mapDiscoveryProfilePublishIssues/);
});

// ---------------------------------------------------------------------------
// S6 — der Absende-Knopf heisst neutral
// ---------------------------------------------------------------------------
test("the submit button no longer carries a feature name", () => {
  const button = source("src/features/ui/SubmitButton.tsx");
  assert.match(button, /export function SubmitButton/);
  assert.match(button, /useFormStatus/);
  assert.match(button, /disabled=\{pending\}/);
  // Zwei Ziele in einem Formular bleiben unterscheidbar, sonst zeigten beide
  // Knoepfe gleichzeitig "laeuft".
  assert.match(button, /formAction=\{formAction\}/);

  // Der alte Pfad bleibt als Re-Export, damit die Bestandsstellen laufen.
  assert.match(
    source("src/features/connect/ConnectSubmitButton.tsx"),
    /export \{ SubmitButton as ConnectSubmitButton \}/
  );
});

test("the longest form in the product now reports that it is saving", () => {
  const page = source("src/app/(product)/discovery/profile/page.tsx");
  assert.match(page, /<SubmitButton/);
  assert.match(page, /pendingLabel=\{t\("profile\.actions\.saving"\)\}/);
  assert.match(page, /pendingLabel=\{t\("profile\.actions\.publishing"\)\}/);
  assert.doesNotMatch(page, /<button type="submit"/, "kein Knopf ohne Pending-Zustand");
});

// ---------------------------------------------------------------------------
// S7 — sichtbare Texte mit echten Umlauten
// ---------------------------------------------------------------------------
test("no user-visible label carries an ASCII-transliterated umlaut", () => {
  for (const path of [
    "src/app/event/[eventSlug]/compare/[participantToken]/page.tsx",
    "src/features/events/EventParticipantCard.tsx",
  ]) {
    const text = source(path);
    assert.doesNotMatch(text, /ctaLabel="[^"]*Zurueck/, `${path}: Knopfbeschriftung`);
    assert.doesNotMatch(text, /alt=\{?`?[^"`]*QR-Code fuer/, `${path}: alt-Text`);
  }
});

test("the report builders keep their ASCII-safe prose on purpose", () => {
  // Das ist kein Fehler, sondern Absicht: Die Bausteine schreiben
  // umlautfreie Prosa, und normalizeGermanText macht beim Rendern echte
  // Umlaute daraus - ein Schutz gegen Zeichensatz-Verstuemmelung. Wer das
  // "aufraeumt", entfernt den Schutz.
  assert.match(source("src/features/reporting/heroTextBuilder.ts"), /Staerke|fuer |naechst/);
  for (const view of [
    "src/features/reporting/SelfReportView.tsx",
    "src/features/reporting/DecisionEngineSection.tsx",
    "src/features/reporting/workbookRendering.ts",
  ]) {
    assert.match(source(view), /normalizeGermanText/, `${view} muss normalisieren`);
  }
});

// ---------------------------------------------------------------------------
// S8 — Meldungen werden angekuendigt
// ---------------------------------------------------------------------------
test("feedback banners carry a role so they are announced", () => {
  const pages = [
    "src/app/(product)/profile/page.tsx",
    "src/app/(product)/connect/profile/page.tsx",
    "src/app/(product)/connect/my/page.tsx",
    "src/app/(product)/connect/contacts/page.tsx",
  ];
  for (const page of pages) {
    const text = source(page);
    const banners = text.match(/bg-(emerald|amber)-50 p-4/g) ?? [];
    const withRole = text.match(/role="(status|alert)"/g) ?? [];
    assert.ok(
      withRole.length >= banners.length,
      `${page}: ${banners.length} Baender, nur ${withRole.length} mit Rolle`
    );
  }
});
