import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COLLABORATION_CONVERSATION_LINKS,
  promptBelongsToSetupItem,
  setupItemsForPrompt,
  unknownSetupItemKeysInLinks,
} from "@/features/collaborationLab/collaborationConversationLinks";
import { READ_MY_MIND_PACKS } from "@/features/collaborationLab/readMyMindContent";
import { FOUNDER_IN_THE_WILD_PACKS } from "@/features/founderInTheWild/founderInTheWildContent";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DATA = "src/features/collaborationLab/collaborationConversationPoints.ts";
const CARD = "src/features/collaborationLab/ConversationPointsCard.tsx";
const ITEM_PAGE = "src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx";
const LIST_PAGE = "src/app/(product)/teams/[teamId]/setup/page.tsx";

// ---------------------------------------------------------------------------
// Markierte Gesprächspunkte im Founder-Setup
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 21.09.2026: "Eigentlich wäre es auch gut, dass wenn man
// markiert, dass man darüber sprechen möchte, da auch ein sinnvoller Hinweis
// im Founder-Setup auftaucht, mit aufklappbarem Ergebnis aus dem Founder in
// the Wild oder Read My Mind Modul, sodass man im Setup bleibt, aber nochmal
// sehen kann, was da war."

test("jede Zuordnung zeigt auf ein Thema, das es wirklich gibt", () => {
  // DER STILLE FEHLER, den diese Prüfung verhindert: Ein Tippfehler in einem
  // Themenschlüssel fällt nie auf, weil dann eben kein Hinweis erscheint - und
  // ein fehlender Hinweis sieht aus wie "niemand hat markiert". Man würde es
  // erst merken, wenn jemand sagt "ich hatte das doch markiert".
  assert.deepEqual(unknownSetupItemKeysInLinks(), []);
});

test("jede Zuordnung zeigt auf eine Situation, die es wirklich gibt", () => {
  // Dieselbe Falle von der anderen Seite: Ein Tippfehler im Namen der
  // Situation macht die Zeile stumm.
  const real = new Set([
    ...FOUNDER_IN_THE_WILD_PACKS.flatMap((pack) => pack.scenarios.map((scenario) => scenario.key)),
    ...READ_MY_MIND_PACKS.flatMap((pack) => pack.prompts.map((prompt) => prompt.key)),
  ]);
  const unknown = Object.keys(COLLABORATION_CONVERSATION_LINKS).filter((key) => !real.has(key));
  assert.deepEqual(unknown, []);
});

test("höchstens zwei Themen je Situation", () => {
  // Der Anteil, der sich falsch anfühlt, gehört zur Beteiligung UND zum
  // Vesting. Drei Zeiger wären Rauschen: Dann steht das Gespräch überall und
  // gehört nirgendwohin.
  for (const [promptKey, itemKeys] of Object.entries(COLLABORATION_CONVERSATION_LINKS)) {
    assert.ok(itemKeys.length <= 2, `${promptKey} zeigt auf ${itemKeys.length} Themen`);
  }
});

test("wo keine Zuordnung steht, gibt es keinen Hinweis", () => {
  // Absicht, nicht Lücke: Ein Zeiger auf das falsche Thema schickt das
  // Gespräch in die falsche Ecke der Vereinbarung. "Wann ist etwas gut genug"
  // hat im Setup kein Thema, und es bei "Rollen" einzuhängen wäre geraten.
  assert.deepEqual(setupItemsForPrompt("good_enough"), []);
  assert.equal(promptBelongsToSetupItem("good_enough", "roles_responsibilities"), false);
  assert.equal(promptBelongsToSetupItem("erfundene_situation", "communication"), false);
});

test("das Ergebnis kommt nicht am Siegel vorbei", () => {
  // DIE GRENZE, die hier nicht neu erfunden wird: Die Antworten beider Seiten
  // gibt es nur, wenn beide die Karte aufgedeckt haben. Das prüfen dieselben
  // Leser wie im Lab. Ein Umweg über das Setup wäre ein Weg um den Moment
  // herum, um den es bei dem Ding geht.
  const data = codeOnly(DATA);
  assert.match(data, /getOpenedFounderInTheWildReveal/);
  assert.match(data, /getOpenedReadMyMindPromptReveal/);
  // Kein Reveal, keine Antworten - und das wird auch gesagt, statt leer zu
  // bleiben.
  assert.equal((data.match(/answers: opened\s*\?/g) ?? []).length, 2);
  assert.match(codeOnly(CARD), /point\.answers \?/);
  assert.match(codeOnly(CARD), /sealed/);
});

test("der Hinweis steht vor der Besprechung und auch in der Liste", () => {
  const item = codeOnly(ITEM_PAGE);
  assert.match(item, /<ConversationPointsCard points=\{conversationPoints\}/);
  // Vor dem Feld, in das getippt wird: Was markiert wurde, ist der Anlass für
  // die Vereinbarung, nicht ihr Anhang.
  assert.ok(
    item.indexOf("ConversationPointsCard") < item.indexOf('aria-labelledby="discussion-title"'),
    "der Block muss vor der Besprechung stehen"
  );
  // Und in der Liste, sonst findet man ihn nur, wenn man das richtige Thema
  // ohnehin schon aufmacht.
  assert.match(codeOnly(LIST_PAGE), /conversationPointCounts\.get\(item\.key\)/);
});

test("aufgeklappt bleibt man im Setup", () => {
  // Der ganze Punkt: Ein Link hätte den Faden abgeschnitten. Wer eine
  // Vereinbarung schreibt, verlässt die Seite, sieht die Karte, kommt zurück -
  // und hat den halb getippten Satz verloren.
  const card = codeOnly(CARD);
  assert.match(card, /<details/);
  assert.match(card, /<summary/);
  // Der Weg ins Lab steht trotzdem darin, für den Rest der Situation.
  assert.match(card, /openInLab/);
});

test("beide Sprachen haben alle Sätze", () => {
  const keys = [
    "title", "text", "partnerFallback", "markedByMe", "markedByPartner",
    "markedByBoth", "yourAnswer", "partnerAnswer", "sealed", "openInLab", "listHint",
  ];
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(source(`messages/${locale}/teams.json`)) as {
      setup: { conversationPoints: Record<string, string> & { experiences: Record<string, string> } };
    };
    const block = bundle.setup.conversationPoints;
    for (const key of keys) {
      assert.ok(block[key], `${locale}: ${key} fehlt`);
    }
    assert.match(block.listHint, /plural/, `${locale}: die Zahl beugt nicht`);
    assert.ok(block.experiences.founder_in_the_wild, `${locale}: Erlebnisname fehlt`);
    assert.ok(block.experiences.read_my_mind, `${locale}: Erlebnisname fehlt`);
  }
});
