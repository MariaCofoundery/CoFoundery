import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildSectionsV21 } from "@/features/instruments/v21/questionnaireDataV21";
import { getItemsV21, getItemV21 } from "@/features/instruments/v21/registryV21";
import { validateAnswerV21, completenessV21 } from "@/features/instruments/v21/answersV21";

/**
 * Keine Angabe aus der Registratur verschwindet auf dem Weg zum Bildschirm.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESEN TEST GIBT
 * ---------------------------------------------------------------------------
 *
 * Die fachliche Durchsicht hat genau diesen Fehler schon einmal gefunden: „R02
 * und R03 erscheinen ohne ihre Eingabefelder.“ Damals lag er im Export.
 *
 * Beim Bauen der Oberfläche habe ich ihn wiederholt. R06 hat eine Folgefrage
 * („Was müsste dafür erfüllt sein?“) - mein Feld für Einzelauswahl zeigte gar
 * keine. R04 hat bedingte Zusatzfelder - die kamen im Browser nicht einmal an.
 * Beides steht in der Quelle und stand nicht auf dem Bildschirm.
 *
 * Eine Frage, die in der Registratur steht und auf dem Bildschirm fehlt, ist
 * unsichtbar falsch: Der Fragebogen sieht vollständig aus.
 */

const views = buildSectionsV21().flatMap((section) => section.items);
const viewOf = (itemId: string) => views.find((item) => item.itemId === itemId)!;

test("jede Zusatzangabe der Registratur kommt im Browser an", () => {
  const swallowed: string[] = [];

  for (const item of getItemsV21()) {
    const view = viewOf(item.itemId);
    if (item.fields?.length && !view.fields?.length) {
      swallowed.push(`${item.itemId}: fields`);
    }
    if (item.conditionalFields?.length && !view.conditionalFields?.length) {
      swallowed.push(`${item.itemId}: conditionalFields`);
    }
    if (item.followup?.question && !view.followup) {
      swallowed.push(`${item.itemId}: followup`);
    }
    if (item.followup?.options?.length && !view.followup?.options.length) {
      swallowed.push(`${item.itemId}: followup.options`);
    }
    if (item.followup?.fields?.length && !view.followup?.fields.length) {
      swallowed.push(`${item.itemId}: followup.fields`);
    }
  }

  assert.deepEqual(
    swallowed,
    [],
    "Diese Angaben stehen in der Registratur und kommen nicht im Browser an.\n" +
      "Eine Frage, die vollstaendig aussieht und es nicht ist, faellt niemandem auf:\n" +
      swallowed.join("\n"),
  );
});

test("der Wächter sieht überhaupt etwas", () => {
  // Ein Test, der ueber eine leere Menge laeuft, ist immer gruen.
  assert.ok(getItemsV21().some((item) => item.followup?.question), "kein Item mit Folgefrage");
  assert.ok(getItemsV21().some((item) => item.conditionalFields?.length), "keins mit Zusatzfeldern");
  assert.ok(getItemsV21().some((item) => item.fields?.length), "keins mit Eingabefeldern");
});

test("jede Folgefrage hat Kennungen statt Texten", () => {
  // Eine Auswahl wird ueber ihre Kennung gespeichert, nie ueber ihren Text -
  // sonst haengt sie nach der ersten Umformulierung in der Luft. Das galt
  // bisher fuer die Hauptantworten und nicht fuer die Folgefragen.
  for (const item of getItemsV21()) {
    for (const option of item.followup?.options ?? []) {
      assert.match(option.optionId, new RegExp(`^${item.itemId}_f\\d+$`), item.itemId);
      assert.ok(option.label.trim().length > 2);
    }
  }
});

test("die Kennungen der Folgefragen stehen im Schlüsselbund", () => {
  // Sonst waeren sie das Einzige, was beim Umsortieren lautlos kaputtgehen
  // koennte.
  const lock = JSON.parse(
    readFileSync(join(process.cwd(), "docs", "founder-alignment-option-ids-v2-1.json"), "utf8"),
  ) as { items: Record<string, string[]> };

  for (const item of getItemsV21()) {
    const options = item.followup?.options;
    if (!options?.length) continue;
    assert.deepEqual(
      lock.items[`${item.itemId}.followup`],
      options.map((option) => option.optionId),
      `${item.itemId}: Folgefrage fehlt im Schluesselbund oder weicht ab`,
    );
  }
});

test("R06: die Folgefrage erscheint nur bei der Antwort, die sie auslöst", () => {
  const r06 = getItemV21("R06")!;
  const trigger = r06.followup!.triggerOptionId!;
  const andere = r06.options.find((option) => option.optionId !== trigger)!.optionId;
  const bedingung = r06.followup!.options![0].optionId;

  // Wer „das ist schon meine Haupttaetigkeit“ waehlt, bekommt die Folgefrage
  // nicht zu sehen - und darf sie deshalb nicht beantwortet haben.
  assert.equal(
    validateAnswerV21({
      blockId: "R06",
      value: { optionId: andere, followupOptionIds: [bedingung] },
    }).ok,
    false,
  );
  assert.equal(
    validateAnswerV21({ blockId: "R06", value: { optionId: andere } }).ok,
    true,
  );
  assert.equal(
    validateAnswerV21({
      blockId: "R06",
      value: { optionId: trigger, followupOptionIds: [bedingung] },
    }).ok,
    true,
  );
});

test("R06: „keine besondere Bedingung“ schließt die anderen aus", () => {
  const followup = getItemV21("R06")!.followup!;
  const exclusive = followup.options!.find((option) => option.exclusive)!.optionId;
  const trigger = getItemV21("R06")!.followup!.triggerOptionId!;

  assert.equal(
    validateAnswerV21({
      blockId: "R06",
      value: { optionId: trigger, followupOptionIds: [followup.options![0].optionId, exclusive] },
    }).ok,
    false,
  );
  assert.equal(
    validateAnswerV21({
      blockId: "R06",
      value: { optionId: trigger, followupOptionIds: [exclusive] },
    }).ok,
    true,
  );
});

test("R06 ist erst vollständig, wenn die sichtbare Folgefrage beantwortet ist", () => {
  const r06 = getItemV21("R06")!;
  const trigger = r06.followup!.triggerOptionId!;
  const andere = r06.options.find((option) => option.optionId !== trigger)!.optionId;

  assert.equal(completenessV21("R06", { optionId: trigger }), "incomplete");
  assert.equal(
    completenessV21("R06", { optionId: trigger, followupOptionIds: [r06.followup!.options![0].optionId] }),
    "complete",
  );
  // Ohne die Folgefrage ist die Antwort für sich vollständig.
  assert.equal(completenessV21("R06", { optionId: andere }), "complete");
});

test("R04: der freiwillige Betrag macht die Antwort nicht unvollständig", () => {
  // Der Hinweis am Item sagt ausdrücklich „Optional kannst du ergänzen“.
  const ohne = { optionId: getItemV21("R04")!.options[0].optionId };
  assert.equal(completenessV21("R04", ohne), "complete");
  assert.equal(validateAnswerV21({ blockId: "R04", value: ohne }).ok, true);

  const mit = { ...ohne, optionalAmount: "2400 EUR netto" };
  assert.equal(completenessV21("R04", mit), "complete");
  assert.equal(validateAnswerV21({ blockId: "R04", value: mit }).ok, true);
});
