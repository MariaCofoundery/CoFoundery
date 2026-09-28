import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AGREEMENT_FIELDS,
  CONVERSATION_LIBRARY_V2,
  MAX_CARDS_PER_SESSION,
  buildCardForComparison,
  buildConversationCards,
} from "@/features/instruments/v2/conversationCardsV2";
import { buildReadout, type StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";
import {
  clarificationsNeeded,
  compareBlocks,
  expectationGaps,
} from "@/features/instruments/v2/alignmentComparison";
import { buildAgenda } from "@/features/instruments/v2/alignmentAgenda";

const PAPER = "../docs/CoFoundery_Wissenschaftliche_Neukonzeption.md";
const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F", value: null, missing_code: null, ...partial,
});
const scale = (blockId: string, n: number) => row({ block_id: blockId, answer_format: "F", value: { scale: n } });

const cardsFor = (
  a: StoredAnswerRow[], b: StoredAnswerRow[],
  markedA: string[] = [], gaps = [] as ReturnType<typeof expectationGaps>
) => {
  const readA = buildReadout(a);
  const readB = buildReadout(b);
  const comparisons = compareBlocks(readA, readB, markedA, []);
  const agenda = buildAgenda(comparisons, clarificationsNeeded(comparisons, gaps));
  return buildConversationCards(agenda, { nameA: "Anna", nameB: "Bert", comparisons, gaps });
};

// ---------------------------------------------------------------------------
// Der Vierschritt aus Teil G
// ---------------------------------------------------------------------------

test("jede Karte hat alle vier Teile, in dieser Reihenfolge", () => {
  // beobachtete Antwort -> moegliche Bedeutung -> Klaerungsfrage ->
  // ueberpruefbare Vereinbarung. Wer mit der Bedeutung anfaengt, hat gedeutet,
  // bevor jemand die Antwort gesehen hat.
  const cards = cardsFor([scale("A02", 5)], [scale("A02", 3)]);
  assert.ok(cards.length > 0);
  for (const card of cards) {
    assert.ok(card.observed.trim(), card.id);
    assert.ok(card.meaning.trim(), card.id);
    assert.ok(card.question.trim().endsWith("?") || card.question.includes("Klärt"), card.id);
    assert.ok(card.agreement.length > 0, card.id);
    assert.ok(card.source.includes("Teil G"), card.id);
  }
  assert.deepEqual(Object.keys(cards[0]), [
    "id", "blockId", "observed", "meaning", "question", "agreement", "source",
  ]);
});

test("keine Karte sagt etwas über Menschen, was Teil G verbietet", () => {
  // „A ist analytischer", „ihr habt ein hohes Konfliktrisiko", „die Person
  // meint es nicht ernst", „eure Werte sind kompatibel" - alle vier stehen in
  // Teil G als unzulaessig.
  const offenders: string[] = [];
  for (const card of CONVERSATION_LIBRARY_V2.cards) {
    const text = [card.observed, card.meaning, card.question, ...card.agreement].join(" ");
    for (const word of CONVERSATION_LIBRARY_V2.forbidden) {
      // „kompatibel" kommt nur als Verbot vor, nicht als Aussage.
      if (text.toLowerCase().includes(word.toLowerCase())) offenders.push(`${card.id}: ${word}`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));

  // GEGENPROBE: Die Liste findet wirklich etwas.
  assert.ok(CONVERSATION_LIBRARY_V2.forbidden.length >= 10);
  assert.ok(
    CONVERSATION_LIBRARY_V2.forbidden.some((word) =>
      "Ihr habt ein hohes Konfliktrisiko".toLowerCase().includes(word.toLowerCase())
    ),
    "der Filter wuerde den verbotenen Satz erkennen"
  );
});

test("jede Vermutung über Menschen ist als Möglichkeit formuliert", () => {
  // Teil G: „Hypothesen nie als Tatsachen über die Person formulieren."
  //
  // GEPRÜFT WIRD NUR, WAS EINE VERMUTUNG IST. Die erste Fassung dieses Tests
  // verlangte ein „könnte“ in JEDER Deutung und schlug bei fünf Karten an -
  // zu Recht bei einer, zu Unrecht bei vier. „Daraus leiten wir keine
  // Bewertung ab“ ist eine Aussage über unser Vorgehen, und eine
  // abgeschwächte Selbstbeschränkung wäre keine. Der Test war das Problem,
  // nicht der Text.
  const hypotheses = CONVERSATION_LIBRARY_V2.cards.filter((card) => card.meaningKind === "hypothesis");
  assert.ok(hypotheses.length >= 8, `zu wenige Vermutungen gefunden: ${hypotheses.length}`);

  // Vier Arten, und jede aus einem Grund. „Conditional" kam am 28.09.2026
  // dazu: Ein Satz, der seine Geltung an Bedingungen knüpft, trägt seine
  // Vorsicht in der Bedingung - ein zusätzliches „vielleicht" würde ihn nur
  // unscharf machen, ohne ihn vorsichtiger zu machen.
  assert.deepEqual(
    Object.keys(CONVERSATION_LIBRARY_V2.meaningKinds).sort(),
    ["about_method", "conditional", "fact", "hypothesis"]
  );

  const unhedged = hypotheses
    .filter((card) => !CONVERSATION_LIBRARY_V2.hedges.some((hedge) =>
      card.meaning.toLowerCase().includes(hedge.toLowerCase())))
    .map((card) => `${card.id}: ${card.meaning}`);
  assert.deepEqual(unhedged, [], "Diese Vermutungen klingen wie Tatsachen:\n" + unhedged.join("\n"));

  // GEGENPROBE: Ein Tatsachensatz über eine Person würde auffallen.
  const blunt = "Anna ist analytischer als Bert.";
  assert.ok(!CONVERSATION_LIBRARY_V2.hedges.some((hedge) => blunt.toLowerCase().includes(hedge)));

  // Und jede Deutungsart ist erklärt, nicht nur benannt.
  for (const card of CONVERSATION_LIBRARY_V2.cards) {
    assert.ok(CONVERSATION_LIBRARY_V2.meaningKinds[card.meaningKind], card.id);
  }
});

test("die beobachtete Antwort deutet nicht", () => {
  // Der erste Baustein ist das, was dasteht - ohne „vielleicht", ohne
  // „koennte". Sonst waeren Beobachtung und Deutung dieselbe Zeile.
  for (const card of CONVERSATION_LIBRARY_V2.cards) {
    for (const hedge of ["könnte", "möglicherweise", "vielleicht", "scheint"]) {
      assert.ok(!card.observed.toLowerCase().includes(hedge), `${card.id}: ${card.observed}`);
    }
  }
});

test("jede Karte stammt nachweisbar aus dem Gutachten", () => {
  // Wie bei den Fragetexten: Ein Report, dessen Formulierungen niemand mehr
  // zuordnen kann, ist nicht mehr der begutachtete Report.
  const paper = readFileSync(PAPER, "utf8");
  const orphans = CONVERSATION_LIBRARY_V2.cards
    .filter((card) => !paper.includes(card.sourceQuote))
    .map((card) => `${card.id}: ${card.sourceQuote}`);
  assert.deepEqual(orphans, [], "Nicht im Gutachten:\n" + orphans.join("\n"));
  assert.equal(CONVERSATION_LIBRARY_V2.cards.length, 12);
});

// ---------------------------------------------------------------------------
// Was die Karten im Einzelfall sagen
// ---------------------------------------------------------------------------

test("die Erwartungslücke wird mit Zahlen benannt, nicht bewertet", () => {
  const gaps = expectationGaps(
    [{ side: "a", min: 12, max: 16, unit: "Stunden/Woche" }],
    [{ side: "b", recipient: "Anna", min: 25, max: 30, unit: "Stunden/Woche" }]
  );
  const cards = cardsFor([scale("A01", 3)], [scale("A01", 3)], [], gaps);
  const card = cards.find((entry) => entry.id === "time_and_expectations")!;

  assert.match(card.observed, /16 Stunden\/Woche/);
  assert.match(card.observed, /mindestens 25 Stunden\/Woche/);
  // „keine Bewertung der Einsatzbereitschaft" - Teil G sagt das ausdruecklich.
  assert.match(card.meaning, /nicht eure Einsatzbereitschaft/);
  assert.deepEqual(card.agreement, ["Rolle", "konkrete Zusage", "gemeinsamer Prüftermin"]);
});

test("Selbstständigkeit und Offenheit werden als vereinbar beschrieben", () => {
  // Teil F5 sagt, das sei KEINE kritische Kombination - und Teil G gibt den
  // Text dafuer vor: „Diese Wuensche koennen zusammenpassen."
  const cards = cardsFor([scale("U01", 5), scale("K01", 1)], [scale("U01", 2), scale("K01", 5)]);
  const card = cards.find((entry) => entry.id === "autonomy_and_information");
  assert.ok(card, "die Karte aus Teil G fehlt");
  assert.match(card!.meaning, /können zusammenpassen/);
  assert.ok(!/risiko|problem|konflikt/i.test(card!.meaning));
});

test("gleiche Antwort heißt nicht Sicherheit", () => {
  // Teil G, Tabelle: „Eure Werte sind kompatibel; hier wird es keinen Streit
  // geben" ist unzulaessig. Erlaubt ist die Frage nach den Gruenden.
  const cards = cardsFor([scale("A01", 4)], [scale("A01", 4)], ["A01"]);
  assert.ok(cards.length > 0);
  const text = cards.map((card) => `${card.observed} ${card.meaning}`).join(" ");
  assert.ok(!/kein.{0,10}streit|sicher|garantiert/i.test(text));
  assert.match(text, /heißt nicht, dass ihr dasselbe meint/);
});

test("fehlende Angaben stehen nicht auf der Agenda, aber im Block", () => {
  // ZWEI GETRENNTE AUSSAGEN, und die erste Fassung dieses Tests hat sie
  // verwechselt. Teil F6 setzt nur unterschiedlich beantwortete Themen auf die
  // Agenda - man kann nicht besprechen, was niemand gesagt hat. Aber „im MVP
  // bleiben alle Antworten zugänglich“, und wer den Block öffnet, soll den
  // richtigen Satz lesen statt gar nichts.
  const a = buildReadout([row({ block_id: "B01", answer_format: "money_range", missing_code: "withheld" })]);
  const b = buildReadout([row({ block_id: "B01", answer_format: "money_range", value: { min: 5000, currency: "EUR" } })]);
  const comparisons = compareBlocks(a, b);

  const agenda = buildAgenda(comparisons, clarificationsNeeded(comparisons, []));
  assert.deepEqual(agenda, [], "eine nicht geteilte Angabe ist kein Gesprächsthema von selbst");

  const card = buildCardForComparison(comparisons[0], {
    nameA: "Anna", nameB: "Bert", comparisons, gaps: [],
  })!;
  assert.equal(card.id, "not_comparable");
  assert.match(card.meaning, /keine Bewertung/);
  // „Für vertrauliche Finanzangaben ist Auslassen kein negativer Befund."
  assert.ok(!/fehlt|versäum|mangel|leider/i.test(`${card.observed} ${card.meaning}`));
});

test("höchstens vier Karten je Sitzung", () => {
  // Teil G: „zwei bis vier vom Team ausgewaehlte Themen, nicht 20 Warnkarten
  // auf einmal." Zwanzig Karten sind keine Gruendlichkeit, sondern eine Art,
  // nichts davon zu besprechen.
  const many = ["A01", "A02", "I01", "I03", "E01", "E03", "U01", "U04"];
  const cards = cardsFor(many.map((id) => scale(id, 1)), many.map((id) => scale(id, 5)));
  assert.equal(MAX_CARDS_PER_SESSION, 4);
  assert.ok(cards.length <= 4, `${cards.length} Karten`);
});

test("eine Vereinbarung hat die sechs Bestandteile aus Teil G", () => {
  assert.deepEqual([...AGREEMENT_FIELDS], [
    "Thema", "konkrete Situation", "was gilt",
    "wer entscheidet bzw. informiert", "persönliche Bedingungen", "wann erneut prüfen",
  ]);
  // „Betrags- und Zeitgrenzen legt das Team fest, nicht der Fragebogen" -
  // deshalb leere Felder und keine Vorschlaege.
  const paper = readFileSync(PAPER, "utf8");
  assert.ok(paper.includes("Betrags- und Zeitgrenzen legt das Team fest, nicht der Fragebogen"));
});

test("keine Karte erfindet einen Grund", () => {
  // Teil G: „Eine KI darf Antwortgruende nicht ergaenzen, wenn sie nicht
  // erhoben wurden." Die Texte stammen alle aus der Bibliothek; eingesetzt
  // werden nur Namen, Antworten und Zahlen aus den Angaben selbst.
  const cards = cardsFor([scale("A02", 5)], [scale("A02", 2)]);
  const card = cards[0];
  for (const fragment of ["weil", "da er", "da sie", "aus Angst", "vermutlich deshalb"]) {
    assert.ok(!card.observed.toLowerCase().includes(fragment), card.observed);
  }
  // Die Antworten stehen woertlich als Beschriftung drin, nicht als Zahl.
  assert.match(card.observed, /„fast immer“/);
  assert.match(card.observed, /„selten“/);
  assert.ok(!/\b[1-5]\b/.test(card.observed), "keine Skalenzahl im Text");
});
