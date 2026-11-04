import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  TRANSITION_TO_ALIGN,
  TRANSITION_V21,
  shouldAnnounce,
} from "@/features/instruments/v21/transitionV21";
import {
  CURRENT_INSTRUMENT_ID,
  FOUNDER_PROFILE_INSTRUMENT_ID,
} from "@/features/instruments/instruments";

test("der Umstieg führt von v1 auf das Arbeitsprofil", () => {
  assert.equal(TRANSITION_TO_ALIGN.from, CURRENT_INSTRUMENT_ID);
  assert.equal(TRANSITION_TO_ALIGN.to, FOUNDER_PROFILE_INSTRUMENT_ID);

  // Und er ist ein ANDERER als der auf v2.1 - sonst ueberschriebe die eine
  // Entscheidung die andere, und wer damals "bleiben" gesagt hat, waere jetzt
  // still umgestiegen.
  assert.notEqual(TRANSITION_TO_ALIGN.to, TRANSITION_V21.to);
});

test("wer die bisherige Fassung nicht kennt, bekommt keinen Hinweis auf eine neue", () => {
  assert.equal(
    shouldAnnounce({ hasPreviousAssessment: false, transition: null }),
    false,
  );
  assert.equal(
    shouldAnnounce({ hasPreviousAssessment: true, transition: null }),
    true,
  );
});

test("eine getroffene Entscheidung beendet den Hinweis", () => {
  for (const decision of ["keep_previous", "retake"] as const) {
    assert.equal(
      shouldAnnounce({
        hasPreviousAssessment: true,
        transition: { decision, remindAfter: null },
      }),
      false,
      decision,
    );
  }
});

test("die neue Fassung steht im Menü, nicht nur auf einer Karte", () => {
  const shell = readFileSync(
    join("src", "features", "navigation", "ProductShell.tsx"), "utf8");
  // Seit 19.10.2026 liegt die Fassung unter „Fragebögen" (Align): Die Bibliothek listet sie aus der
  // Modul-Registry, und der Reiter bleibt auf dem Fragebogen selbst aktiv. Seit 04.11.2026 hat
  // „Fragebögen" keinen eigenen Eintrag mehr - die Seiten halten „Profil" aktiv, und das Profil
  // verlinkt die Bibliothek.
  assert.match(shell, /isQuestionnairesArea[\s\S]{0,600}workstyle-pretest/);
  assert.match(shell, /isProfileArea\(currentPathname\) \|\| isQuestionnairesArea\(currentPathname\)/);
  const bibliothek = readFileSync(join("src", "app", "(product)", "fragebogen", "page.tsx"), "utf8");
  assert.match(bibliothek, /MODULE_REGISTRY/);
});
