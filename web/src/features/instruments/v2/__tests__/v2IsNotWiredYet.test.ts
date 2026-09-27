import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Das Modell v2 ist noch nicht verdrahtet - und genau deshalb darf es nach
 * `main`.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESER TEST WIRKLICH SCHÜTZT
 * ---------------------------------------------------------------------------
 *
 * Der Plan in `docs/instrument-v2-architektur.md` sah einen langen Zweig ab
 * Schritt 1 vor. Schritt 1 legt aber nur Daten und Tests an; für die laufende
 * Anwendung ist er unsichtbar. Deshalb ist er gemergt worden, und die Regel
 * heißt jetzt: Was niemand erreichen kann, darf nach `main`.
 *
 * Diese Begründung hält nur, solange sie stimmt. Der erste Import aus einer
 * Route oder einem Server-Action-Modul macht v2 erreichbar - und ab da würde
 * ein halbfertiges Instrument auf Vercel liegen, während die Texte, die
 * Auswertung und der Umstiegshinweis noch fehlen. Das passiert nicht
 * absichtlich, sondern weil jemand eine Konstante braucht und den kürzesten
 * Weg nimmt.
 *
 * Wenn dieser Test rot wird, ist das keine Panne: Es ist der Moment, in dem
 * Schritt 2 beginnt. Dann gehört die Arbeit auf den langen Zweig, und dieser
 * Test wird dort gelöscht - bewusst, nicht nebenbei.
 */

const ROOT = "src";
const V2 = join("src", "features", "instruments", "v2");

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

const MENTIONS = /instruments\/v2|alignmentRegistryV2|contextRegistryV2/;

test("der Wächter sieht die Dateien überhaupt", () => {
  // EIN GRÜNER TEST, DER NICHTS DURCHSUCHT, IST WERTLOS.
  const files = [...sourceFiles(ROOT)];
  assert.ok(files.length > 300, `zu wenige Dateien durchsucht: ${files.length}`);
  assert.ok(
    files.some((file) => file.startsWith(V2) && MENTIONS.test(readFileSync(file, "utf8"))),
    "die Suche findet nicht einmal v2 selbst"
  );
});

test("niemand außerhalb von v2 greift auf das Modell v2 zu", () => {
  const callers: string[] = [];

  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V2)) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) callers.push(file);
  }

  assert.deepEqual(
    callers,
    [],
    "Das Modell v2 ist jetzt erreichbar. Damit endet die Begründung, es nach " +
      "`main` zu mergen - ab hier gehört die Arbeit auf den langen Zweig " +
      "(siehe docs/instrument-v2-architektur.md, Abschnitt 6):\n" +
      callers.join("\n")
  );
});
