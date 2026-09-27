import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Das Modell v2 ist erreichbar - aber nur unter `debug`.
 *
 * ---------------------------------------------------------------------------
 * DER NACHFOLGER VON `v2IsNotWiredYet`
 * ---------------------------------------------------------------------------
 *
 * Bis Schritt 2b galt: Niemand außerhalb von `v2/` greift darauf zu. Diese
 * Regel ist mit der Oberfläche (Schritt 2c, 27.09.2026) gefallen - eine Seite,
 * die niemand aufrufen kann, ist keine Seite. Der alte Test wurde gelöscht,
 * wie es in seinem eigenen Kommentar stand: bewusst, nicht nebenbei.
 *
 * WAS AN SEINE STELLE TRITT, IST DIE SCHÄRFERE REGEL. Das Instrument steht auf
 * `draft`: Die Texte sind nicht redigiert, die kognitiven Interviews haben
 * nicht stattgefunden, es gibt keine Auswertung. Solange das so ist, darf es
 * genau eine Art von Zugang geben - die Seiten unter `debug`, die in
 * Production 404 sind.
 *
 * Der gefährliche Fall ist nicht, dass jemand v2 baut. Es ist, dass jemand
 * einen Link vom Dashboard darauf setzt, weil es „ja schon geht". Dann füllt
 * ein Mensch einen Fragebogen aus, dessen Auswertung es nicht gibt.
 *
 * Wird dieser Test rot, ist die Frage nicht „wie mache ich ihn grün", sondern
 * „ist v2 fertig?". Wenn ja: Schritt 9, `instruments.status` auf `active`, und
 * dann darf dieser Test weg.
 */

const ROOT = "src";
const V2 = join("src", "features", "instruments", "v2");
const DEBUG = join("src", "app", "(product)", "debug");
const MENTIONS = /instruments\/v2/;

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }
    // Tests zählen nicht: Sie werden nicht ausgeliefert.
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

test("der Wächter sieht die Dateien und findet den vorhandenen Zugang", () => {
  const callers = [...sourceFiles(ROOT)]
    .filter((file) => !file.startsWith(V2))
    .filter((file) => MENTIONS.test(readFileSync(file, "utf8")));

  // EIN WÄCHTER, DER NICHTS FINDET, IST WERTLOS. Es gibt genau einen Zugang,
  // und er muss auffindbar sein - sonst prüft der nächste Test die Leere.
  assert.ok(callers.length >= 1, "kein einziger Zugang gefunden - sucht der Test noch richtig?");
  assert.ok(
    callers.some((file) => file.startsWith(DEBUG)),
    `der bekannte Zugang unter debug fehlt: ${callers.join(", ")}`
  );
});

test("kein Zugang zu v2 außerhalb von debug", () => {
  const outside: string[] = [];

  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V2) || file.startsWith(DEBUG)) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) outside.push(file);
  }

  assert.deepEqual(
    outside,
    [],
    "Diese Dateien machen das Instrument v2 außerhalb von `debug` erreichbar. " +
      "Es steht auf `draft`: keine redigierten Texte, keine kognitiven " +
      "Interviews, keine Auswertung. Ein Mensch, der es hier ausfüllt, bekommt " +
      "nichts zurück:\n" + outside.join("\n")
  );
});

test("die Seite ist in Production nicht erreichbar", () => {
  const page = readFileSync(
    join(DEBUG, "alignment-v2", "[module]", "page.tsx"),
    "utf8"
  );
  // Nicht nur Konvention: Die Seite selbst muss es durchsetzen.
  assert.match(page, /process\.env\.NODE_ENV === "production"/);
  assert.match(page, /notFound\(\)/);
});
