import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CURRENT_TRANSITION,
  TRANSITION_CONSEQUENCES,
  TRANSITION_DECISIONS,
  isTransitionDecision,
} from "@/features/instruments/v2/instrumentTransition";

test("der Umstieg geht von v1 nach v2, und nur dahin", () => {
  assert.equal(CURRENT_TRANSITION.from, "founder-compatibility-v1");
  assert.equal(CURRENT_TRANSITION.to, "founder-alignment-v2");
  assert.deepEqual([...TRANSITION_DECISIONS], ["pending", "keep_previous", "retake"]);
  assert.equal(isTransitionDecision("spaeter"), false);
});

test("beide Wege sagen, dass nichts verloren geht", () => {
  // DIE HAEUFIGSTE STILLE SORGE bei so einem Hinweis ist, dass „neu machen"
  // das Alte ueberschreibt. Sie einmal auszuraeumen kostet eine Zeile - und
  // zwar bei BEIDEN Antworten, nicht nur bei einer.
  assert.match(TRANSITION_CONSEQUENCES.keep_previous.keeps, /bleibt so, wie er ist/);
  assert.match(TRANSITION_CONSEQUENCES.retake.keeps, /bleiben erhalten/);
  assert.match(TRANSITION_CONSEQUENCES.retake.keeps, /nichts überschrieben/);
});

test("die Folge für den Vergleich steht dabei, nicht im Kleingedruckten", () => {
  // Ein Vergleich laeuft nur innerhalb derselben Fassung. Wer bei der alten
  // bleibt, waehrend sein Mitgruender die neue ausfuellt, kann sich mit ihm
  // nicht mehr vergleichen. Das waere eine boese Ueberraschung, wenn es erst
  // beim Vergleich auftraete.
  assert.match(TRANSITION_CONSEQUENCES.keep_previous.costs, /kein Vergleich/);
  // Und beide Seiten nennen ihren Preis - sonst waere es keine Wahl.
  assert.ok(TRANSITION_CONSEQUENCES.retake.costs.trim().length > 20);
});

test("kein Weg ist optisch bevorzugt", () => {
  // Ein Hinweis, der eine Antwort hervorhebt, fragt nicht, sondern draengt.
  // Beide Knoepfe haben dieselbe Gestalt - und es gibt kein „spaeter", das
  // den Hinweis bei jedem Besuch wiederkehren liesse, bis ihn niemand mehr
  // liest.
  const source = readFileSync("src/features/instruments/v2/InstrumentTransitionNotice.tsx", "utf8");
  // OHNE KOMMENTARE PRUEFEN. Die erste Fassung schlug an, weil im Kommentar
  // steht, warum es KEIN „später" gibt - der Test fand also genau die
  // Begruendung dafuer, dass er gruen sein sollte.
  const view = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(view, /\(\["keep_previous", "retake"\] as const\)\.map/);
  assert.ok(!/bg-slate-900 px-\d+ py-\d+ text-sm font-medium text-white/.test(view),
    "kein hervorgehobener Hauptknopf");
  assert.ok(!/später|dismiss|snooze/i.test(view), "kein Wegklicken ohne Antwort");
});

test("die Entscheidung verliert ihr Datum nicht beim Umentscheiden", () => {
  // Die Bedingung in der Datenbank ist eine Implikation und keine
  // Aequivalenz. Die Aequivalenz-Falle steckt in
  // `advisor_person_grants_approved` und kostet dort die Information, wann
  // einmal zugestimmt wurde - das sollte sich nicht wiederholen.
  const MIGRATIONS = "../supabase/migrations";
  const schema = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  assert.match(schema, /check \(decision = 'pending' or decided_at is not null\)/);
  // Die Aequivalenz waere: (decision <> 'pending') = (decided_at is not null)
  assert.ok(
    !/\(decision <> 'pending'\) = \(decided_at is not null\)/.test(schema),
    "keine Aequivalenz - sie wuerde das Umentscheiden bestrafen"
  );
});

test("das Archiv bleibt ein Status und kein zweiter Speicher", () => {
  const MIGRATIONS = "../supabase/migrations";
  const schema = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  // Keine Tabelle, in die alte Antworten umziehen. Sie bleiben, wo sie sind -
  // sonst laufen zwei Speicher desselben Sachverhalts auseinander.
  // DERSELBE FEHLER WIE AM 27.09.2026 SCHON EINMAL: `[^;]*archiv` trifft das
  // Wort „archived" irgendwo im Rumpf einer beliebigen Tabelle. Geprueft wird
  // der TABELLENNAME.
  assert.ok(
    !/create table\s+(public\.)?\w*archiv/i.test(schema),
    "kein eigener Archivspeicher - das Archiv ist ein Status"
  );
  assert.match(schema, /status text not null default 'draft'/);
});
