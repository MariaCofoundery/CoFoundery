import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderProfileCoverage,
  COVERAGE_STATES,
} from "@/features/reporting/founderProfileCoverage";
import type {
  CapabilityArea,
  CapabilityEntry,
  CapabilityFamily,
} from "@/features/capability/capabilityTypes";

// ---------------------------------------------------------------------------
// Die Deckungskarte einer Person
// ---------------------------------------------------------------------------
//
// Was hier geprüft wird, ist weniger die Rechnung als die Zusage: Diese Karte
// zählt Bereiche und vergibt keine Note. Ein Test, der eine Gesamtzahl erwartet,
// wäre der erste Schritt zurück zum Score.

const families: CapabilityFamily[] = [
  { family_id: "customer_market", sort_order: 1 },
  { family_id: "product", sort_order: 2 },
];

const areas: CapabilityArea[] = [
  { area_id: "customer_discovery", family_id: "customer_market", sort_order: 1 },
  { area_id: "user_research", family_id: "customer_market", sort_order: 2 },
  { area_id: "market_analysis", family_id: "customer_market", sort_order: 3 },
  { area_id: "prototyping", family_id: "product", sort_order: 4 },
];

const entry = (
  areaId: string,
  level: CapabilityEntry["application_level"],
  wish: CapabilityEntry["ownership_wish"]
): CapabilityEntry => ({
  id: `entry-${areaId}`,
  area_id: areaId,
  application_level: level,
  ownership_wish: wish,
  evidence: [],
});

test("jeder Bereich bekommt den Zustand dessen, was gesagt wurde", () => {
  const coverage = buildFounderProfileCoverage(
    [
      entry("customer_discovery", 4, "own"),
      entry("user_research", 3, null),
      entry("market_analysis", null, null),
    ],
    areas,
    families
  );

  const first = coverage.families[0];
  assert.deepEqual(
    first.areas.map((area) => area.state),
    ["answered", "levelled", "named"]
  );
  // Der unberührte Bereich der zweiten Familie.
  assert.deepEqual(coverage.families[1].areas.map((area) => area.state), ["unspoken"]);
});

test("ein Bereich ohne Eintrag ist unbesprochen, nicht leer", () => {
  const coverage = buildFounderProfileCoverage([], areas, families);

  // KEIN "0 von 4" ALS BEFUND: Wer nichts eingetragen hat, hat nichts gesagt -
  // das ist eine Aussage über das Gespräch, nicht über den Menschen.
  assert.equal(coverage.enteredCount, 0);
  assert.equal(coverage.touchedFamilyCount, 0);
  assert.equal(coverage.familyCount, 2);
  for (const family of coverage.families) {
    assert.equal(family.counts.unspoken, family.areas.length);
    assert.equal(family.enteredCount, 0);
  }
});

test("`prefer_external` zählt genauso als Antwort wie `own`", () => {
  // CAN ist nicht WANT TO OWN. Wer sagt "das kaufe ich ein", hat die Frage
  // beantwortet - eine Karte, die nur `own` als Antwort zählte, würde zum
  // Ankreuzen von Verantwortung erziehen.
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 5, "prefer_external")],
    areas,
    families
  );
  assert.equal(coverage.families[0].areas[0].state, "answered");
});

test("die Reihenfolge kommt aus dem Vokabular, nicht aus der Eingabe", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("market_analysis", 2, "own"), entry("customer_discovery", 2, "own")],
    areas,
    // Absichtlich verkehrt herum übergeben.
    [...families].reverse()
  );

  assert.deepEqual(
    coverage.families.map((family) => family.familyId),
    ["customer_market", "product"]
  );
  assert.deepEqual(coverage.families[0].areas.map((area) => area.areaId), [
    "customer_discovery",
    "user_research",
    "market_analysis",
  ]);
});

test("die Karte gibt keine Gesamtzahl über einen Menschen aus", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 5, "own")],
    areas,
    families
  );

  // Diese Zusage ist der ganze Grund für die Deckungskarte: Ein unvalidiertes
  // Instrument, das eine Zahl je Person ausgibt, wird als Auswahlkriterium
  // benutzt, sobald es existiert.
  const keys = Object.keys(coverage);
  for (const forbidden of ["score", "total", "rating", "index", "percent"]) {
    assert.ok(
      !keys.some((key) => key.toLowerCase().includes(forbidden)),
      `kein Feld, das wie eine Note heisst: ${forbidden}`
    );
  }
  // Was es gibt, sind Zählwerte über Bereiche.
  assert.equal(coverage.enteredCount, 1);
  assert.equal(coverage.touchedFamilyCount, 1);
});

test("die Zustände decken jeden Bereich genau einmal ab", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 4, "own"), entry("user_research", null, null)],
    areas,
    families
  );

  for (const family of coverage.families) {
    const summed = COVERAGE_STATES.reduce((sum, state) => sum + family.counts[state], 0);
    assert.equal(summed, family.areas.length, `${family.familyId}: Zählwerte gehen auf`);
  }
});

// ---------------------------------------------------------------------------
// Welche Rollen jemand abdeckt
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 27.09.2026: "Ich hätte das gerne auch im Gesamtbild, dass
// drinsteht, welche Rollen ich im Prinzip schon abdecke [...] und vor allem
// wird es cool, wenn man dann schaut: ich matche mit zwei weiteren, welche
// Sachen sind in dem Startup dann schon vorhanden."

const withSourcing: CapabilityArea[] = [
  { area_id: "customer_discovery", family_id: "customer_market", sort_order: 1, sourcing: "internal_only" },
  { area_id: "user_research", family_id: "customer_market", sort_order: 2, sourcing: "depends" },
  { area_id: "market_analysis", family_id: "customer_market", sort_order: 3, sourcing: "component" },
  { area_id: "prototyping", family_id: "product", sort_order: 4, sourcing: "internal_only" },
];

test("eine Rolle deckt ab, wer sie verantworten will UND sie nicht einkaufen kann", () => {
  const coverage = buildFounderProfileCoverage(
    [
      entry("customer_discovery", 4, "own"),
      // Gehört ins Team, aber jemand anders soll es machen - keine Deckung.
      entry("prototyping", 5, "prefer_other"),
      // Will sie verantworten, aber es ist einkaufbar - keine Rolle im Team.
      entry("market_analysis", 4, "own"),
    ],
    withSourcing,
    families
  );

  assert.deepEqual(coverage.roles.covered, ["customer_discovery"]);
  // BEIDE BEDINGUNGEN MÜSSEN ZUSAMMENKOMMEN. Etwas zu können ist nicht
  // dasselbe wie es zu übernehmen, und was einkaufbar ist, braucht niemanden
  // im Team.
  assert.deepEqual(coverage.roles.spokenNotOwned, ["prototyping"]);
});

test("hineinwachsen ist noch keine abgedeckte Rolle", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 2, "grow_into")],
    withSourcing,
    families
  );
  // "Da will ich hineinwachsen" ist eine Absicht. Sie als Deckung zu zählen
  // hieße, einem Team eine Rolle zuzusagen, die noch niemand ausfüllt.
  assert.deepEqual(coverage.roles.covered, []);
  assert.deepEqual(coverage.roles.spokenNotOwned, ["customer_discovery"]);
});

test("die Rollendeckung ist eine Liste, keine Note", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 5, "own"), entry("prototyping", 1, "own")],
    withSourcing,
    families
  );

  // Die Anwendungsstufe wird NICHT verrechnet: Eine 1 und eine 5 stehen
  // gleichberechtigt da. Eine gewichtete "Rollendeckung" wäre wieder eine
  // Bewertung von Menschen.
  assert.deepEqual(coverage.roles.covered, ["customer_discovery", "prototyping"]);
  assert.ok(!Object.keys(coverage.roles).some((key) => /score|level|weight/i.test(key)));
});

test("die Zählung je Herkunftsart geht auf", () => {
  const coverage = buildFounderProfileCoverage(
    [entry("customer_discovery", 4, "own"), entry("user_research", 3, null), entry("market_analysis", 2, "own")],
    withSourcing,
    families
  );
  assert.equal(coverage.roles.bySourcing.internal_only, 1);
  assert.equal(coverage.roles.bySourcing.depends, 1);
  assert.equal(coverage.roles.bySourcing.component, 1);
  assert.equal(coverage.roles.bySourcing.unclassified, 0);
});
