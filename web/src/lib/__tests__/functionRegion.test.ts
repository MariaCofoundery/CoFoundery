import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

/**
 * Die Serverfunktionen laufen dort, wo die Datenbank steht.
 *
 * Bis 18.09.2026 lief beides an verschiedenen Enden der Welt: Supabase in
 * London, die Vercel-Funktionen in Washington (iad1, die Voreinstellung).
 * Jede einzelne Datenabfrage ueberquerte damit den Atlantik - rund 80
 * Millisekunden hin und zurueck. Eine Seite mit zehn Abfragen wartete fast
 * eine Sekunde auf nichts als Entfernung.
 *
 * Das war die groesste Bremse im ganzen Aufbau, groesser als alles im Code.
 *
 * WARUM DIE DATEI HIER LIEGT UND NICHT IM WURZELVERZEICHNIS:
 *   Vercel liest vercel.json aus dem Root Directory des Projekts, und das ist
 *   "web". Im Wurzelverzeichnis des Repos wuerde sie stillschweigend ignoriert
 *   - eine Konfiguration, die aussieht als wuerde sie gelten, ist schlimmer
 *   als gar keine.
 *
 * WARUM LONDON UND NICHT FRANKFURT:
 *   Die Datenbank steht in London (Supabase "West Europe"). Frankfurt waere
 *   auch deutlich besser als Washington, kostete aber weiterhin 15 bis 20
 *   Millisekunden je Abfrage. Massgeblich ist, wo die Datenbank steht - nicht,
 *   wo die Nutzerinnen sitzen: Die Middleware laeuft ohnehin am naechsten
 *   Edge-Standort, die Seiten dagegen reden mit der Datenbank.
 *
 * JSON kann keine Kommentare tragen. Deshalb steht die Begruendung hier, und
 * dieser Test haelt die Entscheidung fest.
 */

const CONFIG = "vercel.json";

test("die Serverfunktionen laufen neben der Datenbank", () => {
  assert.ok(existsSync(CONFIG), "vercel.json fehlt - die Funktionen laufen wieder in Washington");

  const config = JSON.parse(readFileSync(CONFIG, "utf8")) as { regions?: unknown };
  assert.deepEqual(
    config.regions,
    ["lhr1"],
    "Supabase steht in London (lhr1). Eine andere Region heisst: jede Abfrage zahlt die Entfernung."
  );
});

test("die Datei liegt im Root Directory des Vercel-Projekts", () => {
  // Root Directory ist "web". Liegt die Datei daneben, wird sie ignoriert -
  // ohne Fehler, ohne Hinweis, und die Funktionen laufen weiter in der
  // Voreinstellung.
  assert.ok(existsSync("next.config.mjs"), "diese Pruefung laeuft nicht im erwarteten Verzeichnis");
  assert.ok(existsSync(CONFIG), "vercel.json liegt nicht neben next.config.mjs");
  assert.ok(!existsSync("../vercel.json"), "im Repo-Wurzelverzeichnis wuerde sie ignoriert");
});
