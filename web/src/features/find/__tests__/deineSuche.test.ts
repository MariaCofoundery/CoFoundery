import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DIRECTIONS, THEME_IDS } from "@/features/find/discoveryThemes";

const bundle = (locale: string) =>
  JSON.parse(readFileSync(join("messages", locale, "find.json"), "utf8")).search as Record<
    string,
    unknown
  >;

const de = bundle("de");
const en = bundle("en");

/** Alle Pfade eines Objekts — damit zwei Sprachen sich nicht auseinanderleben. */
function pfade(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    pfade(entry, prefix ? `${prefix}.${key}` : key),
  );
}

test("jedes Thema hat einen Text, in beiden Sprachen", () => {
  // Ein Thema ohne Text wäre auf dem Bildschirm seine Kennung —
  // „voicing_disagreement" als Überschrift.
  for (const bundleOfLocale of [de, en]) {
    const themes = bundleOfLocale.themes as Record<string, { title: string; text: string }>;
    assert.deepEqual(Object.keys(themes).sort(), [...THEME_IDS].sort());
    for (const themeId of THEME_IDS) {
      assert.ok(themes[themeId].title?.trim(), themeId);
      assert.ok(themes[themeId].text?.trim(), themeId);
    }
  }
});

test("beide Sprachen haben dieselben Schlüssel", () => {
  assert.deepEqual(pfade(de).sort(), pfade(en).sort());
});

test("jede Richtung und jedes Gewicht ist beschriftet", () => {
  for (const bundleOfLocale of [de, en]) {
    const directions = bundleOfLocale.directions as Record<string, string>;
    assert.deepEqual(Object.keys(directions).sort(), [...DIRECTIONS].sort());

    // Drei Gewichte, und die Null ist keins: „egal" ist die Richtung und
    // nicht eine vierte Stufe von Wichtigkeit.
    const importances = bundleOfLocale.importances as Record<string, string>;
    assert.deepEqual(Object.keys(importances).sort(), ["1", "2", "3"]);
  }
});

test("die Seite sagt, dass die Suche privat ist", () => {
  // WER DAS LIEST, GIBT ANDERE ANTWORTEN. Ohne den Satz beantwortet man die
  // Fragen so, wie man gesehen werden will. Spec, Abschnitt 4 und 22.
  const seite = readFileSync(
    join("src", "app", "(product)", "discovery", "suche", "page.tsx"),
    "utf8",
  );
  assert.match(seite, /t\("private"\)/);
  assert.match(String(de.private), /privat/i);
  assert.match(String(de.private), /niemand sieht sie/i);
});

test("die Wichtigkeit erscheint erst, wenn sie eine Bedeutung hat", () => {
  // „Ist mir egal" und daneben „sehr wichtig" wären zwei Angaben, die sich
  // widersprechen. Spec, Abschnitt 7: die zweite Frage nur anzeigen, wenn
  // nicht „egal" gewählt ist.
  const form = readFileSync(
    join("src", "features", "find", "SearchPreferencesForm.tsx"),
    "utf8",
  );
  assert.match(form, /\{gewaehlt\.direction !== "neutral" && \(/);

  // Und wer von „egal" auf eine Richtung wechselt, bekommt ein Gewicht —
  // sonst drehte die Speicherung ihn stillschweigend auf „egal" zurück.
  assert.match(form, /current\[themeId\]\.importance === 0 \? 1 : current\[themeId\]\.importance/);
});

test("es gibt kein Absenden und keinen Abschluss", () => {
  // Spec, Abschnitt 26: „Nicht als Testabschluss behandeln." Ein Knopf, der
  // speichert, und der Satz, dass man es jederzeit ändern kann.
  assert.equal(de.save, "Präferenzen speichern");
  assert.match(String(de.changeLater), /jederzeit ändern/);

  // Geprüft wird, was DASTEHT, und nicht der Quelltext: Im Kommentar darf das
  // Wort vorkommen - es steht dort als Begründung, warum es nicht auf dem
  // Knopf steht.
  for (const bundleOfLocale of [de, en]) {
    for (const [key, value] of Object.entries(bundleOfLocale)) {
      if (typeof value !== "string") continue;
      assert.ok(!/absenden|abgeben|submit/i.test(value), `${key}: ${value}`);
    }
  }
});

test("die praktischen Kriterien stehen in der Suche, nicht bei den Treffern", () => {
  // Bis zum 30.09.2026 standen Rolle, Expertise, Region, Remote und
  // Mindeststunden eingeklappt ueber den Treffern - mitten zwischen dem
  // oeffentlichen Profil und der Ergebnisliste. Die Spec nennt genau diese
  // Mischung in Abschnitt 3 als Grund fuer den Umbau.
  const suche = readFileSync(
    join("src", "app", "(product)", "discovery", "suche", "page.tsx"),
    "utf8",
  );
  assert.match(suche, /<PracticalSearchForm/);
  assert.match(suche, /t\("practicalTitle"\)/);

  const ergebnisse = readFileSync(
    join("src", "app", "(product)", "discovery", "page.tsx"),
    "utf8",
  );
  assert.ok(!/name="requiredRolesAny"/.test(ergebnisse), "die Felder stehen noch bei den Treffern");
  assert.ok(!/saveDiscoveryV2SearchPreferencesAction/.test(ergebnisse) || /resetSearch/.test(ergebnisse));
  // Der Weg dorthin steht da, wo das Formular war.
  assert.match(ergebnisse, /href="\/discovery\/suche"/);

  // Und was gerade gilt, steht weiter oben - man sieht, wonach gefiltert
  // wird, ohne die Felder vor sich zu haben.
  assert.match(ergebnisse, /<SearchBrief/);
});

test("wer noch nichts gespeichert hat, bekommt leere Felder und keinen Fehler", () => {
  const suche = readFileSync(
    join("src", "app", "(product)", "discovery", "suche", "page.tsx"),
    "utf8",
  );
  assert.match(suche, /searchPreferences\?\.mustHaves \?\? LEERE_KRITERIEN/);
});

test("die eigene Suche steht im Menü", () => {
  // Sie war sonst nur über eine Karte erreichbar - wer woanders steht, müsste
  // erst dorthin zurück. Genau das war bei Fragebogen und Report schon
  // einmal das Problem.
  const shell = readFileSync(
    join("src", "features", "navigation", "ProductShell.tsx"),
    "utf8",
  );
  assert.match(shell, /href: "\/discovery\/suche"/);
  assert.match(shell, /t\("findYourSearch"\)/);

  for (const locale of ["de", "en"]) {
    const nav = readFileSync(join("messages", locale, "navigation.json"), "utf8");
    assert.match(nav, /"findYourSearch"/, locale);
  }
});
