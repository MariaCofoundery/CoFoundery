import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getItemsV22,
  getItemV22,
  offeredItemsV22,
  SCOPES,
  type RegistryItemV22,
} from "@/features/instruments/align/registries";
import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { completenessV21, validateAnswerV21 } from "@/features/instruments/v21/answersV21";

/**
 * Was die Oberfläche für fertig hält, muss auch gespeichert werden können.
 *
 * ---------------------------------------------------------------------------
 * DIE ZWEI PRÜFUNGEN MÜSSEN SICH EINIG SEIN
 * ---------------------------------------------------------------------------
 *
 * `completenessV21` entscheidet, OB gespeichert wird. `validateAnswerV21`
 * entscheidet, ob das Gespeicherte gültig ist. Sind sie sich uneinig, passiert
 * genau das, was Maria am 30.09.2026 gemeldet hat: Man beantwortet eine Frage,
 * die Oberfläche hält sie für fertig, schickt sie los — und bekommt „konnte
 * nicht gespeichert werden" zurück.
 *
 * Diese Prüfung baut zu jeder Frage beider Bögen eine vollständige Antwort und
 * hält fest, dass beide dasselbe sagen.
 */

/** Eine plausible vollständige Antwort — so, wie die Oberfläche sie schickt. */
function antwortFuer(item: RegistryItemV22): Record<string, unknown> | null {
  const ersteOption = item.options[0];
  const text = (option: typeof ersteOption) =>
    option?.requiresText ? { [option.optionId]: "etwas" } : {};

  switch (item.answerFormat) {
    case "ordinal_choice":
    case "single_choice":
      return {
        optionId: ersteOption.optionId,
        ...(ersteOption.requiresText ? { text: "etwas" } : {}),
      };
    case "multi_choice":
      return {
        optionIds: [ersteOption.optionId],
        ...(ersteOption.requiresText ? { texts: text(ersteOption) } : {}),
      };
    case "multi_choice_priority":
      // MIT VORRANG. Genau diese Zeile fehlte, als S06 sich nicht speichern
      // liess: Die Oberfläche bot die Nachfrage nach dem Wichtigsten an, das
      // Format sah sie nicht vor, und keine Prüfung hat die beiden
      // miteinander verglichen.
      return {
        optionIds: [ersteOption.optionId],
        priorityOptionId: ersteOption.optionId,
        ...(ersteOption.requiresText ? { texts: text(ersteOption) } : {}),
      };
    case "number_range":
      return { number: 3, unit: item.unit ?? "" };
    case "money_range":
      return { amount: 5000, currency: "EUR" };
    case "person_number_range":
      return { perPerson: [{ person: "Ben", number: 10, unit: "Stunden pro Woche" }] };
    case "time_windows":
      return { windows: [{ day: "Montag", from: "09:00", to: "11:00", timezone: "Europe/Berlin" }] };
    case "structured_text":
      return { text: "Ein erster zahlender Kunde" };
    case "free_text_repeatable":
      return { entries: [{ entryId: "e1", text: "Keine Nachtarbeit" }] };
    case "value_case":
      return { importanceA: 4, importanceB: 2, path: "A" };
    default:
      // `free_text_per_entry` haengt an einer Grundfrage und wird unten
      // ausgelassen: Ohne Eintrag dort gibt es nichts zu beantworten.
      return null;
  }
}

test("was die Oberfläche für fertig hält, lässt sich auch speichern", () => {
  const uneinig: string[] = [];

  for (const scope of SCOPES) {
    for (const item of offeredItemsV22(scope)) {
      const value = antwortFuer(item);
      if (!value) continue;
      const answerable = answerObj(item);

      const stand = completenessV21(item.itemId, value, answerable);
      if (stand !== "complete") {
        uneinig.push(`${item.itemId} (${item.answerFormat}): gilt als ${stand}, obwohl ausgefüllt`);
        continue;
      }

      const verdict = validateAnswerV21(
        { blockId: item.itemId, value } as Parameters<typeof validateAnswerV21>[0],
        answerable,
      );
      if (!verdict.ok) {
        uneinig.push(`${item.itemId} (${item.answerFormat}): fertig, aber ${verdict.reason}`);
      }
    }
  }

  assert.deepEqual(uneinig, [], `Die beiden Prüfungen sind sich uneinig:\n${uneinig.join("\n")}`);
});

function answerObj(item: RegistryItemV22) {
  return answerableOf(item);
}

test("jeder Auslassungsgrund einer Frage lässt sich auch speichern", () => {
  // „Kann ich noch nicht einschätzen" ist eine vollwertige Antwort. Wenn sie
  // die Prüfung nicht passiert, ist die Frage unbeantwortbar.
  const uneinig: string[] = [];
  for (const scope of SCOPES) {
    for (const item of offeredItemsV22(scope)) {
      for (const missing of item.missing) {
        const verdict = validateAnswerV21(
          { blockId: item.itemId, missingCode: missing.code },
          answerableOf(item),
        );
        if (!verdict.ok) uneinig.push(`${item.itemId}/${missing.code}: ${verdict.reason}`);
      }
    }
  }
  assert.deepEqual(uneinig, []);
});

test("jeder Grund, den die Prüfung kennt, hat einen Satz", () => {
  // Von fünfunddreißig möglichen Gründen hatten zwölf einen eigenen Satz. Die
  // übrigen sahen alle gleich aus — und sagten weder der Person noch uns, was
  // schiefging.
  const pruefung = readFileSync(
    join("src", "features", "instruments", "v21", "answersV21.ts"), "utf8");
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");

  const gruende = new Set(
    [...pruefung.matchAll(/return no\("([a-z_]+)"/g)].map((match) => match[1]),
  );
  assert.ok(gruende.size > 20, "die Gründe wurden nicht gefunden");

  // Entweder ein eigener Satz - oder der Grund steht in der Meldung.
  assert.match(fragebogen, /\(\$\{reason\}\)/);
});

test("wo nach dem Wichtigsten gefragt wird, ist der Vorrang Teil der Antwort", () => {
  // GEMELDET AM 30.09.2026: S06 liess sich nicht speichern
  // („priority_not_offered"). Die Master-Arbeitsfassung stellt dort nach der
  // Mehrfachauswahl die Frage „Was wäre voraussichtlich Deine wichtigste
  // Rolle?", die Oberfläche bot sie an — und die Antwortprüfung wies den
  // Vorrang ab, weil das Format ihn nicht vorsah.
  //
  // Eine Regel und keine Liste: Sonst hätte die nächste Frage mit Anschluss
  // denselben Fehler.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      if (!item.followUpQuestion) continue;
      if (!item.answerFormat.startsWith("multi_choice")) continue;
      assert.equal(
        item.answerFormat,
        "multi_choice_priority",
        `${item.itemId} fragt nach dem Wichtigsten, nimmt die Antwort aber nicht an`,
      );
    }
  }

  assert.equal(getItemV22("S06")!.answerFormat, "multi_choice_priority");
  assert.match(getItemV22("S06")!.followUpQuestion!, /wichtigste Rolle/);
  // Und die Antworten stehen noch da: Mit dem neuen Format fielen sie zuerst
  // weg, weil die Liste der Formate mit Auswahl es nicht kannte.
  assert.equal(getItemV22("S06")!.options.length, 6);
});

test("„Erneut versuchen“ steht nur, wo ein zweiter Versuch helfen kann", () => {
  // Eine Antwort, die die Prüfung ablehnt, wird beim zweiten Mal genauso
  // abgelehnt. Wer zehnmal klickt und dann glaubt, er habe etwas falsch
  // gemacht, hat recht — nur war es nicht das Klicken.
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /return reason === "unreachable";/);
});
