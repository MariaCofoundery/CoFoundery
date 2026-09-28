import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BEHAVIOUR_SET_V21,
  getBehaviourItems,
  behaviourItemFor,
  crossCheck,
} from "@/features/instruments/v21/behaviourV21";
import { getItemV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

test("die Verhaltensfragen stehen NICHT in der geprüften Quelle", () => {
  // Wäre eine von ihnen dort gelandet, hätte sie die Autorität einer fachlich
  // geprüften Frage, ohne geprüft zu sein. Der Wächtertest auf der Registratur
  // schlägt dann an - dieser hier sagt, warum das richtig ist.
  const sourcePath = join(process.cwd(), "..", "docs", "CoFoundery_Align_v2_1_Items.json");
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as { items: { id: string }[] };
  const inSource = new Set(source.items.map((item) => item.id));
  for (const item of getBehaviourItems()) {
    assert.ok(!inSource.has(item.itemId), `${item.itemId} steht in der Quelle`);
    assert.equal(getItemV21(item.itemId), null, `${item.itemId} steht in der Registratur`);
  }
});

test("der Vorschlagsstatus steht in der Datei, nicht nur in einem Kommentar", () => {
  assert.equal(BEHAVIOUR_SET_V21.status, "proposal");
  assert.equal(BEHAVIOUR_SET_V21.belongsTo, REGISTRY_V21.instrumentId);
});

test("jede Verhaltensfrage gehört zu einer Frage, die es wirklich gibt", () => {
  for (const item of getBehaviourItems()) {
    assert.ok(getItemV21(item.crossChecks), `${item.itemId} → ${item.crossChecks}`);
  }
  assert.equal(behaviourItemFor("A02")?.itemId, "A91");
  assert.equal(behaviourItemFor("U04")?.itemId, "U91");
  assert.equal(behaviourItemFor("K01")?.itemId, "K91");
  assert.equal(behaviourItemFor("T03")?.itemId, "T91");
});

test("jede Frage nennt ihren Bezugszeitraum", () => {
  // „Wie häufig“ ohne Zeitraum war genau die Frage, die im September 2026 als
  // unklar zurückkam: Sie lässt offen, woran jemand sich erinnern soll.
  for (const item of getBehaviourItems()) {
    assert.match(item.prompt, /vergangenen drei Monaten/, item.itemId);
  }
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
    wishOptionId: getItemV21("K01")!.options[0].optionId,
    behaviourOptionId: noOccasion.optionId,
  });
  assert.deepEqual(verdict, { kind: "no_basis", why: "no_occasion" });
});

test("nah beieinander heißt nah beieinander", () => {
  const wish = getItemV21("K01")!.options[1].optionId;
  const behaviour = behaviourItemFor("K01")!.options[1].optionId;
  const verdict = crossCheck({ wishItemId: "K01", wishOptionId: wish, behaviourOptionId: behaviour });
  assert.equal(verdict.kind, "aligned");
});

test("weit auseinander ergibt ein Gesprächsthema - kein Urteil, keine Zahl", () => {
  const wish = getItemV21("K01")!.options[0].optionId;        // erste Skizze
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
  const wish = getItemV21("K01")!;
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
});

test("wo es keine gemeinsame Abfolge gibt, wird nicht gerechnet", () => {
  // A02 fragt nach Häufigkeit, A91 nach einem einzelnen Fall. Ein Abstand
  // zwischen „häufig“ und „ja, bevor ich entschieden habe“ wäre eine Zahl
  // zwischen zwei Dingen ohne gemeinsame Skala.
  const verdict = crossCheck({
    wishItemId: "A02",
    wishOptionId: getItemV21("A02")!.options[4].optionId,   // fast immer
    behaviourOptionId: behaviourItemFor("A02")!.options[0].optionId, // ja
  });
  assert.equal(verdict.kind, "worth_a_conversation",
    "ohne gemeinsame Abfolge wird beides gezeigt statt verrechnet");
});

test("„gar nicht angesprochen“ wird nicht als späterer Zeitpunkt verrechnet", () => {
  const outside = behaviourItemFor("T03")!.options.find((option) => option.outsideSequence);
  assert.ok(outside, "die Option ist als außerhalb der Abfolge markiert");
  const verdict = crossCheck({
    wishItemId: "T03",
    wishOptionId: getItemV21("T03")!.options[3].optionId, // nach mehr als einem Arbeitstag
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
