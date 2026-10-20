import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { readCapabilityAreaIds } from "@/features/capability/capabilityVocabularyFromFiles";

// Jeder Bereich braucht eine Erklaerung, in beiden Sprachen: Begriffe wie
// "Product Discovery" sind nicht allen klar (Maria, 21.10.2026).
test("jeder Bereich hat eine Erklaerung in Deutsch und Englisch", () => {
  const ids = readCapabilityAreaIds("../supabase/migrations");
  assert.ok(ids.length >= 54);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      areaHints: Record<string, string>;
    };
    for (const id of ids) {
      const hint = messages.areaHints[id];
      assert.ok(hint && hint.trim().length >= 20, `${locale}: Erklaerung fuer ${id} fehlt oder ist zu kurz`);
      assert.ok(hint.length <= 200, `${locale}: Erklaerung fuer ${id} ist zu lang`);
    }
  }
});
