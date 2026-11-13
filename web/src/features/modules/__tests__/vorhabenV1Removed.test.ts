import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { MODULE_REGISTRY } from "@/features/modules/registry";
import { startStepHref } from "@/features/dashboard/founderStart";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Das fruehere Vorhaben (v1, 42 Fragen) wird nicht mehr angeboten (Entscheidung vom 12.11.2026): Die Beta ist die
 * einzige Fassung. Was bleibt, sind die DATEN und die Wege zum LESEN.
 */
test("Bibliothek und Start bieten das v1-Vorhaben nicht mehr an", () => {
  const library = read("src/app/(product)/fragebogen/page.tsx");
  assert.match(library, /def\.moduleId !== "venture_core"/);
  assert.doesNotMatch(library, /const ORDER = \[[^\]]*"venture_core"\]/);
  assert.match(startStepHref({ kind: "venture_start", teamId: "t" }), /\/founder-alignment\/vorhaben\/beta\?venture=t/);
});

test("Die alte Adresse leitet in die Beta weiter und zeigt keinen Fragebogen mehr", () => {
  const page = read("src/app/(product)/founder-alignment/vorhaben/page.tsx");
  assert.match(page, /redirect\(`\/founder-alignment\/vorhaben\/beta/);
  assert.doesNotMatch(page, /Questionnaire|resolveVenture|buildSections/);
});

test("Daten und Lesewege bleiben: Definition, Antwortseite, Bestaetigung, Instrument", () => {
  assert.ok(MODULE_REGISTRY.some((def) => def.moduleId === "venture_core"), "die Definition traegt Daten und Profilkarte");
  assert.ok(existsSync("src/app/(product)/founder-alignment/vorhaben/antworten/page.tsx"));
  assert.ok(existsSync("src/app/(product)/founder-alignment/vorhaben/bestaetigen/page.tsx"));
  assert.match(read("src/features/instruments/instruments.ts"), /venture-alignment-v1/);
});

test("Kein stiller Wechsel: Die Startseite zaehlt das Vorhaben nur noch aus der Beta", () => {
  const dashboard = read("src/app/(product)/dashboard/page.tsx");
  assert.match(dashboard, /loadBetaReadiness/);
  assert.doesNotMatch(dashboard, /ventureOf\(/);
});
