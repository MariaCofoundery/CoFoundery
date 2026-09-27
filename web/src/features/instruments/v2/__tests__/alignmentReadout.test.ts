import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  READOUT_UNCERTAINTIES,
  buildReadout,
  type StoredAnswerRow,
} from "@/features/instruments/v2/alignmentReadout";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";
import { getContextBlocks, getValueCases } from "@/features/instruments/v2/contextRegistryV2";

const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F",
  value: null,
  missing_code: null,
  ...partial,
});

const one = (r: StoredAnswerRow) => buildReadout([r])[0];

// ---------------------------------------------------------------------------
// Stufe 0 aus Teil F1
// ---------------------------------------------------------------------------

test("eine Fünferantwort bleibt eine Kategorie und wird keine Zahl", () => {
  // DIE WICHTIGSTE REGEL DES GANZEN TEILS F: „Ein nummerierter Antwortcode
  // wird nicht automatisch zu einem Messwert."
  const entry = one(row({ block_id: "A01", answer_format: "F", value: { scale: 3 } }));
  assert.equal(entry.answered, true);
  assert.deepEqual(entry.value, { kind: "category", label: "manchmal", position: 3, of: 5 });

  // Die Position heißt `position` und nicht `value` - damit niemand versucht,
  // damit zu rechnen. Ein Feld namens value/score/mean gibt es nicht.
  const keys = Object.keys(entry.value!);
  for (const forbidden of ["value", "score", "mean", "percent", "index"]) {
    assert.ok(!keys.includes(forbidden), `${forbidden} hat hier nichts zu suchen`);
  }
});

test("beide Pole jeder Skala werden richtig angezeigt", () => {
  // Wörtlich aus der Prüfliste in F7: „gleiche Antwort an beiden Polen jeder
  // zulässigen Skala korrekt anzeigen". Ein vertauschtes Ende wäre der
  // Umpolungsfehler aus v1, nur eine Ebene später.
  for (const format of ["F", "C"] as const) {
    const labels = ALIGNMENT_REGISTRY_V2.answerFormats[format].labels;
    const blockId = format === "F" ? "A01" : "X01";
    const low = one(row({ block_id: blockId, answer_format: format, value: { scale: 1 } }));
    const high = one(row({ block_id: blockId, answer_format: format, value: { scale: 5 } }));
    assert.equal(low.value!.kind === "category" && low.value.label, labels[0]);
    assert.equal(high.value!.kind === "category" && high.value.label, labels[4]);
  }
});

test("es gibt keinen Skalenindex, keinen Mittelwert, keine Gesamtzahl", () => {
  // Teil F1: „Für das MVP mit zwei Items je Kandidat wird diese Formel NICHT
  // freigegeben." Sie ist deshalb nicht implementiert - nicht auskommentiert,
  // nicht hinter einem Schalter. Dieser Test prüft die Abwesenheit.
  const source = readFileSync("src/features/instruments/v2/alignmentReadout.ts", "utf8");
  const code = source.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "");
  for (const forbidden of [/\breduce\(/, /\bMath\.round/, /\/ *\w*[Cc]ount/, /\bsum\b/i, /\bmean\b/i, /\baverage\b/i]) {
    assert.ok(!forbidden.test(code), `Rechnung im Auswertungsmodul: ${forbidden}`);
  }

  // GEGENPROBE: Der Filter würde eine Rechnung auch finden.
  assert.ok(/\bsum\b/i.test("const sum = a + b;"));
});

// ---------------------------------------------------------------------------
// Fehlende Antworten - Teil F2
// ---------------------------------------------------------------------------

test("ein Auslassungsgrund bleibt ein Grund und wird nie zur Mitte", () => {
  const entry = one(row({ block_id: "A01", answer_format: "F", missing_code: "withheld" }));
  assert.equal(entry.answered, false);
  assert.equal(entry.missing!.code, "withheld");
  assert.equal(entry.missing!.label, "möchte ich nicht angeben");

  // Kein Zahlenwert irgendwo - nicht null, nicht 0, nicht die 3.
  assert.equal(entry.value, undefined);
  assert.ok(!JSON.stringify(entry).includes('"position"'));
  assert.ok(!JSON.stringify(entry).includes('"scale"'));
});

test("nicht vergleichbar heißt nicht schlecht", () => {
  // Teil F2: „Für vertrauliche Finanzangaben ist Auslassen kein negativer
  // Befund. Die betreffenden Felder erscheinen lediglich als nicht
  // vergleichbar."
  const withheld = one(row({ block_id: "B01", answer_format: "money_range", missing_code: "withheld" }));
  assert.equal(withheld.comparable, false);

  const answered = one(row({
    block_id: "B01", answer_format: "money_range", value: { min: 5000, currency: "EUR" },
  }));
  assert.equal(answered.comparable, true);

  // Und der Unterschied ist genau das - ein Vergleichbarkeitsvermerk, kein Urteil.
  assert.ok(!JSON.stringify(withheld).match(/risik|mangel|fehlt|negativ/i));
});

test("die drei Unsicherheiten stehen getrennt", () => {
  // Teil F2 verlangt drei verschiedene Aussagen: eigener Klärungsstand,
  // Messgenauigkeit, Situationsabhängigkeit. Sie zu einem Satz zu verkürzen
  // hieße, dem Menschen die Unterscheidung abzunehmen, die die Sache ausmacht.
  assert.equal(READOUT_UNCERTAINTIES.length, 3);
  assert.deepEqual(
    READOUT_UNCERTAINTIES.map((entry) => entry.key),
    ["self_assessment", "measurement", "situation"]
  );
  // Keine erfundenen Fehlerbalken.
  const all = READOUT_UNCERTAINTIES.map((entry) => entry.text).join(" ");
  assert.ok(!/\d+\s*%|±/.test(all), "keine Zahlen, solange nichts geprüft ist");
  assert.match(all, /noch keine präzise Einordnung/);
});

// ---------------------------------------------------------------------------
// Die übrigen Formate
// ---------------------------------------------------------------------------

test("eine Auswahl wird aus ihrer Kennung zurückübersetzt", () => {
  // Teil F7: „Randomisierte Optionen werden vor Interpretation auf ihre
  // stabilen IDs zurückgeführt." Angezeigt wird der heutige Text, gespeichert
  // war die Kennung - so bleibt eine alte Antwort nach einer Umformulierung
  // lesbar statt verwaist.
  const s01 = getContextBlocks().find((block) => block.blockId === "S01")!;
  const option = s01.options[1];
  const entry = one(row({ block_id: "S01", answer_format: "single_choice", value: { optionId: option.optionId } }));
  assert.deepEqual(entry.value, { kind: "choice", labels: [option.value], own: null });

  // Eine Kennung, die es nicht gibt, ergibt keinen Eintrag - lieber nichts
  // anzeigen als etwas Falsches.
  assert.equal(buildReadout([row({ block_id: "S01", answer_format: "single_choice", value: { optionId: "S01_o99" } })]).length, 0);
});

test("nominale Optionen werden nicht summiert", () => {
  // Aus der Prüfliste in F7. Eine Mehrfachwahl bleibt eine Liste von
  // Beschriftungen - keine Anzahl, kein Punktestand.
  const b05 = getContextBlocks().find((block) => block.blockId === "B05")!;
  const ids = b05.options.slice(0, 3).map((option) => option.optionId);
  const entry = one(row({ block_id: "B05", answer_format: "multi_choice", value: { optionIds: ids } }));
  assert.equal(entry.value!.kind, "choice");
  assert.equal((entry.value as { labels: string[] }).labels.length, 3);
  assert.ok(!Object.keys(entry.value!).some((key) => /count|total|sum|score/i.test(key)));
});

test("Zahlen behalten ihre Einheit, Beträge ihre Währung", () => {
  const hours = one(row({
    block_id: "R01", answer_format: "number_range", value: { min: 12, max: 16, unit: "Stunden/Woche" },
  }));
  assert.deepEqual(hours.value, { kind: "range", min: 12, max: 16, unit: "Stunden/Woche" });

  const money = one(row({
    block_id: "R05", answer_format: "money_range", value: { min: 2000, currency: "EUR", basis: "netto" },
  }));
  assert.deepEqual(money.value, { kind: "money", min: 2000, max: null, currency: "EUR", basis: "netto" });
});

test("eine Erwartung bleibt bei ihrem Empfänger", () => {
  // Teil F3: „A→B und B→A sind getrennte Beziehungen." Über Personen zu
  // mitteln würde aus zwei verschiedenen Erwartungen eine erfundene machen.
  const entry = one(row({
    block_id: "R02",
    answer_format: "person_number_range",
    value: { unit: "Stunden/Woche", per: [{ recipient: "Anna", min: 25, max: 30 }, { recipient: "Bert", min: 10 }] },
  }));
  assert.equal(entry.value!.kind, "recipients");
  const per = (entry.value as { per: { recipient: string }[] }).per;
  assert.deepEqual(per.map((one) => one.recipient), ["Anna", "Bert"]);
});

test("eine Wertekarte behält beide Anliegen getrennt", () => {
  // Teil E: „Keine Differenz-, Summen- oder Werte-Gesamtskala."
  const card = getValueCases()[0];
  const entry = one(row({
    block_id: card.caseId,
    answer_format: "value_case",
    value: { importanceA: 5, importanceB: 5, path: "B" },
  }));
  const value = entry.value as {
    concerns: { label: string; importance: { position: number } }[];
    path: { key: string };
  };
  assert.equal(value.concerns.length, 2);
  assert.equal(value.concerns[0].importance.position, 5);
  assert.equal(value.concerns[1].importance.position, 5);
  assert.equal(value.path.key, "B");
  // Keine Differenz, keine Summe.
  assert.ok(!Object.keys(entry.value!).some((key) => /diff|sum|total|score/i.test(key)));
});

test("die Bedingung steht neben der Antwort, nicht nur im Fragebogen", () => {
  // Ohne sie ist eine gespeicherte Antwort später nicht mehr richtig zu lesen:
  // „häufig" heißt etwas anderes, wenn offenbleibt, wovon die Rede war.
  const entry = one(row({ block_id: "U01", answer_format: "F", value: { scale: 4 } }));
  assert.match(entry.condition ?? "", /Verantwortungsbereich und Budget sind vereinbart/);

  // Und es ist die überarbeitete Fassung, dieselbe wie im Fragebogen.
  const t = one(row({ block_id: "T03", answer_format: "F", value: { scale: 2 } }));
  assert.match(t.condition ?? "", /keine akute Gefahr/);
});

test("jeder Eintrag nennt seinen Antwortmodus", () => {
  // Damit im Report nicht ein Wunsch neben einer Zusage steht, als wäre es
  // dasselbe.
  assert.equal(one(row({ block_id: "A01", answer_format: "F", value: { scale: 3 } })).answerMode, "intended_practice");
  assert.equal(
    one(row({ block_id: "R01", answer_format: "number_range", value: { min: 10, unit: "Stunden/Woche" } })).answerMode,
    "actual_resource"
  );
});
