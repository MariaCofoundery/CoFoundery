import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BEHAVIOUR_SET_V21,
  getBehaviourItems,
  behaviourItemFor,
  crossCheck,
} from "@/features/instruments/align/behaviourItems";
import { getItemV22, getItemsV22 } from "@/features/instruments/align/registries";

test("die Verhaltensfragen stehen NICHT in der geprüften Quelle", () => {
  // Wäre eine von ihnen dort gelandet, hätte sie die Autorität einer fachlich
  // geprüften Frage, ohne geprüft zu sein. Der Wächtertest auf der Registratur
  // schlägt dann an - dieser hier sagt, warum das richtig ist.
  const sourcePath = join(process.cwd(), "..", "docs", "CoFoundery_Align_v2_1_Items.json");
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as { items: { id: string }[] };
  const inSource = new Set(source.items.map((item) => item.id));
  for (const item of getBehaviourItems()) {
    assert.ok(!inSource.has(item.itemId), `${item.itemId} steht in der Quelle`);
    assert.equal(getItemV22(item.itemId), null, `${item.itemId} steht in der Registratur`);
  }
});

test("der Status steht in der Datei, nicht nur in einem Kommentar", () => {
  assert.equal(BEHAVIOUR_SET_V21.status, "candidate_for_pretest");
  assert.match(BEHAVIOUR_SET_V21.basedOn, /Gutachterinnenreview/);
});

test("jede Verhaltensfrage gehört zu einer Frage, die es wirklich gibt", () => {
  // Und zwar in den AKTUELLEN Boegen. Genau daran ist T91 aufgefallen: Es war
  // auf T03 gebaut, und T03 hat die Master-Fassung gestrichen.
  for (const item of getBehaviourItems()) {
    const gegenstueck = getItemV22(item.crossChecks);
    assert.ok(gegenstueck, `${item.itemId} → ${item.crossChecks}`);
    assert.ok(!gegenstueck!.retired, `${item.itemId} → ${item.crossChecks} ist zurueckgezogen`);
    // Im SELBEN Bogen - sonst ueberquert die Nebeneinanderstellung eine
    // Grenze, die wir sonst nicht ueberqueren.
    assert.equal(
      getItemsV22(item.module).some((entry) => entry.itemId === item.crossChecks),
      true,
      `${item.itemId} liegt in ${item.module}, ${item.crossChecks} nicht`,
    );
  }
  assert.equal(behaviourItemFor("A02")?.itemId, "A91");
  assert.equal(behaviourItemFor("U04")?.itemId, "U91");
  assert.equal(behaviourItemFor("K01")?.itemId, "K91");
  // T91 haengt seit dem Gutachterinnenreview vom 29.09.2026 an T01: T03 hat
  // die Master-Fassung gestrichen, und T91 deswegen fallenzulassen waere die
  // falsche Folge gewesen.
  assert.equal(behaviourItemFor("T01")?.itemId, "T91");
  assert.equal(behaviourItemFor("T03"), null, "T03 gibt es nicht mehr");
});

test("jede Frage nennt ihren Bezugszeitraum - oder die Lücke steht dabei", () => {
  // „Wie häufig“ ohne Zeitraum war genau die Frage, die im September 2026 als
  // unklar zurückkam: Sie lässt offen, woran jemand sich erinnern soll.
  //
  // Die Zeitraeume sind seit dem Review ABSICHTLICH verschieden - sechs Monate
  // fuer die seltenen Ereignisse, drei fuer die haeufigen. Geprueft wird
  // deshalb gegen den Zeitraum AM ITEM und nicht gegen eine feste Zahl.
  for (const item of getBehaviourItems()) {
    const erwartet = item.referencePeriod
      .replace("6 Monate", "sechs Monaten")
      .replace("3 Monate", "drei Monaten");
    assert.equal(
      item.prompt.includes(erwartet),
      item.referencePeriodInPrompt,
      `${item.itemId}: Fragetext und referencePeriodInPrompt widersprechen sich`,
    );
  }

  // U91 ist die eine offene Stelle - mit Namen, nicht als stille Ausnahme.
  // Der ueberarbeitete Satz nennt nur "die letzte Entscheidung, die in diesem
  // Vorhaben ... fiel" und laesst offen, wie weit zurueck.
  const ohne = getBehaviourItems().filter((item) => !item.referencePeriodInPrompt);
  assert.deepEqual(ohne.map((item) => item.itemId), ["U91"]);
});

test("jede Frage lässt zu, dass die Situation nicht vorkam", () => {
  for (const item of getBehaviourItems()) {
    const noOccasion = item.options.filter((option) => option.noOccasion);
    assert.equal(noOccasion.length, 1, `${item.itemId}: genau eine solche Option`);
  }
});

test("„kam nicht vor“ beendet den Vergleich, statt ein Unterschied zu sein", () => {
  const item = behaviourItemFor("K01")!;
  const noOccasion = item.options.find((option) => option.noOccasion)!;
  const verdict = crossCheck({
    wishItemId: "K01",
    wishOptionId: getItemV22("K01")!.options[0].optionId,
    behaviourOptionId: noOccasion.optionId,
  });
  assert.deepEqual(verdict, { kind: "no_basis", why: "no_occasion" });
});

test("nah beieinander heißt nah beieinander", () => {
  const wish = getItemV22("K01")!.options[1].optionId;
  const behaviour = behaviourItemFor("K01")!.options[1].optionId;
  const verdict = crossCheck({ wishItemId: "K01", wishOptionId: wish, behaviourOptionId: behaviour });
  assert.equal(verdict.kind, "aligned");
});

test("weit auseinander ergibt ein Gesprächsthema - kein Urteil, keine Zahl", () => {
  const wish = getItemV22("K01")!.options[0].optionId;        // erste Skizze
  const behaviour = behaviourItemFor("K01")!.options[3].optionId; // aus meiner Sicht fertig
  const verdict = crossCheck({ wishItemId: "K01", wishOptionId: wish, behaviourOptionId: behaviour });
  assert.equal(verdict.kind, "worth_a_conversation");
  assert.ok("wishLabel" in verdict && "behaviourLabel" in verdict, "beides wird gezeigt");
});

test("nirgends entsteht eine Übereinstimmungszahl oder ein Gültigkeitsurteil", () => {
  // Wer sich etwas wünscht und zuletzt anders gehandelt hat, hat nicht falsch
  // geantwortet. Aus einem Unterschied eine Aussage über die Gültigkeit der
  // Selbstauskunft zu machen, wäre genau die Anmaßung, die dieses Instrument
  // sonst überall vermeidet.
  const wish = getItemV22("K01")!;
  for (const wishOption of wish.options) {
    for (const behaviourOption of behaviourItemFor("K01")!.options) {
      const verdict = crossCheck({
        wishItemId: "K01",
        wishOptionId: wishOption.optionId,
        behaviourOptionId: behaviourOption.optionId,
      });
      const asText = JSON.stringify(verdict);
      assert.ok(!/\d+\s*%|score|match|consistenc|valid|inkonsist|unglaubw/i.test(asText),
        `${wishOption.optionId}/${behaviourOption.optionId}: ${asText}`);
      for (const value of Object.values(verdict)) {
        assert.notEqual(typeof value, "number", "keine Zahl im Ergebnis");
      }
    }
  }
  assert.match(BEHAVIOUR_SET_V21.reportingRule, /nie als Gueltigkeitsurteil/i);

  // Und die Saetze, die nie dastehen duerfen, stehen als solche in der Datei -
  // damit niemand sie fuer eine Vorlage haelt.
  assert.ok(BEHAVIOUR_SET_V21.forbiddenPhrasings.some((satz) => /inkonsistent/i.test(satz)));
  assert.ok(BEHAVIOUR_SET_V21.reportingExamples.length >= 2);
});

test("wo es keine gemeinsame Abfolge gibt, wird nicht gerechnet", () => {
  // A02 fragt nach Häufigkeit, A91 nach einem einzelnen Fall. Ein Abstand
  // zwischen „häufig“ und „ja, bevor ich entschieden habe“ wäre eine Zahl
  // zwischen zwei Dingen ohne gemeinsame Skala.
  const verdict = crossCheck({
    wishItemId: "A02",
    wishOptionId: getItemV22("A02")!.options[4].optionId,   // fast immer
    behaviourOptionId: behaviourItemFor("A02")!.options[0].optionId, // ja
  });
  assert.equal(verdict.kind, "worth_a_conversation",
    "ohne gemeinsame Abfolge wird beides gezeigt statt verrechnet");
});

test("„gar nicht angesprochen“ wird nicht als späterer Zeitpunkt verrechnet", () => {
  const outside = behaviourItemFor("T01")!.options.find((option) => option.outsideSequence);
  assert.ok(outside, "die Option ist als außerhalb der Abfolge markiert");
  const verdict = crossCheck({
    wishItemId: "T01",
    wishOptionId: getItemV22("T01")!.options[3].optionId, // nach mehr als einem Arbeitstag
    behaviourOptionId: outside!.optionId,
  });
  // Direkt benachbart in der Liste - und trotzdem kein „aligned“, weil es
  // keine gemeinsame Skala ist.
  assert.equal(verdict.kind, "worth_a_conversation");
});

test("eine fehlende Antwort auf einer der beiden Seiten ergibt keinen Vergleich", () => {
  assert.deepEqual(
    crossCheck({ wishItemId: "K01", wishOptionId: null, behaviourOptionId: "K91_o1" }),
    { kind: "no_basis", why: "missing_answer" },
  );
  assert.deepEqual(
    crossCheck({ wishItemId: "K01", wishOptionId: "K01_o1", behaviourOptionId: null }),
    { kind: "no_basis", why: "missing_answer" },
  );
});
