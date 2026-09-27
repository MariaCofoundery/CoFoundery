import assert from "node:assert/strict";
import test from "node:test";
import { allBlockIds, answerFormatOfBlock, type AlignmentAnswer } from "@/features/instruments/v2/alignmentAnswersV2";
import { getContextBlocks, getValueCases } from "@/features/instruments/v2/contextRegistryV2";
import {
  offeredMissingCodes,
  validateAlignmentAnswer,
} from "@/features/instruments/v2/validateAlignmentAnswer";

/**
 * Der Prüfer bekommt im Betrieb Daten vom Client, nicht geprüfte Typen -
 * deshalb nimmt dieser Helfer absichtlich `unknown` entgegen. Genau die
 * Eingaben, die TypeScript hier verbietet, sind die, gegen die er schützt.
 */
const answer = (partial: { blockId: string; value?: unknown; missingCode?: unknown }): AlignmentAnswer =>
  ({ answerFormat: answerFormatOfBlock(partial.blockId)!, ...partial }) as unknown as AlignmentAnswer;

const reasonOf = (given: AlignmentAnswer) => {
  const verdict = validateAlignmentAnswer(given);
  return verdict.ok ? null : verdict.reason;
};

// ---------------------------------------------------------------------------
// Was nur der Code wissen kann
// ---------------------------------------------------------------------------

test("ein Block nimmt nur die Auslassungsgründe, die er anbietet", () => {
  // DAS IST DER GRUND, WARUM DIESE PRÜFUNG NICHT IN DIE DATENBANK GEHÖRT.
  // Dort stehen alle sechs Gründe als erlaubte Werte - welcher zu WELCHER
  // Frage gehört, weiß nur die Registratur.
  assert.equal(reasonOf(answer({ blockId: "R04", missingCode: "cannot_assess" })), null);
  assert.equal(reasonOf(answer({ blockId: "A01", missingCode: "cannot_assess" })), null);

  // A01 ist eine Präferenzfrage. „Noch offen" gibt es dort nicht: Es geht um
  // ein gewünschtes Vorgehen, nicht um eine Festlegung, die noch aussteht.
  assert.equal(reasonOf(answer({ blockId: "A01", missingCode: "undecided" })), "missing_code_not_offered");

  // Und „vertraulich klären" gibt es nur bei den Grenzfragen.
  assert.equal(reasonOf(answer({ blockId: "L01", missingCode: "confidential_first" })), null);
  assert.equal(reasonOf(answer({ blockId: "S01", missingCode: "confidential_first" })), "missing_code_not_offered");

  // Ein technischer Ausfall fragt nicht um Erlaubnis.
  assert.equal(reasonOf(answer({ blockId: "A01", missingCode: "technical" })), null);
});

test("eine Wertekarte hat überhaupt keinen Auslassungsgrund", () => {
  // „Kann ich noch nicht entscheiden" ist dort einer der vier Wege - eine
  // Aussage über den Fall, nicht über die eigene Auskunftsbereitschaft. Wer
  // das zu einem Missing-Code macht, verliert genau diese Unterscheidung.
  assert.deepEqual(offeredMissingCodes("W01"), []);
  assert.equal(reasonOf(answer({ blockId: "W01", missingCode: "withheld" })), "missing_code_not_offered");
  assert.equal(
    reasonOf(answer({
      blockId: "W01",
      value: { importanceA: 3, importanceB: 3, path: "unknown" },
    })),
    null
  );
});

test("eine Einzelauswahl meint eine der aufgeführten Optionen", () => {
  const s01 = getContextBlocks().find((block) => block.blockId === "S01")!;
  const real = s01.options.find((option) => !option.requiresText)!;

  assert.equal(reasonOf(answer({ blockId: "S01", value: { optionId: real.optionId } })), null);
  assert.equal(reasonOf(answer({ blockId: "S01", value: { optionId: "S01_o99" } })), "option_unknown");

  // GESPEICHERT WIRD DIE KENNUNG, NICHT DER TEXT. Teil F7 des Gutachtens
  // verlangt die "urspruengliche Options-ID", und der Grund ist derselbe wie
  // bei der Instrumentversion: Der Text darf sich aendern - er hat es am
  // 27.09.2026 schon getan -, die Bedeutung einer gegebenen Antwort nicht.
  // Wer den Text speichert, verliert beim ersten Umformulieren die Zuordnung
  // aller bisherigen Antworten, und zwar lautlos.
  assert.equal(
    reasonOf(answer({ blockId: "S01", value: { option: real.value } })),
    "option_text_instead_of_id"
  );

  // „bitte benennen" heißt: ohne Text ist die Antwort unvollständig.
  const needsText = s01.options.find((option) => option.requiresText)!;
  assert.equal(
    reasonOf(answer({ blockId: "S01", value: { optionId: needsText.optionId } })),
    "option_needs_text"
  );
  assert.equal(
    reasonOf(answer({ blockId: "S01", value: { optionId: needsText.optionId, text: "Marktführer werden" } })),
    null
  );
});

test("eine Mehrfachwahl ebenso, und keine Option doppelt", () => {
  const b05 = getContextBlocks().find((block) => block.blockId === "B05")!;
  const plain = b05.options.filter((option) => !option.requiresText).map((o) => o.optionId);

  assert.equal(reasonOf(answer({ blockId: "B05", value: { optionIds: plain.slice(0, 2) } })), null);
  assert.equal(reasonOf(answer({ blockId: "B05", value: { optionIds: [] } })), "nothing_picked");
  assert.equal(
    reasonOf(answer({ blockId: "B05", value: { optionIds: [plain[0], plain[0]] } })),
    "option_twice"
  );
  assert.equal(
    reasonOf(answer({ blockId: "B05", value: { options: [b05.options[0].value] } })),
    "option_text_instead_of_id"
  );
});

test("jede Option hat eine Kennung, die zu ihrem Block gehört", () => {
  // Eine Kennung, die nicht zum Block passt, wäre beim Auswerten still
  // falsch zugeordnet - und niemand sähe es.
  let seen = 0;
  for (const block of getContextBlocks()) {
    for (const option of block.options) {
      assert.match(option.optionId, new RegExp(`^${block.blockId}_o\\d+$`), option.optionId);
      seen += 1;
    }
  }
  assert.equal(seen, 79);
});

test("ein Grund kommt nie als Wert durch", () => {
  // Spiegel des Checks in der Datenbank. Beide Seiten prüfen es, weil genau
  // hier v1 seine Unterscheidung verloren hat.
  assert.equal(
    reasonOf(answer({ blockId: "S01", value: { option: "möchte ich nicht angeben" } })),
    "missing_reason_as_value"
  );
  assert.equal(
    reasonOf(answer({ blockId: "S07", value: { text: "noch offen" } })),
    "missing_reason_as_value"
  );
  // Derselbe Sachverhalt, richtig ausgedrückt:
  assert.equal(reasonOf(answer({ blockId: "S07", missingCode: "undecided" })), null);
});

test("Skalenstufen sind ganze Zahlen von eins bis fünf", () => {
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 1 } })), null);
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 5 } })), null);
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 0 } })), "scale_out_of_range");
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 6 } })), "scale_out_of_range");
  // Keine halben Stufen - eine 3,5 wäre eine Genauigkeit, die es nicht gibt.
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 3.5 } })), "scale_out_of_range");
});

test("null Stunden und null Euro sind erlaubt, null Skalenstufen nicht", () => {
  // DAS GUTACHTEN FÜHRT DIE NULL AUSDRÜCKLICH AUF (R01, B01, B03). Wer sie
  // verbietet, zwingt jemanden, mehr zuzusagen, als er will.
  assert.equal(
    reasonOf(answer({ blockId: "R01", value: { min: 0, unit: "Stunden/Woche" } })),
    null
  );
  assert.equal(reasonOf(answer({ blockId: "B01", value: { min: 0, currency: "EUR" } })), null);
  assert.equal(reasonOf(answer({ blockId: "A01", value: { scale: 0 } })), "scale_out_of_range");
});

test("eine Zahl ohne Einheit und ein Betrag ohne Währung sind keine Angabe", () => {
  assert.equal(reasonOf(answer({ blockId: "R01", value: { min: 10, max: 20 } })), "unit_missing");
  assert.equal(reasonOf(answer({ blockId: "R05", value: { min: 2000 } })), "currency_missing");
  assert.equal(
    reasonOf(answer({ blockId: "R05", value: { min: 2000, currency: "EUR", basis: "netto" } })),
    null
  );
  assert.equal(
    reasonOf(answer({ blockId: "R05", value: { min: 2000, currency: "EUR", basis: "irgendwas" } })),
    "basis_unknown"
  );
  // Ein Bereich, der rückwärts läuft, ist ein Tippfehler und keine Spanne.
  assert.equal(
    reasonOf(answer({ blockId: "R01", value: { min: 30, max: 10, unit: "Stunden/Woche" } })),
    "range_inverted"
  );
});

test("die Erwartung an andere wird je Person erfasst, nicht gemittelt", () => {
  // R02 ist gerichtet: „pro Person oder geplanter Rolle". Eine Zahl ohne
  // Empfänger wäre eine Erwartung an niemanden.
  assert.equal(
    reasonOf(answer({
      blockId: "R02",
      value: { per: [{ recipient: "Anna", min: 20 }], unit: "Stunden/Woche" },
    })),
    null
  );
  assert.equal(
    reasonOf(answer({ blockId: "R02", value: { per: [], unit: "Stunden/Woche" } })),
    "no_recipient"
  );
  assert.equal(
    reasonOf(answer({ blockId: "R02", value: { per: [{ min: 20 }], unit: "Stunden/Woche" } })),
    "recipient_missing"
  );
});

test("eine Wertekarte braucht beide Anliegen und einen der vier Wege", () => {
  const w01 = getValueCases().find((entry) => entry.caseId === "W01")!;
  assert.equal(w01.paths.length, 4);

  assert.equal(
    reasonOf(answer({ blockId: "W01", value: { importanceA: 5, importanceB: 5, path: "A" } })),
    null,
    "beide sehr wichtig ist ein gültiger Zustand"
  );
  assert.equal(
    reasonOf(answer({ blockId: "W01", value: { importanceA: 5, path: "A" } })),
    "scale_out_of_range"
  );
  assert.equal(
    reasonOf(answer({ blockId: "W01", value: { importanceA: 3, importanceB: 3, path: "Z" } })),
    "path_unknown"
  );
  // Der eigene Weg will benannt werden.
  assert.equal(
    reasonOf(answer({ blockId: "W01", value: { importanceA: 3, importanceB: 3, path: "other" } })),
    "path_needs_text"
  );
});

test("Format und Block müssen zueinander passen", () => {
  assert.equal(
    validateAlignmentAnswer({ blockId: "A01", answerFormat: "date", value: { date: "2026-01-01" } } as AlignmentAnswer).ok,
    false
  );
  assert.equal(reasonOf({ blockId: "Z99", answerFormat: "F", value: { scale: 3 } } as AlignmentAnswer), "unknown_block");

  // Weder Wert noch Grund, und beides zugleich - dieselbe Regel wie in der
  // Datenbank, nur früher.
  assert.equal(reasonOf({ blockId: "A01", answerFormat: "F" } as AlignmentAnswer), "value_xor_missing");
  assert.equal(
    // DER TYP VERHINDERT DIESEN ZUSTAND SCHON. Dass hier zwei Umwege noetig
    // sind, um ihn ueberhaupt hinzuschreiben, ist der Beweis dafuer - der
    // Pruefer muss ihn trotzdem abfangen, weil Daten vom Client keinen Typ
    // mitbringen.
    reasonOf({ blockId: "A01", answerFormat: "F", value: { scale: 3 }, missingCode: "withheld" } as unknown as AlignmentAnswer),
    "value_xor_missing"
  );
});

test("jeder Block des Instruments lässt sich überhaupt beantworten", () => {
  // GEGENPROBE ÜBER ALLE 107. Ein Prüfer, der alles ablehnt, wäre in den
  // Einzelfällen oben nicht aufgefallen - die prüfen ja gerade Ablehnungen.
  const unanswerable: string[] = [];
  for (const blockId of allBlockIds()) {
    const offered = offeredMissingCodes(blockId);
    const candidate: AlignmentAnswer = offered.length
      ? answer({ blockId, missingCode: offered[0] })
      : answer({ blockId, value: { importanceA: 3, importanceB: 3, path: "unknown" } });
    const verdict = validateAlignmentAnswer(candidate);
    if (!verdict.ok) unanswerable.push(`${blockId}: ${verdict.reason} ${verdict.detail ?? ""}`);
  }
  assert.deepEqual(unanswerable, [], "Diese Blöcke nehmen keine Antwort an:\n" + unanswerable.join("\n"));
});
