import test from "node:test";
import assert from "node:assert/strict";

import { followUpPairs } from "@/features/instruments/align/questionnaireData";
import { getItemsV22 } from "@/features/instruments/align/registries";
import { orphanedFollowUps } from "@/features/instruments/v21/progressV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

test("die Anschlussfragen werden aus dem Bogen abgeleitet", () => {
  // Eine feste Liste waere nach dem ersten neuen Item falsch.
  assert.deepEqual(followUpPairs("venture_alignment"), { L02: "L01" });

  // Und das Arbeitsprofil hat keine - es gibt dort nichts, was je Eintrag
  // geschrieben wird.
  assert.deepEqual(followUpPairs("founder_profile"), {});

  // Die abgeleitete Regel muss zum Bogen passen: L02 schreibt je Eintrag und
  // haengt an L01.
  const l02 = getItemsV22("venture_alignment").find((item) => item.itemId === "L02");
  assert.equal(l02?.answerFormat, "free_text_per_entry");
  assert.equal(l02?.showAfter, "L01");
});

test("eine gestrichene Grenze laesst die Antwort darauf nicht verschwinden", () => {
  // Der Fall: L01 nennt zwei Grenzen, L02 beschreibt beide - dann wird eine
  // gestrichen. Was zur gestrichenen geschrieben wurde, ist nicht weg, und es
  // wird auch nicht stillschweigend geloescht.
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: {
      blockId: "L01",
      value: { entries: [{ entryId: "e1", text: "keine Werbung an Kinder" }] },
    },
    L02: {
      blockId: "L02",
      value: { perEntry: { e1: "wenn Kinder angesprochen werden", e2: "steht nicht mehr da" } },
    },
  };

  assert.deepEqual(
    orphanedFollowUps(answers, followUpPairs("venture_alignment")),
    [{ itemId: "L02", entryIds: ["e2"] }],
  );
});

test("ohne Paare bleibt es bei v2.1 - die alten Seiten rufen weiter auf wie bisher", () => {
  // Der Fehler war, dass es NUR v2.1 gab: getItemV21 kannte die Venture-Frage
  // nicht, also meldete die Pruefung dort nie etwas.
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: { blockId: "L01", value: { entries: [] } },
    L02: { blockId: "L02", value: { perEntry: { e1: "zeigt ins Leere" } } },
  };

  assert.deepEqual(orphanedFollowUps(answers, followUpPairs("venture_alignment")), [
    { itemId: "L02", entryIds: ["e1"] },
  ]);
  // Ohne Angabe wird gegen v2.1 geprueft - dort gibt es dieselben Kennungen,
  // also faellt es dort ebenfalls auf. Wichtig ist, dass beides funktioniert.
  assert.equal(orphanedFollowUps(answers).length, 1);
});
