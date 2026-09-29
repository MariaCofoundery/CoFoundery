import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAnswerV21,
  validateFollowUpV21,
  offeredMissingCodesV21,
  exclusiveOptionOf,
  type AlignmentAnswerV21,
} from "@/features/instruments/v21/answersV21";
import { getItemV21, getItemsV21 } from "@/features/instruments/v21/registryV21";

const reasonOf = (verdict: ReturnType<typeof validateAnswerV21>) =>
  verdict.ok ? "ok" : verdict.reason;

const first = (blockId: string, index = 0) => getItemV21(blockId)!.options[index].optionId;

test("eine gültige Auswahl wird angenommen", () => {
  assert.equal(reasonOf(validateAnswerV21({ blockId: "A01", value: { optionId: first("A01") } })), "ok");
});

test("eine erfundene Option wird abgewiesen", () => {
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "A01", value: { optionId: "A01_o99" } })),
    "unknown_option",
  );
});

test("der Antworttext statt der Kennung wird abgewiesen", () => {
  // Der Text darf sich ändern, die Bedeutung einer gegebenen Antwort nicht.
  const verdict = validateAnswerV21({
    blockId: "A01",
    value: { option: "häufig" } as never,
  });
  assert.equal(reasonOf(verdict), "option_text_instead_of_id");
});

test("ein Auslassungsgrund, den die Frage nicht anbietet, wird abgewiesen", () => {
  // K01 bietet nur cannot_assess an. withheld wäre dort eine Erfindung.
  assert.deepEqual(offeredMissingCodesV21("K01"), ["cannot_assess"]);
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "K01", missingCode: "prefer_not_to_say" })),
    "missing_code_not_offered",
  );
  assert.equal(reasonOf(validateAnswerV21({ blockId: "K01", missingCode: "cannot_assess" })), "ok");
});

test("„keine zusätzliche Absicherung“ neben Absicherungen ist ein Widerspruch", () => {
  const exclusive = exclusiveOptionOf(getItemV21("B05")!);
  assert.ok(exclusive, "B05 hat eine ausschließende Option");
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "B05", value: { optionIds: [first("B05"), exclusive!] } })),
    "exclusive_option_with_others",
  );
  // Allein ist sie eine vollwertige Antwort.
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "B05", value: { optionIds: [exclusive!] } })),
    "ok",
  );
});

test("dasselbe gilt für G02b", () => {
  const exclusive = exclusiveOptionOf(getItemV21("G02b")!)!;
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "G02b", value: { optionIds: [first("G02b"), exclusive] } })),
    "exclusive_option_with_others",
  );
});

test("„bitte beschreiben“ ohne Beschreibung ist keine Auskunft", () => {
  const withText = getItemV21("B05")!.options.find((option) => option.requiresText)!;
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "B05", value: { optionIds: [withText.optionId] } })),
    "option_needs_text",
  );
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "B05",
      value: { optionIds: [withText.optionId], texts: { [withText.optionId]: "ein fester Ausstiegstermin" } },
    })),
    "ok",
  );
});

test("ein Vorrang muss unter den gewählten Zielen stehen", () => {
  const a = first("S01", 0);
  const b = first("S01", 1);
  const c = first("S01", 2);
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "S01", value: { optionIds: [a, b], priorityOptionId: c } })),
    "priority_not_chosen",
  );
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "S01", value: { optionIds: [a, b], priorityOptionId: b } })),
    "ok",
  );
  // Die Rangfolge ist freiwillig - das steht so in der Quelle.
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "S01", value: { optionIds: [a, b] } })),
    "ok",
  );
});

test("zweimal dieselbe Option ist kein stärkeres Ja", () => {
  const a = first("B05");
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "B05", value: { optionIds: [a, a] } })),
    "duplicate_option",
  );
});

test("ein Zeitfenster ohne Zeitzone ist keine Verabredung", () => {
  const ok: AlignmentAnswerV21 = {
    blockId: "R03",
    value: { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "Europe/Berlin" }] },
  };
  assert.equal(reasonOf(validateAnswerV21(ok)), "ok");
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "R03",
      value: { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "  " }] },
    })),
    "incomplete_window",
  );
});

test("ein Betrag ohne Währung und eine Zahl ohne Einheit sind keine Angaben", () => {
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "B01", value: { amount: 5000, currency: "" } })),
    "missing_currency",
  );
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "R01", value: { number: 12, unit: "" } })),
    "missing_unit",
  );
  assert.equal(
    reasonOf(validateAnswerV21({ blockId: "R01", value: { number: 0, unit: "Stunden pro Woche" } })),
    "ok",
    "0 ist eine mögliche Antwort - das sagt der Hinweis am Item selbst",
  );
});

test("„keine feste Stundenerwartung“ ist eine Erwartung, kein Fehlen", () => {
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "R02",
      value: { perPerson: [{ person: "Mitgründerin", number: null, unit: "" }] },
    })),
    "ok",
  );
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "R02",
      value: { perPerson: [{ person: "", number: 10, unit: "Stunden pro Woche" }] },
    })),
    "person_without_name",
  );
});

test("jede genannte Grenze braucht eine eigene Kennung", () => {
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "L01",
      value: { entries: [{ entryId: "", text: "ohne Absprache Geld ausgeben" }] },
    })),
    "entry_without_id",
  );
  assert.equal(
    reasonOf(validateAnswerV21({
      blockId: "L01",
      value: { entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }] },
    })),
    "ok",
  );
});

test("eine Anschlussfrage ohne Voraussetzung wird abgewiesen", () => {
  const followUp: AlignmentAnswerV21 = {
    blockId: "L02",
    value: { perEntry: { e1: "wenn eine Rechnung kommt, die ich nicht kannte" } },
  };
  assert.equal(reasonOf(validateFollowUpV21(followUp, null)), "follow_up_without_basis");
  assert.equal(
    reasonOf(validateFollowUpV21(followUp, { blockId: "L01", missingCode: "prefer_not_to_say" })),
    "follow_up_without_basis",
  );
});

test("eine Anschlussantwort darf nicht auf eine gestrichene Grenze zeigen", () => {
  // Der Fall, der ohne diese Prüfung lautlos entsteht: Jemand nennt zwei
  // Grenzen, beantwortet beide Anschlussfragen und streicht danach die erste.
  const basis: AlignmentAnswerV21 = {
    blockId: "L01",
    value: { entries: [{ entryId: "e2", text: "Zusagen ohne Rücksprache" }] },
  };
  assert.equal(
    reasonOf(validateFollowUpV21({ blockId: "L02", value: { perEntry: { e1: "irgendwas" } } }, basis)),
    "follow_up_points_nowhere",
  );
  assert.equal(
    reasonOf(validateFollowUpV21({ blockId: "L02", value: { perEntry: { e2: "eine Zusage per Mail" } } }, basis)),
    "ok",
  );
});

test("was keine Anschlussfrage ist, wird nicht als eine behandelt", () => {
  assert.equal(
    reasonOf(validateFollowUpV21({ blockId: "A01", value: { optionId: first("A01") } }, null)),
    "not_a_follow_up",
  );
});

test("jedes einzelne Item lässt sich auslassen", () => {
  const unanswerable: string[] = [];
  for (const item of getItemsV21()) {
    const codes = offeredMissingCodesV21(item.itemId);
    if (codes.length === 0) {
      unanswerable.push(`${item.itemId}: kein Auslassungsgrund`);
      continue;
    }
    const verdict = validateAnswerV21({ blockId: item.itemId, missingCode: codes[0] });
    if (!verdict.ok) unanswerable.push(`${item.itemId}: ${verdict.reason}`);
  }
  assert.deepEqual(unanswerable, []);
});

test("jedes einzelne Item lässt auch einen echten Wert durch", () => {
  // Ohne diesen Test wäre nicht belegt, dass der Validator überhaupt eine
  // Antwort DURCHLÄSST - eine Prüfung, die alles ablehnt, sähe in den
  // Einzeltests oben genauso streng aus. Und er deckt alle 36 Items ab, nicht
  // nur die, für die ich zufällig einen Fall geschrieben habe.
  const rejected: string[] = [];

  for (const item of getItemsV21()) {
    // Eine Option ohne Pflichttext, damit der Fall nicht am Textfeld hängt.
    const plain = item.options.find((option) => !option.requiresText && !option.exclusive);
    const value = (() => {
      switch (item.answerFormat) {
        case "ordinal_choice":
        case "single_choice":
          return plain ? { optionId: plain.optionId } : null;
        case "multi_choice":
        case "multi_choice_priority":
          return plain ? { optionIds: [plain.optionId] } : null;
        case "value_case":
          return { importanceA: 4, importanceB: 2, path: "A" as const };
        case "money_range":
          return { amount: 5000, currency: "EUR" };
        case "number_range":
          return { number: 12, unit: "Stunden pro Woche" };
        case "person_number_range":
          return { perPerson: [{ person: "Mitgründerin", number: 10, unit: "Stunden pro Woche" }] };
        case "time_windows":
          return { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "Europe/Berlin" }] };
        case "date":
          return { date: "2027-03-01" };
        case "structured_text":
          return { text: "eine erste zahlende Kundin" };
        case "free_text_repeatable":
          return { entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }] };
        case "free_text_per_entry":
          return { perEntry: { e1: "wenn eine Rechnung kommt, die ich nicht kannte" } };
      }
    })();

    if (!value) {
      rejected.push(`${item.itemId}: keine Option ohne Pflichttext`);
      continue;
    }
    const verdict = validateAnswerV21({ blockId: item.itemId, value });
    if (!verdict.ok) rejected.push(`${item.itemId} (${item.answerFormat}): ${verdict.reason}`);
  }

  assert.deepEqual(rejected, []);
});
