import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TEAM_AREA_STATES,
  buildCapabilityTeamReadout,
  type TeamMemberSides,
} from "@/features/capability/capabilityTeamReadout";
import { DEPTH_LEVEL } from "@/features/capability/capabilityTypes";
import type { CapabilityArea, CapabilityFamily } from "@/features/capability/capabilityTypes";

/**
 * Die Rollenlage eines Teams.
 *
 * GEWUENSCHT AM 21.09.2026: "Dass dann die ganzen Rollen und
 * Verantwortlichkeiten von dem Founder-Team gut gezeigt werden können [...]
 * wenn dann auffällt, ey, euch beiden fehlt HR oder Finance."
 *
 * Geprueft wird hier das Verhalten, nicht der Quelltext: Die Funktion ist
 * rein, also laesst sich jeder Zustand mit echten Angaben herstellen.
 */

const families: CapabilityFamily[] = [
  { family_id: "finance_funding", sort_order: 6 },
  { family_id: "communication_representation", sort_order: 9 },
  { family_id: "other", sort_order: 10 },
];

const areas: CapabilityArea[] = [
  { area_id: "fundraising", family_id: "finance_funding", sort_order: 1 },
  { area_id: "accounting_controlling", family_id: "finance_funding", sort_order: 2 },
  { area_id: "public_speaking", family_id: "communication_representation", sort_order: 1 },
  { area_id: "facilitation", family_id: "communication_representation", sort_order: 2 },
  { area_id: "other", family_id: "other", sort_order: 1 },
];

const member = (
  userId: string,
  name: string,
  entries: TeamMemberSides["entries"]
): TeamMemberSides => ({ userId, name, entries });

const entry = (areaId: string, level: number | null, wish: string | null) => ({
  areaId,
  applicationLevel: level,
  ownershipWish: wish,
});

const stateOf = (readout: ReturnType<typeof buildCapabilityTeamReadout>, areaId: string) =>
  readout.families.flatMap((family) => family.areas).find((area) => area.areaId === areaId);

test("zwei, die dasselbe verantworten wollen, ist ein Befund und keine Stärke", () => {
  // De Dreu & Weingart (2003) finden auch fuer Aufgabenkonflikt negative
  // Zusammenhaenge. Ein doppelter Anspruch wird benannt, nicht gefeiert - und
  // er steht in der Ausgabe oben, weil er vor einer Gruendung geklaert werden
  // muss.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "own")]),
      member("b", "Bo", [entry("fundraising", 4, "own")]),
      member("c", "Cem", [entry("fundraising", 2, "prefer_other")]),
    ],
    areas,
    families
  );

  const fundraising = stateOf(readout, "fundraising");
  assert.equal(fundraising?.state, "contested");
  assert.deepEqual(fundraising?.claimants.sort(), ["a", "b"]);
  assert.equal(readout.findings[0].state, "contested", "der Befund steht nicht oben");
});

test("niemand will, aber jemand kann - das ist eine Absprache, keine Lücke", () => {
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("accounting_controlling", 5, "prefer_other")]),
      member("b", "Bo", [entry("accounting_controlling", 2, "prefer_external")]),
    ],
    areas,
    families
  );

  const area = stateOf(readout, "accounting_controlling");
  assert.equal(area?.state, "openPosition");
  assert.deepEqual(area?.deep, ["a"]);
});

test("niemand will UND niemand kann - genau der Fall, nach dem Maria gefragt hat", () => {
  // DIE PAARWEISE FASSUNG KENNT DIESEN UNTERSCHIED NICHT: Sie fasst beides als
  // `openPosition` zusammen. Fuer ein Team ist er der eigentliche Befund -
  // "koennen wir, will nur keiner" ist ein Gespraech, "koennen wir nicht" ist
  // eine Einstellung, ein Auftrag oder die Entscheidung, es zu lassen.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("accounting_controlling", 2, "prefer_external")]),
      member("b", "Bo", [entry("accounting_controlling", 1, "prefer_external")]),
    ],
    areas,
    families
  );

  assert.equal(stateOf(readout, "accounting_controlling")?.state, "gap");

  // Und in der Ausgabe steht er direkt nach dem doppelten Anspruch.
  assert.deepEqual(
    readout.findings.map((finding) => finding.state),
    ["gap"]
  );
});

test("wer es will und kann, hat die Rolle - und sie steht mit Namen da", () => {
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", DEPTH_LEVEL, "own")]),
      member("b", "Bo", [entry("fundraising", 5, "contribute")]),
    ],
    areas,
    families
  );

  const area = stateOf(readout, "fundraising");
  assert.equal(area?.state, "settled");
  assert.deepEqual(area?.claimants, ["a"]);
  // Bo kann es auch - das verschwindet nicht, nur weil Ada es verantwortet.
  assert.deepEqual(area?.deep.sort(), ["a", "b"]);
});

test("eine Stufe unter der Tiefe ist noch keine Tiefe", () => {
  // Die Grenze steht an einer Stelle (DEPTH_LEVEL) und gilt fuer Vergleich und
  // Teamlage gleich. Zwei Zahlen an zwei Orten wuerden auseinanderlaufen.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", DEPTH_LEVEL - 1, "own")]),
      member("b", "Bo", [entry("fundraising", 2, "prefer_other")]),
    ],
    areas,
    families
  );
  assert.equal(stateOf(readout, "fundraising")?.state, "claimedShallow");
});

test("einer will hineinwachsen, ein anderer gibt ab - ein planbarer Weg", () => {
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 1, "grow_into")]),
      member("b", "Bo", [entry("fundraising", 5, "prefer_other")]),
    ],
    areas,
    families
  );

  const area = stateOf(readout, "fundraising");
  assert.equal(area?.state, "handoverPath");
  assert.deepEqual(area?.claimants, ["a"]);
  assert.deepEqual(area?.deep, ["b"]);
});

test("'noch unklar' ist eine Angabe, aber keine Entscheidung", () => {
  // Daraus "will es niemand" zu machen waere genau die Deutung, die dieses
  // Modell nicht vornimmt - dieselbe Regel wie im paarweisen Vergleich.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "unclear")]),
      member("b", "Bo", [entry("fundraising", 4, "unclear")]),
    ],
    areas,
    families
  );

  const area = stateOf(readout, "fundraising");
  assert.equal(area?.state, "noBasis");
  assert.equal(area?.undecided, 2);
  // Die Tiefe bleibt sichtbar - sie ist eine Angabe, die beide gemacht haben.
  assert.deepEqual(area?.deep.sort(), ["a", "b"]);
});

test("eine einzelne Stimme ergibt keine Teamaussage", () => {
  // Wer allein etwas beansprucht, waehrend die anderen nichts gesagt haben,
  // hat noch keine Rolle - nur eine Absicht. `settled` daraus zu machen waere
  // eine Aussage ueber das Team auf Grundlage einer Person.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "own")]),
      member("b", "Bo", [entry("public_speaking", 4, "own")]),
    ],
    areas,
    families
  );

  assert.equal(stateOf(readout, "fundraising")?.state, "noBasis");
  assert.equal(stateOf(readout, "public_speaking")?.state, "noBasis");
});

test("worüber niemand gesprochen hat, heisst nicht 'fehlt'", () => {
  // DER HEIKELSTE ZUSTAND: Bei zweiundvierzig Bereichen und einer Handvoll
  // Eintraegen je Person ist "nichts eingetragen" am Anfang der Normalfall.
  // Ihn als Luecke zu beschriften waere eine Behauptung ueber Menschen, die
  // nur noch nicht dazu gekommen sind.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "own")]),
      member("b", "Bo", [entry("fundraising", 2, "prefer_other")]),
    ],
    areas,
    families
  );

  const communication = readout.families.find(
    (family) => family.familyId === "communication_representation"
  );
  assert.equal(communication?.state, "unspoken");
  assert.deepEqual(communication?.areas, []);
  assert.ok(readout.unspokenFamilies.includes("communication_representation"));

  // Und die Familie mit dem besetzten Bereich ist besetzt, nicht offen.
  assert.equal(
    readout.families.find((family) => family.familyId === "finance_funding")?.state,
    "covered"
  );
});

test("Marias Beispiel, in einem Zug", () => {
  // "Ihr seid beide sehr ruhig, eher zurueckhaltend, dann braeuchtet ihr
  // vielleicht noch jemanden, der praesentieren kann."
  //
  // So sieht das aus, wenn zwei Menschen es ausdruecklich gesagt haben - und
  // es steht als ZUSTAENDIGKEIT da, nicht als Charakter: Niemand will vor
  // Gruppen sprechen, und niemand hat Tiefe darin.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [
        entry("public_speaking", 2, "prefer_other"),
        entry("fundraising", 5, "own"),
      ]),
      member("b", "Bo", [
        entry("public_speaking", 1, "prefer_external"),
        entry("fundraising", 3, "contribute"),
      ]),
    ],
    areas,
    families
  );

  assert.equal(stateOf(readout, "public_speaking")?.state, "gap");
  assert.equal(
    readout.families.find((family) => family.familyId === "communication_representation")?.state,
    "gap"
  );
  // Finanzierung ist gleichzeitig besetzt - das Team ist nicht "schlecht",
  // sondern hat eine bestimmte Lage.
  assert.equal(stateOf(readout, "fundraising")?.state, "settled");
});

test("es gibt keinen Score, keine Note und keine Rangfolge von Menschen", () => {
  // Fit ueber Differenzwerte zu rechnen verwirft Information und ist
  // methodisch kritisiert (Edwards, siehe docs/capability-comparison-theory-brief.md).
  // Ausgegeben wird das Muster der Angaben, nicht ihre Distanz.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "own")]),
      member("b", "Bo", [entry("fundraising", 2, "prefer_other")]),
    ],
    areas,
    families
  );

  const asText = JSON.stringify(readout);
  assert.doesNotMatch(asText, /"score"|"rank"|"percent"|"grade"|"fit"/i);

  const source = readFileSync("src/features/capability/capabilityTeamReadout.ts", "utf8");
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(code, /score|percent|ranking/i, "es wird gerechnet, statt beschrieben");

  // Die Zaehlwerte sind Zahlen ueber Bereiche, keine Bewertung von Menschen:
  // Sie summieren sich auf die Zahl der Bereiche mit Angaben.
  const family = readout.families.find((entryFamily) => entryFamily.familyId === "finance_funding");
  const total = Object.values(family?.counts ?? {}).reduce((sum, count) => sum + count, 0);
  assert.equal(total, family?.areas.length);
});

test("jeder Bereich hat genau einen Zustand", () => {
  // Deshalb kann kein Bereich in zwei Gruppen landen und keiner ohne Zustand
  // bleiben - dieselbe Zusage wie paarweise.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [
        entry("fundraising", 5, "own"),
        entry("accounting_controlling", 1, "prefer_external"),
        entry("public_speaking", 4, "prefer_other"),
        entry("facilitation", 3, "unclear"),
      ]),
      member("b", "Bo", [
        entry("fundraising", 4, "own"),
        entry("accounting_controlling", 2, "prefer_external"),
        entry("public_speaking", 1, "grow_into"),
        entry("facilitation", 2, "unclear"),
      ]),
    ],
    areas,
    families
  );

  const all = readout.families.flatMap((family) => family.areas);
  assert.equal(all.length, 4);
  const inFindings = readout.findings.flatMap((finding) => finding.areas);
  assert.equal(inFindings.length, all.length, "ein Bereich fehlt oder steht doppelt");
  for (const area of all) {
    assert.ok(TEAM_AREA_STATES.includes(area.state), `${area.areaId} ohne gueltigen Zustand`);
  }

  // Und die erwarteten Zustaende, einer je Fall.
  assert.equal(stateOf(readout, "fundraising")?.state, "contested");
  assert.equal(stateOf(readout, "accounting_controlling")?.state, "gap");
  assert.equal(stateOf(readout, "public_speaking")?.state, "handoverPath");
  assert.equal(stateOf(readout, "facilitation")?.state, "noBasis");
});

test("ein Bereich ausserhalb des Vokabulars erscheint nicht", () => {
  // Ihn zu zeigen waere ein Label-Fehler auf einer Seite ueber Menschen.
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("gibt_es_nicht", 5, "own")]),
      member("b", "Bo", [entry("gibt_es_nicht", 4, "own")]),
    ],
    areas,
    families
  );
  assert.deepEqual(readout.findings, []);
  assert.equal(readout.families.every((family) => family.areas.length === 0), true);
});

test("fünf Menschen gehen genauso wie zwei", () => {
  // Der ganze Grund fuer diese Datei: Die paarweise Fassung kennt "a" und "b".
  const readout = buildCapabilityTeamReadout(
    [
      member("a", "Ada", [entry("fundraising", 5, "own")]),
      member("b", "Bo", [entry("fundraising", 2, "contribute")]),
      member("c", "Cem", [entry("fundraising", 4, "prefer_other")]),
      member("d", "Dee", [entry("fundraising", 1, "prefer_external")]),
      member("e", "Eli", [entry("fundraising", 3, "unclear")]),
    ],
    areas,
    families
  );

  const area = stateOf(readout, "fundraising");
  assert.equal(area?.state, "settled");
  assert.deepEqual(area?.claimants, ["a"]);
  assert.deepEqual(area?.declining.sort(), ["b", "c", "d"]);
  assert.equal(area?.undecided, 1, "die unentschiedene Person wird nicht mitgezaehlt");
  assert.equal(readout.members.length, 5);
});
