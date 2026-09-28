import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";

/**
 * Das Instrument v2.1 ist erreichbar - aber nur unter `debug`.
 *
 * Der gefährliche Fall ist nicht, dass jemand an v2.1 weiterbaut. Es ist, dass
 * jemand einen Link vom Dashboard darauf setzt, weil es „ja schon geht“. Das
 * Instrument steht auf `draft`: Die kognitiven Interviews haben nicht
 * stattgefunden, die vier Verhaltensfragen liegen bei der Gutachterin, und
 * eine Auswertung gibt es nicht. Wer den Fragebogen hier ausfüllt, bekommt
 * nichts zurück.
 *
 * Wenn v2.1 ausgeliefert wird, darf dieser Test weg.
 */

const ROOT = "src";
const V21 = join("src", "features", "instruments", "v21") + sep;
const DEBUG = join("src", "app", "(product)", "debug") + sep;
const INSTRUMENTS = join("src", "features", "instruments") + sep;
const MENTIONS = /instruments\/v21\//;

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
  // EIN WÄCHTER, DER NICHTS FINDET, IST WERTLOS. Genau das ist dem
  // Umlaut-Skript passiert: Es meldete jahrelang „alles in Ordnung“ und hatte
  // nie eine Datei angesehen.
  const callers = [...sourceFiles(ROOT)]
    .filter((file) => !file.startsWith(V21))
    .filter((file) => MENTIONS.test(readFileSync(file, "utf8")));

  assert.ok(callers.length >= 1, "kein einziger Zugang gefunden - sucht der Test noch richtig?");
  assert.ok(
    callers.some((file) => file.startsWith(DEBUG)),
    `der bekannte Zugang unter debug fehlt: ${callers.join(", ")}`,
  );
});

test("kein Zugang zu v2.1 außerhalb von debug", () => {
  const outside: string[] = [];

  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V21) || file.startsWith(DEBUG)) continue;
    // `src/features/instruments/instruments.ts` kennt die Kennung, nicht die
    // Fragen - das ist die Liste der Fassungen und kein Zugang.
    if (file.startsWith(INSTRUMENTS) && !file.includes(sep + "v2")) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) outside.push(file);
  }

  assert.deepEqual(
    outside,
    [],
    "Diese Dateien machen das Instrument v2.1 außerhalb von `debug` erreichbar. " +
      "Es steht auf `draft`: keine kognitiven Interviews, keine Auswertung. " +
      "Ein Mensch, der es hier ausfüllt, bekommt nichts zurück:\n" + outside.join("\n"),
  );
});

/** Jede Seite unter alignment-v2-1, nicht nur die, an die ich gedacht habe. */
function pagesOfV21(): string[] {
  const root = join(DEBUG, "alignment-v2-1");
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "page.tsx") found.push(path);
    }
  };
  walk(root);
  return found;
}

test("jede Seite ist in Production nicht erreichbar", () => {
  const pages = pagesOfV21();
  // Ein Waechter, der eine fest eingetragene Datei prueft, uebersieht die
  // naechste. Deshalb alle - und mindestens zwei, sonst sucht er falsch.
  assert.ok(pages.length >= 2, `zu wenige Seiten gefunden: ${pages.join(", ")}`);
  for (const path of pages) {
    const page = readFileSync(path, "utf8");
    // Nicht nur Konvention: Die Seite selbst muss es durchsetzen.
    assert.match(page, /process\.env\.NODE_ENV === "production"/, path);
    assert.match(page, /notFound\(\)/, path);
  }
});

test("jede Seite holt die Person über getRequestUser", () => {
  // Die Middleware hat sie für diese Anfrage schon geholt; ein zweiter
  // Netzwerkgang je Seitenaufbau wäre geschenkt.
  for (const path of pagesOfV21()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /getRequestUser/, path);
    assert.ok(!/supabase\.auth\.getUser/.test(page), path);
  }
});

test("v2 und v2.1 werden nicht verwechselt", () => {
  // Der teure Fehler wäre, dass die Seite für v2.1 Antworten unter der
  // Kennung von v2 sucht - dann sähe jemand einen leeren Fragebogen, obwohl
  // er ihn ausgefüllt hat, oder schlimmer: einen fremden Stand.
  for (const path of pagesOfV21()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /ALIGNMENT_V21_INSTRUMENT_ID/, path);
    assert.ok(!/ALIGNMENT_V2_INSTRUMENT_ID/.test(page), path);
  }

  const actions = readFileSync(
    join("src", "features", "instruments", "v21", "answerActionsV21.ts"), "utf8");
  assert.match(actions, /ALIGNMENT_V21_INSTRUMENT_ID/);
  assert.ok(!/ALIGNMENT_V2_INSTRUMENT_ID\b/.test(actions.replace(/V21_INSTRUMENT_ID/g, "")));
});
