import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { judgeAll, type ThemeDistance, type ThemePreference } from "@/features/find/discoveryMatch";
import { DISCOVERY_THEMES } from "@/features/find/discoveryThemes";

/**
 * Drei Wege, und keiner verrät den anderen.
 *
 * Maria am 30.09.2026: „Einmal ohne, dass man das überhaupt anklickert.
 * Einmal, dass eine Person das nur anklickert, und auch so, wenn beide
 * Personen das anklickern. Und je nachdem ist die Qualität unterschiedlich —
 * aber es soll alle drei Wege möglich sein, ohne dass man datenschutzrechtlich
 * Probleme bekommt."
 */

/** Überall dieselbe Grundlage: gleiche Antworten, zwei Stufen Unterschied. */
const GLEICH: ThemeDistance[] = DISCOVERY_THEMES.map((theme) => ({
  themeId: theme.themeId,
  comparable: theme.items.filter((item) => item.numeric).length,
  of: theme.items.filter((item) => item.numeric).length,
  meanDistance: 0,
}));

const praeferenz = (
  themeId: string,
  direction: ThemePreference["direction"],
  importance: ThemePreference["importance"],
): ThemePreference => ({ themeId, direction, importance });

test("Weg 1: niemand hat etwas festgelegt", () => {
  const match = judgeAll([], GLEICH);

  // Es gibt trotzdem sechs Themen und einen Befund je Thema - die Suche
  // funktioniert, nur ohne Aussage darüber, was zu wem passt.
  assert.equal(match.themes.length, 6);
  assert.equal(match.rankingScore, null);
  assert.equal(match.weightedThemes, 0);
  for (const theme of match.themes) {
    assert.equal(theme.importance, 0);
    assert.equal(theme.verdict, "unremarkable");
  }
});

test("Weg 2: eine Person hat etwas festgelegt", () => {
  const match = judgeAll([praeferenz("decision_weighing", "similar", 3)], GLEICH);

  assert.equal(match.weightedThemes, 1);
  assert.equal(match.rankingScore, 1);
  const getroffen = match.themes.find((theme) => theme.themeId === "decision_weighing")!;
  assert.equal(getroffen.verdict, "strong_match");

  // Die anderen fünf bleiben ohne Urteil - und das ist kein schlechteres
  // Ergebnis, sondern gar keins.
  assert.equal(match.themes.filter((theme) => theme.verdict === "unremarkable").length, 5);
});

test("Weg 3: beide haben etwas festgelegt — dieselbe Rechnung, zweimal", () => {
  // Die Abstände sind für beide dieselben. Was sich unterscheidet, ist der
  // Wunsch - und deshalb kann ein Thema für die eine Seite aufgehen und für
  // die andere nicht.
  const meine = judgeAll([praeferenz("experimentation", "similar", 2)], GLEICH);
  const ihre = judgeAll([praeferenz("experimentation", "complementary", 3)], GLEICH);

  const meins = meine.themes.find((theme) => theme.themeId === "experimentation")!;
  const ihrs = ihre.themes.find((theme) => theme.themeId === "experimentation")!;

  assert.equal(meins.distance, ihrs.distance, "der Abstand ist derselbe");
  assert.equal(meins.verdict, "strong_match");
  assert.equal(ihrs.verdict, "worth_a_look", "gleiche Antworten sind keine Ergänzung");
});

test("nichts sagt, ob die andere Person etwas festgelegt hat", () => {
  // „X hat für die eigene Suche noch keine Matching-Präferenzen festgelegt"
  // stünde in Abschnitt 13 der Spec. Maria am 30.09.2026: „das sollte nicht
  // erkennbar sein."
  //
  // Der Grund ist nicht Zurückhaltung, sondern Genauigkeit: Was für die eine
  // Person gut ist, ist es für die andere nicht - und ob jemand seine Suche
  // festgelegt hat, ist eine Auskunft über ihn, die er nicht gegeben hat.
  const daten = readFileSync(join("src", "features", "find", "matchData.ts"), "utf8");
  assert.ok(!/otherHasPreferences/.test(daten));
  assert.ok(!/hasPreferences/.test(daten));

  // Herausgegeben werden Urteile, nie Richtungen oder Gewichte der anderen
  // Person: Aus `mutualStrongPoints` kommen nur Themenkennungen.
  assert.match(daten, /mutualStrongPoints: string\[\]/);
  assert.match(daten, /\.map\(\(theme\) => theme\.themeId\)/);
});

test("die fremde Suche erreicht nur den Server", () => {
  const daten = readFileSync(join("src", "features", "find", "matchData.ts"), "utf8");
  const migration = readFileSync(
    join("..", "supabase", "migrations", "20261086120000_discovery_theme_distances.sql"),
    "utf8",
  );

  // Eine Funktion, die die angemeldete Person aufrufen darf, darf ihr Browser
  // aufrufen - dort liegt dieselbe Sitzung und derselbe öffentliche Schlüssel.
  assert.match(
    migration,
    /revoke all on function public\.discovery_preferences_for_match\(uuid, uuid\)\s*\n\s*from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.discovery_preferences_for_match\(uuid, uuid\) to service_role;/,
  );

  // Und sie wird auch nur so aufgerufen.
  assert.match(daten, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(daten, /discovery_preferences_for_match/);

  // Ohne Dienstschlüssel gibt es keine gegenseitigen Punkte - und keinen
  // Umweg über die Sitzung der Person.
  assert.match(daten, /if \(!url \|\| !serviceRoleKey\) return \[\];/);
});

test("dasselbe Urteil für beide Richtungen", () => {
  // Der Wunsch der anderen Person wird mit `judgeAll` beurteilt und nicht mit
  // einer zweiten Regel - sonst wäre das die Stelle, an der beide Seiten
  // auseinanderlaufen.
  const daten = readFileSync(join("src", "features", "find", "matchData.ts"), "utf8");
  assert.match(daten, /const incoming = judgeAll\(fremde, distances\);/);
});
