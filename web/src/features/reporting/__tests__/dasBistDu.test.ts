import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = join("src", "app", "me", "profile", "page.tsx");
const bundle = (locale: string) =>
  JSON.parse(source(join("messages", locale, "profile.json"))).founderProfile as Record<
    string,
    Record<string, unknown> | string
  >;

/**
 * „Das bist du" — die Seite als Ganzes.
 *
 * Diese Datei prüft die Zusagen, die über einzelne Bausteine hinausgehen:
 * welche Abschnitte bei welcher Datenlage erscheinen, was nirgends auftaucht,
 * und dass beide Sprachen dieselben Sätze haben.
 */

test("welche Abschnitte bei welcher Datenlage erscheinen", () => {
  const page = codeOnly(PAGE);

  // Nur zwei Abschnitte dürfen ganz verschwinden - und bei beiden ist NICHTS
  // eine gültige Antwort. Bei allen anderen steht ein Hinweis mit einem Weg.
  const bedingungen = /const zeigt: Record<SectionId, boolean> = \{([\s\S]*?)\};/.exec(page)?.[1];
  assert.ok(bedingungen, "die Bedingungen stehen nicht als Daten");
  assert.match(bedingungen, /entwicklung: growingInto\.length > 0/);
  assert.match(bedingungen, /ressourcen: confirmedResources\.length > 0/);
  assert.match(bedingungen, /erfahrung: entries\.length > 0/);

  // Diese vier stehen immer - sie tragen bei leerer Datenlage einen Hinweis.
  for (const immer of ["ueber-dich", "arbeitsweise", "staerken", "antrieb"]) {
    assert.match(
      bedingungen,
      new RegExp(`"?${immer}"?: true`),
      `${immer} verschwindet bei leeren Daten`,
    );
  }
});

test("Leerzustaende sehen nicht wie Fehler aus", () => {
  const page = codeOnly(PAGE);

  // Gestrichelter Rahmen, kein Rot, kein Warnzeichen - und genau ein Weg
  // weiter. Was hier fehlt, fehlt nicht am Menschen.
  assert.match(page, /className="no-print[^"]*border-dashed/);
  const missing = page.slice(page.indexOf("function MissingSection"));
  for (const warnfarbe of ["rose", "red-", "amber"]) {
    assert.ok(!missing.includes(warnfarbe), `der Hinweis ist eingefärbt: ${warnfarbe}`);
  }

  // Jeder Leerzustand hat genau einen Weg.
  const aufrufe = [...page.matchAll(/<MissingSection([\s\S]*?)\/>/g)];
  assert.ok(aufrufe.length >= 4, `zu wenige Hinweise: ${aufrufe.length}`);
  for (const aufruf of aufrufe) {
    assert.equal(
      (aufruf[1].match(/href=/g) ?? []).length,
      1,
      "ein Hinweis hat mehr als einen Weg",
    );
  }
});

test("die Seite zeigt keine Erzaehlungen und keine offenen Vorschlaege", () => {
  const page = codeOnly(PAGE);

  // Ein Profil, das man weitergibt, gibt Fähigkeiten weiter, nicht die
  // Geschichten aus dem Interview.
  assert.ok(!/narrative|evidence_quote|evidenceQuote/.test(page), "Erzählungen auf der Seite");

  // Und eine Modellbehauptung darf nicht wie eine Aussage der Person
  // aussehen.
  assert.match(page, /resource\.status === "confirmed"/);
  assert.ok(!/"pending"|"rejected"/.test(page), "offene Vorschläge auf der Seite");
});

test("keine Zahl ueber einen Menschen", () => {
  const page = codeOnly(PAGE);
  assert.ok(
    !/(score|punktzahl|percentile|typologie|typology|radar|spider)/i.test(page),
    "ein Wort, das nach Bewertung klingt",
  );

  // Der Sprungbalken ist eine Liste von Ankern und KEINE Statusanzeige. Hier
  // stand bis zum 01.10.2026 "ausgefuellt / noch offen" je Kachel - ein
  // Fortschrittsbalken in anderer Schreibweise.
  assert.ok(!/overview\.ready|overview\.open|pillar\.done/.test(page), "Statusanzeige im Balken");
});

test("beide Sprachen haben dieselben Saetze fuer die neue Seite", () => {
  const de = bundle("de");
  const en = bundle("en");

  const pfade = (wert: unknown, praefix = ""): string[] =>
    typeof wert === "object" && wert !== null
      ? Object.entries(wert as Record<string, unknown>).flatMap(([schluessel, inhalt]) =>
          pfade(inhalt, praefix ? `${praefix}.${schluessel}` : schluessel),
        )
      : [praefix];

  assert.deepEqual(pfade(de).sort(), pfade(en).sort());

  // Die neuen Blöcke sind wirklich da.
  for (const block of [
    "parts",
    "sections",
    "head",
    "depth",
    "ownership",
    "strengthsSection",
    "directionSection",
    "resourcesSection",
    "ventures",
    "whatThisIs",
    "origins",
  ]) {
    assert.ok(de[block], `de: ${block} fehlt`);
    assert.ok(en[block], `en: ${block} fehlt`);
  }

  // Neun Abschnittsnamen, und `step` ist die Zählweise.
  const sections = de.sections as Record<string, string>;
  assert.equal(Object.keys(sections).length, 10);
  assert.match(sections.step, /\{index\}/);
});

test("die Herkunft steht in normaler Sprache, nicht als technischer Wert", () => {
  for (const locale of ["de", "en"]) {
    const origins = bundle(locale).origins as Record<string, string>;
    for (const wert of ["own_words", "confirmed_proposal", "edited_proposal", "self", "model"]) {
      assert.ok(origins[wert]?.trim(), `${locale}: ${wert} fehlt`);
      // Der Schlüssel darf nicht in seiner eigenen Übersetzung stehen.
      assert.ok(!origins[wert].includes("_"), `${locale}: ${wert} zeigt den technischen Wert`);
    }
  }

  // Und sie steht im Aufklapper, nicht in der Zusammenfassung: Neben jedem
  // Satz gelesen, wäre sie eine Fußnote an einer Aussage.
  const page = codeOnly(PAGE);
  const zusammenfassung = page.indexOf("limit={STRENGTHS_IN_SUMMARY}");
  const aufklapper = page.indexOf("originLabel={originLabel}");
  assert.ok(zusammenfassung > 0 && aufklapper > zusammenfassung);
});

test("der Hinweis unten bleibt und sagt alle vier Einschraenkungen", () => {
  // Die Dokumentation war darin immer ehrlich, das Produkt lange nicht. Beim
  // Umbau wäre der Kasten fast herausgefallen.
  const page = codeOnly(PAGE);
  assert.match(page, /<InstrumentNote/);
  assert.match(page, /whatThisIs\.title/);
  // Er datiert jetzt die Seite, nicht mehr nur den v1-Bericht.
  assert.match(page, /dated: freshness/);
});
