import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldAnnounce,
  archiveHint,
  isTransitionDecision,
  TRANSITION_V21,
  REMIND_AFTER_DAYS,
} from "@/features/instruments/v21/transitionV21";
import {
  ALIGNMENT_V21_INSTRUMENT_ID,
  CURRENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";

const jetzt = new Date("2026-10-01T12:00:00Z");
const inTagen = (days: number) =>
  new Date(jetzt.getTime() + days * 24 * 3600 * 1000).toISOString();

test("der Umstieg geht von der geltenden Fassung zur neuen", () => {
  assert.equal(TRANSITION_V21.from, CURRENT_INSTRUMENT_ID);
  assert.equal(TRANSITION_V21.to, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.notEqual(TRANSITION_V21.from, TRANSITION_V21.to);
});

test("wer die bisherige Fassung nie ausgefüllt hat, bekommt keinen Hinweis", () => {
  // Er soll keinen Hinweis auf eine Neufassung von etwas bekommen, das er nie
  // gesehen hat - sondern einfach den aktuellen Fragebogen.
  assert.equal(
    shouldAnnounce({ hasPreviousAssessment: false, transition: null, now: jetzt }),
    false,
  );
});

test("wer sie kennt und noch nichts gesagt hat, bekommt ihn", () => {
  assert.equal(
    shouldAnnounce({ hasPreviousAssessment: true, transition: null, now: jetzt }),
    true,
  );
});

test("wer entschieden hat, bekommt ihn nicht mehr - in beide Richtungen", () => {
  for (const decision of ["keep_previous", "retake"] as const) {
    assert.equal(
      shouldAnnounce({
        hasPreviousAssessment: true,
        transition: { decision, remindAfter: null },
        now: jetzt,
      }),
      false,
      decision,
    );
  }
});

test("„später“ verschafft Ruhe - und der Hinweis kommt danach wieder", () => {
  // Ein Hinweis, der bei jedem Seitenaufbau wiederkommt, wird nach dem
  // dritten Mal weggeklickt, ohne gelesen zu werden. Danach ist er wertlos.
  assert.equal(
    shouldAnnounce({
      hasPreviousAssessment: true,
      transition: { decision: "pending", remindAfter: inTagen(10) },
      now: jetzt,
    }),
    false,
    "er kommt zu frueh wieder",
  );
  assert.equal(
    shouldAnnounce({
      hasPreviousAssessment: true,
      transition: { decision: "pending", remindAfter: inTagen(-1) },
      now: jetzt,
    }),
    true,
    "er kommt gar nicht wieder",
  );
});

test("die Ruhe ist begrenzt und nicht endlos", () => {
  assert.ok(REMIND_AFTER_DAYS > 0 && REMIND_AFTER_DAYS <= 90);
});

test("„später“ ist keine Entscheidung", () => {
  // Waere es eine, muesste jede spaetere Auswertung raten, ob sie naeher an
  // „bleiben“ oder an „wechseln“ liegt.
  assert.equal(isTransitionDecision("postponed"), false);
  assert.equal(isTransitionDecision("pending"), true);
});

test("bei jeder Entscheidung steht, dass nichts zufällt", () => {
  // Wer bleibt, soll die neue Fassung wiederfinden. Wer wechselt, seinen
  // alten Report. Sonst ist „nichts geht verloren“ eine Behauptung.
  assert.match(archiveHint("keep_previous"), /jederzeit|noch/);
  assert.match(archiveHint("retake"), /bleibt erhalten|abrufbar/);
  assert.match(archiveHint("pending"), /beide|offen/i);
});
