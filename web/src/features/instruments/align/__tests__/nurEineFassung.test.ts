import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screenSet } from "@/features/instruments/align/screens";
import { getItemV22, offeredItemsV22, getItemsV22 } from "@/features/instruments/align/registries";

/**
 * Wer neu anfängt, sieht nur eine Fassung.
 *
 * ---------------------------------------------------------------------------
 * DAS DASHBOARD BOT JEDEM DIE WAHL AN
 * ---------------------------------------------------------------------------
 *
 * Bis zum 30.09.2026 stand auf jedem Founder-Dashboard ein Block „Deine
 * Grundlage" mit dem alten Fragebogen als erster Karte — auch auf dem von
 * jemandem, der sich gerade angemeldet hatte. Der neue Bogen kam
 * hundertfünfzig Zeilen weiter unten. „Alte Fassung, neue Fassung, wähle" ist
 * eine Frage an Menschen, die eine Geschichte mit dem Produkt haben.
 */
const lies = (...pfad: string[]) => readFileSync(join(...pfad), "utf8");

const dashboard = lies("src", "app", "(product)", "dashboard", "page.tsx");
const karte = lies("src", "features", "instruments", "align", "AlignCard.tsx");
const daten = lies("src", "features", "instruments", "align", "dashboardData.ts");
const versionen = lies(
  "src", "app", "(product)", "founder-alignment", "versionen", "page.tsx");

test("das aktuelle Arbeitsprofil steht unabhängig von Legacy genau einmal oben", () => {
  assert.equal(dashboard.split("<AlignCard").length - 1, 1);
  assert.ok(dashboard.indexOf("<AlignCard") < dashboard.indexOf('id="dashboard-legacy-title"'));
  assert.ok(!dashboard.includes("<AlignAnnounce"));
  assert.ok(!dashboard.includes("<TransitionAnnounce"));
  assert.match(dashboard, /hasSubmittedBase && <Link href="\/me\/report"/);
});

test("die Versionsseite schickt weiter, wo es nichts zu wählen gibt", () => {
  assert.match(
    versionen,
    /if \(!has\(CURRENT_INSTRUMENT_ID\) && !has\(ALIGNMENT_V21_INSTRUMENT_ID\)\) \{\s*redirect\("\/founder-alignment\/profil"\);/,
  );
});

test("der Kasten zählt Schritte und nicht Fragen", () => {
  // Hier stand „43 Fragen zu Zielen, Zusagen, Regeln und Grenzen". Zwei
  // Fehler in einer Zeile: Die 43 zählte die zurückgezogene S01 mit, und das
  // UX-Review Teil 2, Abschnitt 14, will die Einzelfragenzahl gar nicht mehr
  // sehen.
  assert.match(karte, /Noch nicht begonnen/);
  assert.match(karte, /t\("ventureSteps", \{ count: schritte\("venture_alignment"\)/);
  assert.ok(!/\$\{state\.profile\.of\}/.test(karte), "die Fragenzahl steht wieder da");
  assert.ok(!/\$\{venture\.of\}/.test(karte), "die Fragenzahl steht wieder da");

  // Und die Zahlen stimmen mit den Bildschirmen überein, weil sie von dort
  // kommen.
  assert.equal(screenSet("founder_profile", () => true).screens.length, 7);
  assert.equal(screenSet("venture_alignment", () => true).screens.length, 9);
});

test("zurückgezogene Fragen werden nirgends mitgezählt", () => {
  // S01 ist durch S01a bis S01f und S01_top ersetzt und bleibt nur in der
  // Registratur, damit alte Antworten lesbar bleiben. Mitgezählt stand auf
  // dem Dashboard „43 Fragen" und im Bericht „von 42" - dieselbe Sache, zwei
  // Zahlen.
  assert.equal(getItemV22("S01")!.retired, true);
  assert.equal(
    getItemsV22("venture_alignment").length - offeredItemsV22("venture_alignment").length,
    1,
  );
  assert.match(daten, /of: offeredItemsV22\("venture_alignment"\)\.length/);
  assert.ok(!daten.includes("getItemsV22"), "die Zählung nimmt wieder alle Fragen");
});
