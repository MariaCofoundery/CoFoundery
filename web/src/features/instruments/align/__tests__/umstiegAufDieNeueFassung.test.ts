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

test("der Hinweis sagt die drei Dinge, die sonst fehlen", () => {
  const text = readFileSync(
    join("src", "features", "instruments", "align", "AlignAnnounce.tsx"), "utf8");

  // Befristet - weil es stimmt, und es erst kurz vorher zu sagen waere unfair.
  assert.match(text, /nicht unbegrenzt|befristet/i);
  // Die Daten bleiben - das ist die eigentliche Sorge.
  assert.match(text, /Daten bleiben|Antworten sind weiter da/i);
  // Der unangenehme Satz: Vergleich nur innerhalb einer Fassung.
  assert.match(text, /nur innerhalb einer Fassung/i);

  // Und drei Knoepfe, von denen keiner hervorgehoben ist.
  for (const knopf of ["retake", "keep_previous", "postponeTransitionV21"]) {
    assert.ok(text.includes(knopf), knopf);
  }
});

test("die neue Fassung steht im Menü, nicht nur auf einer Karte", () => {
  const shell = readFileSync(
    join("src", "features", "navigation", "ProductShell.tsx"), "utf8");
  assert.match(shell, /href: "\/me\/profile\/workstyle"/);
  assert.match(shell, /alignNewVersion/);
});
