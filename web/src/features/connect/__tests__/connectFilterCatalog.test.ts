import assert from "node:assert/strict";
import test from "node:test";

import { CONNECT_PLACES, CONNECT_TOPICS, mergeSuggestions, orIlike, placeTerms, safeTerm, topicTerms } from "@/features/connect/connectFilterCatalog";

test("der Katalog ist breit genug: viele Themen, alle Bundeslaender und Staedte", () => {
  assert.ok(CONNECT_TOPICS.length >= 40);
  const labels = CONNECT_PLACES.map((entry) => entry.label);
  for (const state of ["Bayern", "Nordrhein-Westfalen", "Sachsen-Anhalt", "Schleswig-Holstein", "Berlin", "Hamburg", "Bremen"]) assert.ok(labels.includes(state), state);
  for (const city of ["München", "Köln", "Leipzig", "Stuttgart"]) assert.ok(labels.includes(city), city);
  assert.equal(new Set(labels).size, labels.length, "doppelte Bezeichnungen");
});

test("ein Bundesland faltet auf seine Staedte auf, freier Text bleibt wie getippt", () => {
  assert.ok(placeTerms("Bayern").includes("münchen"));
  assert.ok(placeTerms("bayern").includes("nürnberg"), "Gross-/Kleinschreibung egal");
  assert.deepEqual(placeTerms("Garmisch"), ["garmisch"]);
  assert.deepEqual(placeTerms("  "), []);
  assert.ok(topicTerms("Vertrieb").includes("sales"));
  assert.deepEqual(topicTerms("Kaffeeröstung"), ["kaffeeröstung"]);
});

test("Eingaben koennen die Filterbedingung nicht veraendern", () => {
  assert.equal(safeTerm('x),title.eq.(y'), "x title.eq. y");
  assert.equal(orIlike("search_text", ["%", "_", "a"]), null, "Zeichen ohne Inhalt ergeben keine Bedingung");
  assert.equal(orIlike("search_text", ["hamburg", "Hamburg"]), "search_text.ilike.*hamburg*,search_text.ilike.*Hamburg*");
  assert.ok(!(orIlike("search_text", ["a),id.neq.(b"]) ?? "").includes("),"));
});

test("Vorschlaege: Katalog zuerst, genutzte Werte ohne Doppelte dahinter", () => {
  assert.deepEqual(mergeSuggestions(["Vertrieb", "Recht"], ["vertrieb", "Kaffee", " ", "Kaffee"]), ["Vertrieb", "Recht", "Kaffee"]);
});
