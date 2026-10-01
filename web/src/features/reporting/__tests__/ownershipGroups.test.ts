import assert from "node:assert/strict";
import test from "node:test";

import type { CapabilityArea, CapabilityEntry } from "@/features/capability/capabilityTypes";
import { buildOwnershipGroups, OWNERSHIP_GROUP_KEYS } from "@/features/reporting/ownershipGroups";

const areas: CapabilityArea[] = [
  { area_id: "a", family_id: "f", sort_order: 1 },
  { area_id: "b", family_id: "f", sort_order: 2 },
  { area_id: "c", family_id: "f", sort_order: 3 },
  { area_id: "d", family_id: "f", sort_order: 4 },
  { area_id: "e", family_id: "f", sort_order: 5 },
  { area_id: "f", family_id: "f", sort_order: 6 },
];

const eintrag = (
  area_id: string,
  ownership_wish: CapabilityEntry["ownership_wish"],
  application_level: CapabilityEntry["application_level"] = null,
): CapabilityEntry => ({ id: area_id, area_id, application_level, ownership_wish, evidence: [] });

test("jede Antwort landet in ihrer eigenen Gruppe", () => {
  const gruppen = buildOwnershipGroups(
    [
      eintrag("a", "own"),
      eintrag("b", "contribute"),
      eintrag("c", "prefer_other"),
      eintrag("d", "prefer_external"),
      eintrag("e", "unclear"),
      eintrag("f", null),
    ],
    areas,
  );

  assert.deepEqual(
    gruppen.map((gruppe) => [gruppe.key, gruppe.areaIds]),
    [
      ["own", ["a"]],
      ["contribute", ["b"]],
      // Zwei Antworten, eine Gruppe: "lieber jemand anders" und "lieber
      // extern" sind für die Rollenfrage dasselbe.
      ["handsOver", ["c", "d"]],
      // Ohne Antwort zählt wie "noch unklar" - beides heißt, dass die zweite
      // Frage noch offen ist.
      ["open", ["e", "f"]],
    ],
  );
});

test("`grow_into` kommt in keiner Gruppe vor", () => {
  // „Da will ich hineinwachsen" ist eine Absicht und noch keine übernommene
  // Verantwortung. Es hat einen eigenen Abschnitt.
  const gruppen = buildOwnershipGroups([eintrag("a", "grow_into")], areas);
  assert.deepEqual(gruppen, []);
});

test("die Erfahrungsstufe spielt keine Rolle", () => {
  // KÖNNEN UND WOLLEN SIND ZWEI VERSCHIEDENE DINGE. Stufe 5 mit „lieber
  // jemand anders" ist ein gültiger Zustand, kein Widerspruch.
  const hoch = buildOwnershipGroups([eintrag("a", "prefer_other", 5)], areas);
  const niedrig = buildOwnershipGroups([eintrag("a", "prefer_other", 1)], areas);
  assert.deepEqual(hoch, niedrig);
  assert.equal(hoch[0].key, "handsOver");
});

test("leere Gruppen erscheinen nicht", () => {
  // Eine Überschrift ohne Inhalt behauptet eine Leerstelle. „Du hast nichts,
  // das du abgeben willst" ist keine Auskunft, die jemand gegeben hat.
  const gruppen = buildOwnershipGroups([eintrag("a", "own")], areas);
  assert.equal(gruppen.length, 1);
  assert.ok(gruppen.length < OWNERSHIP_GROUP_KEYS.length);
});

test("die Bereiche stehen in der Reihenfolge des Vokabulars", () => {
  // Sonst in der Folge, in der jemand sie angeklickt hat - und das liest sich
  // wie eine Rangfolge, die niemand gemeint hat.
  const gruppen = buildOwnershipGroups(
    [eintrag("c", "own"), eintrag("a", "own"), eintrag("b", "own")],
    areas,
  );
  assert.deepEqual(gruppen[0].areaIds, ["a", "b", "c"]);
});

test("ein unbekannter Wunsch verschwindet nicht, er zaehlt als offen", () => {
  // Etwa aus einer späteren Fassung des Formulars. Ein Bereich, der einfach
  // fehlt, wäre schlimmer als einer unter „noch offen".
  const gruppen = buildOwnershipGroups(
    [{ ...eintrag("a", null), ownership_wish: "etwas_neues" as never }],
    areas,
  );
  assert.deepEqual(gruppen, [{ key: "open", areaIds: ["a"] }]);
});

test("ohne Eintraege gibt es keine Gruppen", () => {
  assert.deepEqual(buildOwnershipGroups([], areas), []);
});
