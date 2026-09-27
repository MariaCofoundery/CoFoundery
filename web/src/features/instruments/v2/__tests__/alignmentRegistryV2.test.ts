import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALIGNMENT_REGISTRY_V2,
  assertAlignmentRegistryIntegrity,
  getAlignmentItems,
  getAlignmentPreferences,
  getMvpAlignmentItems,
  getPreferenceOfItem,
  type AlignmentRegistryV2,
} from "@/features/instruments/v2/alignmentRegistryV2";

const clone = (): AlignmentRegistryV2 =>
  JSON.parse(JSON.stringify(ALIGNMENT_REGISTRY_V2)) as AlignmentRegistryV2;

// ---------------------------------------------------------------------------
// Schritt 1: Das Modell v2 als Daten
// ---------------------------------------------------------------------------
//
// Quelle ist Teil D der „Wissenschaftlichen Neukonzeption" v0.2. Die
// Itemtexte sind wörtlich übernommen, damit sich Papier und Code gegeneinander
// prüfen lassen.

test("acht Präferenzen, vierundsechzig Items, sechzehn in der Gesprächsfassung", () => {
  const preferences = getAlignmentPreferences();
  const items = getAlignmentItems();

  assert.deepEqual(
    preferences.map((preference) => preference.id),
    ["A", "I", "E", "U", "K", "T", "D", "X"]
  );
  assert.equal(items.length, 64);
  assert.equal(getMvpAlignmentItems().length, 16);

  // Zwei je Präferenz - und das ist im Gutachten ausdrücklich KEINE kurze
  // zuverlässige Skala, sondern zwei Gesprächsindikatoren.
  for (const preference of preferences) {
    assert.equal(
      preference.items.filter((item) => item.inMvp).length,
      2,
      `${preference.id}: genau zwei in der Gesprächsfassung`
    );
  }
});

test("kein Item ist umgepolt", () => {
  // DIE FEHLERQUELLE AUS V1, hier strukturell ausgeschlossen: Dort liefen
  // sechs Zustimmungsitems gegen ihre eigene Achse, und es fiel monatelang
  // niemandem auf. „Niedrig" heißt jetzt weniger des benannten Inhalts,
  // nicht den Gegenpol einer anderen Eigenschaft.
  for (const item of getAlignmentItems()) {
    assert.equal(item.reverse, false, item.itemId);
  }

  const broken = clone();
  (broken.preferences[0].items[0] as { reverse: boolean }).reverse = true;
  assert.throws(() => assertAlignmentRegistryIntegrity(broken), /reverse coding/);
});

test("die Bedingungen gehören zur Messung, nicht zur Oberfläche", () => {
  const byId = new Map(getAlignmentPreferences().map((p) => [p.id, p]));

  // Ohne diesen Satz misst U etwas anderes - nämlich Autonomie ohne Mandat.
  assert.match(byId.get("U")!.condition ?? "", /Verantwortungsbereich und Budget sind vereinbart/);
  // Ohne diesen misst E Leichtsinn statt Erproben.
  assert.match(byId.get("E")!.condition ?? "", /rückgängig machen lassen/);
  // T und D meinen sachliche Differenzen, keinen eskalierten Streit.
  assert.match(byId.get("T")!.condition ?? "", /keine akute Gefahr/);
  assert.match(byId.get("D")!.condition ?? "", /keine akute Gefahr/);
  // Und im Wortlaut des Gutachtens steht dasselbe, nur anders formuliert.
  assert.match(byId.get("T")!.sourceCondition ?? "", /ohne akute Gefahr/);
  // Und X meint offene Information, keine Existenzangst.
  assert.match(byId.get("X")!.condition ?? "", /nicht um akute Existenzbedrohung/);
});

test("die Auslassungsgründe sind getrennt und werden nie zur Mitte", () => {
  const codes = ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.code);
  assert.deepEqual(codes, [
    "cannot_assess",
    "not_relevant",
    "withheld",
    // Am 27.09.2026 mit Schritt 1b dazugekommen. Die Kontextfragen brauchen
    // beide, und keiner von ihnen ließ sich auf die vorhandenen abbilden:
    // „noch offen" kommt in der Quelle 67-mal vor und meint eine fehlende
    // Festlegung, nicht ein fehlendes Urteil - R04 bietet beide nebeneinander
    // an. Und „vertraulich klären" ist eine offene Tür, keine geschlossene.
    "undecided",
    "confidential_first",
    "technical",
  ]);

  // Sechs verschiedene Dinge: der eigene Klärungsstand, das Vorhaben, eine
  // Entscheidung, eine ausstehende Festlegung, die Bitte um ein Gespräch unter
  // vier Augen, ein technischer Ausfall. Wer sie zusammenwirft, macht aus
  // „möchte ich nicht sagen" ein „weiß ich nicht".
  const notes = ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.note).join(" ");
  assert.match(notes, /NIE zur Skalenmitte/);
});

test("das Modell verspricht keine Gesamtzahl und keine bestätigten Faktoren", () => {
  const notes = ALIGNMENT_REGISTRY_V2.notes.join(" ");
  assert.match(notes, /KEINE GESAMTZAHL/);
  assert.match(notes, /keine acht bestaetigten Faktoren/i);

  // Und der Status ist ehrlich: keine Präferenz behauptet, etabliert zu sein.
  for (const preference of getAlignmentPreferences()) {
    assert.ok(
      ["plausible_transfer", "own_hypothesis"].includes(preference.evidenceStatus),
      `${preference.id}: ${preference.evidenceStatus}`
    );
  }
});

test("jeder Fragetext steht wörtlich so in der Quelle", () => {
  // DER WICHTIGSTE TEST DIESER DATEI. Ein Instrument, dessen Fragen sich
  // unbemerkt von ihrer Quelle entfernen, ist nicht mehr das Instrument, das
  // begutachtet wurde - und genau das passiert leise, wenn jemand eine
  // Formulierung "nur ein bisschen glättet".
  //
  // Geprüft werden ALLE 64, nicht Stichproben. Eine Stichprobe würde die
  // eine geänderte Frage mit hoher Wahrscheinlichkeit gerade übersehen.
  const paper = readFileSync(
    "../docs/CoFoundery_Wissenschaftliche_Neukonzeption.md",
    "utf8"
  );

  // GEPRUEFT WIRD DER QUELLTEXT, NICHT DER ANGEZEIGTE. Seit dem 27.09.2026
  // gibt es ueberarbeitete Fassungen (`rewordingsV2`). Die Registratur enthaelt
  // weiterhin den Wortlaut des Gutachtens - genau deshalb kann dieser Test
  // bleiben, wie er ist, und die Ueberarbeitung trotzdem sichtbar sein.
  const drifted = getAlignmentItems()
    .filter((item) => !paper.includes(item.sourcePrompt))
    .map((item) => `${item.itemId}: ${item.sourcePrompt}`);

  assert.deepEqual(
    drifted,
    [],
    "Diese Fragetexte stehen nicht mehr wörtlich in der Quelle:\n" + drifted.join("\n")
  );

  // GEGENPROBE. Ein Abgleich, der alles findet, könnte auch alles finden -
  // etwa weil die Quelle leer gelesen wurde oder `includes` auf einem
  // leeren Text immer wahr wäre. Eine absichtlich veränderte Frage darf
  // nicht durchgehen.
  const first = getAlignmentItems()[0].sourcePrompt;
  assert.ok(paper.includes(first), "die Quelle wurde überhaupt gelesen");
  assert.ok(
    !paper.includes(first.replace("Wie häufig", "Wie oft")),
    "der Abgleich unterscheidet tatsächlich"
  );
});

test("auch die Bedingungen und Definitionen stammen aus der Quelle", () => {
  // Die Bedingungen sind Teil der Messversion. Wenn sich eine davon
  // verschiebt, misst die Präferenz etwas anderes - und zwar ohne dass ein
  // Fragetext sich ändert.
  const paper = readFileSync(
    "../docs/CoFoundery_Wissenschaftliche_Neukonzeption.md",
    "utf8"
  );

  const drifted: string[] = [];
  for (const preference of getAlignmentPreferences()) {
    if (preference.sourceCondition && !paper.includes(preference.sourceCondition)) {
      drifted.push(`${preference.id} (Bedingung): ${preference.sourceCondition}`);
    }
  }

  assert.deepEqual(drifted, [], "Nicht mehr wörtlich in der Quelle:\n" + drifted.join("\n"));
});

test("die Fragetexte sind vollständig, verschieden und wirklich Fragen", () => {
  const items = getAlignmentItems();
  const prompts = items.map((item) => item.prompt);

  assert.equal(new Set(prompts).size, prompts.length, "kein Fragetext doppelt");
  for (const item of items) {
    assert.ok(item.prompt.trim().endsWith("?"), `${item.itemId}: keine Frage`);
    // Die beiden Formate fragen verschiedene Dinge, und das muss man am
    // Satz erkennen: F nach gewünschter Häufigkeit, C nach Befinden.
    if (item.answerFormat === "F") {
      assert.match(item.prompt, /^Wie häufig möchtest du /, item.itemId);
    } else {
      assert.match(item.prompt, /^Wie fühlst du dich, wenn /, item.itemId);
    }
  }
});

test("Kennungen sind eindeutig und auffindbar", () => {
  const ids = getAlignmentItems().map((item) => item.itemId);
  assert.equal(new Set(ids).size, ids.length);

  assert.equal(getPreferenceOfItem("A01")?.id, "A");
  assert.equal(getPreferenceOfItem("X08")?.id, "X");
  assert.equal(getPreferenceOfItem("gibtesnicht"), null);

  const broken = clone();
  broken.preferences[1].items[0].itemId = broken.preferences[0].items[0].itemId;
  assert.throws(() => assertAlignmentRegistryIntegrity(broken), /doppelte Kennung/);
});

test("jede Präferenz kommt in der Gesprächsfassung vor", () => {
  // Sonst stünde sie im Modell und wäre im Produkt unsichtbar.
  const broken = clone();
  for (const item of broken.preferences[0].items) item.inMvp = false;
  assert.throws(() => assertAlignmentRegistryIntegrity(broken), /kein einziges Item/);
});
