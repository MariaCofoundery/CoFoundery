import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/(product)/fragebogen/page.tsx", "utf8");

// 21.10.2026: Die Fragebogen-Seite hat einen klaren Startpunkt - einen, in fester Reihenfolge.
test("Beginne hier: ein Schritt in fester Reihenfolge, der Rest leiser", () => {
  assert.match(page, /const ORDER = \["workstyle", "capability", "venture_core_beta", "venture_core"\]/);
  assert.match(page, /card\.state !== "done_for_now"/);
  // Nur ohne Filter; ohne offenen Schritt entfaellt der Block.
  assert.match(page, /\{first && !filter \? \(/);
  // Keine Prozente, keine Zaehler.
  const block = page.slice(page.indexOf('aria-labelledby="q-start"'), page.indexOf('aria-label={t("filters.label")}'));
  assert.doesNotMatch(block, /%|percent|von\s+\d|\bscore\b/i);
});

test("die Texte stehen in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const start = (JSON.parse(readFileSync(`messages/${locale}/questionnaires.json`, "utf8")) as { start: Record<string, string> }).start;
    for (const key of ["here", "next", "after", "workstyleLead"]) assert.ok(start[key], `${locale}: start.${key}`);
  }
});
