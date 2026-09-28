import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Was gemessen wird, steht in der Datenschutzerklärung.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN TEST IST UND KEINE ERINNERUNG
 * ---------------------------------------------------------------------------
 *
 * Die Testfassung zeichnet auf, wie lange jemand bei einer Frage gebraucht
 * hat. Das ist personenbezogen - bei zwölf Teilnehmenden ist jede Zeile
 * zuordenbar. Eine Erklärung, die das unter „technische Nutzungsereignisse“
 * verschwinden lässt, wäre nicht falsch, aber unehrlich.
 *
 * Der Fall, den dieser Test verhindert: Jemand baut eine weitere Messung ein
 * und vergisst den Absatz. Das fällt sonst niemandem auf - der Code
 * funktioniert, die Seite lädt, und der Text stimmt nur nicht mehr.
 */

const MIGRATIONS = join("..", "supabase", "migrations");
const DATENSCHUTZ = join("src", "app", "datenschutz", "page.tsx");

const migrations = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS, name), "utf8") }));

const datenschutz = readFileSync(DATENSCHUTZ, "utf8");

test("die Aufzeichnung des Ausfüllverlaufs existiert wirklich", () => {
  // Gegenprobe: Ohne sie prüfte der Test unten eine Erklärung für etwas, das
  // es nicht gibt.
  assert.ok(
    migrations.some((entry) => /create table public\.alignment_item_views/.test(entry.sql)),
    "die Tabelle gibt es nicht mehr - dann kann der Absatz auch weg",
  );
});

test("die Datenschutzerklärung nennt sie", () => {
  assert.match(datenschutz, /Ausfüllen|Ausfüllverlauf/);
  // Die drei Dinge, die wirklich aufgezeichnet werden.
  assert.match(datenschutz, /angezeigt/, "der Zeitpunkt der Anzeige fehlt");
  assert.match(datenschutz, /beantwortet wurde/, "der Zeitpunkt der Antwort fehlt");
  assert.match(datenschutz, /geändert/, "die Zahl der Änderungen fehlt");
});

test("sie sagt auch, was NICHT passiert", () => {
  // Wer nur schreibt, was er erhebt, hat die Haelfte gesagt. Die zweite
  // Haelfte ist, wer es nicht sieht und wann es verschwindet.
  assert.match(datenschutz, /freigegeben hast/, "es fehlt, dass Freigabeempfänger es nicht sehen");
  assert.match(datenschutz, /mit ihm gelöscht/, "es fehlt, dass sie mit dem Fragebogen verschwindet");
  assert.match(datenschutz, /Forschung/, "die Abgrenzung zur Forschung fehlt");
});

test("sie nennt eine Rechtsgrundlage", () => {
  assert.match(datenschutz, /Art\. 6 Abs\. 1 lit\. f/);
});

test("die Speicherdauer steht auch im Abschnitt zur Speicherdauer", () => {
  // Nicht nur an der Stelle, wo es erhoben wird - wer nach Loeschfristen
  // sucht, liest den Abschnitt darueber.
  const speicher = datenschutz.slice(datenschutz.indexOf("speichern wir grundsätzlich"));
  assert.match(speicher, /Ausfüllverlauf/);
});
