import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEPTH_LEVEL, buildCapabilityReadout } from "@/features/capability/capabilityReadout";
import type {
  ApplicationLevel,
  CapabilityArea,
  CapabilityEntry,
  CapabilityFamily,
  OwnershipWish,
} from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const families: CapabilityFamily[] = [
  { family_id: "product_value", sort_order: 2 },
  { family_id: "commercial_growth", sort_order: 5 },
];
const areas: CapabilityArea[] = [
  { area_id: "product_management", family_id: "product_value", sort_order: 2 },
  { area_id: "ux_design", family_id: "product_value", sort_order: 4 },
  { area_id: "b2b_sales", family_id: "commercial_growth", sort_order: 1 },
  { area_id: "marketing_brand", family_id: "commercial_growth", sort_order: 3 },
];

const entry = (
  areaId: string,
  level: ApplicationLevel | null,
  wish: OwnershipWish | null
): CapabilityEntry => ({
  id: `entry-${areaId}`,
  area_id: areaId,
  application_level: level,
  ownership_wish: wish,
  evidence: [],
});

const readout = (entries: CapabilityEntry[]) => buildCapabilityReadout(entries, areas, families);
const finding = (entries: CapabilityEntry[], key: string) =>
  readout(entries).findings.find((f) => f.key === key);

// ---------------------------------------------------------------------------
// Der Befund, um den es eigentlich geht
// ---------------------------------------------------------------------------
test("can-but-hands-over is recognised as its own finding, not as a contradiction", () => {
  // Das Modell sagt ausdruecklich: CAN ist nicht WANT TO OWN. Eine hohe Stufe
  // mit "lieber jemand anders" ist ein gueltiger Zustand - und die
  // interessanteste Information fuer eine Rollenverteilung.
  const found = finding([entry("b2b_sales", 5, "prefer_other")], "canButHandsOver");
  assert.deepEqual(found?.areaIds, ["b2b_sales"]);

  // Extern soll genauso zaehlen: Der Punkt ist "nicht bei mir", nicht "wer".
  const external = finding([entry("b2b_sales", 4, "prefer_external")], "canButHandsOver");
  assert.deepEqual(external?.areaIds, ["b2b_sales"]);
});

test("handing over without depth is not the same finding", () => {
  // Ohne Tiefe ist "lieber jemand anders" keine Verhandlungsinformation,
  // sondern schlicht Mitarbeit. Beides zu vermischen wuerde den einen
  // aussagekraeftigen Befund verwaessern.
  const entries = [entry("b2b_sales", 2, "prefer_other")];
  assert.equal(finding(entries, "canButHandsOver"), undefined);
  assert.deepEqual(finding(entries, "contributes")?.areaIds, ["b2b_sales"]);
});

// ---------------------------------------------------------------------------
// Was die Auswertung nicht behaupten darf
// ---------------------------------------------------------------------------
test("wanting to own without a stated level is not turned into growth", () => {
  // Wer "verantworten" angibt und die Stufe leer laesst, will verantworten.
  // Daraus "will hineinwachsen" zu machen waere eine Behauptung ueber die
  // Erfahrung dieser Person, die sie nie gemacht hat.
  const entries = [entry("product_management", null, "own")];
  assert.deepEqual(finding(entries, "anchor")?.areaIds, ["product_management"]);
  assert.equal(finding(entries, "growingInto"), undefined);
});

test("only an explicitly low level makes it growth", () => {
  const entries = [entry("product_management", 2, "own")];
  assert.deepEqual(finding(entries, "growingInto")?.areaIds, ["product_management"]);
  assert.equal(finding(entries, "anchor"), undefined);
});

test("depth without a stated wish stays open instead of being read as a claim", () => {
  const entries = [entry("b2b_sales", 5, null)];
  assert.deepEqual(finding(entries, "undecided")?.areaIds, ["b2b_sales"]);
  assert.equal(finding(entries, "anchor"), undefined, "Koennen ist nicht Wollen");
});

test("no focus family is claimed when two are equally large", () => {
  // "Der Schwerpunkt liegt in X" waere bei Gleichstand einfach falsch.
  const tie = readout([entry("product_management", null, null), entry("b2b_sales", null, null)]);
  assert.equal(tie.focusFamilyId, null);

  const clear = readout([
    entry("product_management", null, null),
    entry("ux_design", null, null),
    entry("b2b_sales", null, null),
  ]);
  assert.equal(clear.focusFamilyId, "product_value");
});

test("an empty snapshot produces no findings and no section", () => {
  const empty = readout([]);
  assert.deepEqual(empty.findings, []);
  assert.equal(empty.focusFamilyId, null);
  assert.equal(empty.areaCount, 0);

  const component = source("src/features/capability/CapabilityReadoutSection.tsx");
  // Kein "keine Angaben"-Kasten: ein sichtbarer Leerplatz macht aus einem
  // fehlenden Eintrag eine Aussage.
  assert.match(component, /if \(readout\.areaCount === 0\) return null/);
});

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------
test("every area appears in exactly one finding", () => {
  const entries = [
    entry("product_management", 5, "own"),
    entry("ux_design", 5, "prefer_other"),
    entry("b2b_sales", 1, "grow_into"),
    entry("marketing_brand", 3, "contribute"),
  ];
  const result = readout(entries);
  const listed = result.findings.flatMap((f) => f.areaIds);

  assert.equal(listed.length, entries.length, "kein Bereich doppelt, keiner verloren");
  assert.equal(new Set(listed).size, entries.length);
});

test("unclear is treated as open, not as a missing answer", () => {
  const entries = [entry("b2b_sales", 3, "unclear")];
  assert.deepEqual(finding(entries, "undecided")?.areaIds, ["b2b_sales"]);
});

test("the counts describe how much was actually filled in", () => {
  const result = readout([
    entry("product_management", 5, "own"),
    entry("ux_design", null, "contribute"),
    entry("b2b_sales", 2, null),
  ]);

  assert.equal(result.areaCount, 3);
  assert.equal(result.levelledCount, 2, "zwei Eintraege tragen eine Stufe");
  assert.equal(result.wishedCount, 2, "zwei tragen einen Wunsch");
  assert.equal(result.depthCount, 1);
});

test("areas inside a finding follow the vocabulary order, not insertion order", () => {
  const found = finding(
    [entry("marketing_brand", null, "contribute"), entry("b2b_sales", null, "contribute")],
    "contributes"
  );
  assert.deepEqual(found?.areaIds, ["b2b_sales", "marketing_brand"]);
});

test("depth threshold is named once and stays consistent with the levels", () => {
  assert.equal(DEPTH_LEVEL, 4);
  // Tiefe muss innerhalb der Skala liegen, sonst kann sie niemand erreichen.
  const de = readJson("messages/de/capability.json").levels as Record<string, string>;
  assert.ok(de[String(DEPTH_LEVEL)], `levels.${DEPTH_LEVEL} fehlt`);
  assert.ok(de[String(DEPTH_LEVEL + 1)], "es muss eine Stufe ueber der Tiefe geben");
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
test("the readout says what it is based on", () => {
  const de = readJson("messages/de/capability.json").readout as Record<string, string>;
  // Ohne diesen Satz liest sich die Auswertung als Urteil ueber einen
  // Menschen statt als Zusammenstellung seiner eigenen Angaben.
  assert.match(de.basis, /eigenen Angaben/);
  assert.match(de.basis, /leeres Feld/);
});

test("both locales carry every finding with title and text", () => {
  const de = (readJson("messages/de/capability.json").readout as Record<string, unknown>).findings as Record<string, Record<string, string>>;
  const en = (readJson("messages/en/capability.json").readout as Record<string, unknown>).findings as Record<string, Record<string, string>>;

  assert.deepEqual(Object.keys(de), Object.keys(en));
  for (const key of ["anchor", "canButHandsOver", "growingInto", "contributes", "undecided"]) {
    assert.ok(de[key]?.title, `de fehlt readout.findings.${key}.title`);
    assert.ok(de[key]?.text, `de fehlt readout.findings.${key}.text`);
    assert.ok(en[key]?.title, `en fehlt readout.findings.${key}.title`);
    assert.ok(en[key]?.text, `en fehlt readout.findings.${key}.text`);
  }
});

test("every finding the code can produce has copy", () => {
  const readoutModule = source("src/features/capability/capabilityReadout.ts");
  const de = (readJson("messages/de/capability.json").readout as Record<string, unknown>).findings as Record<string, unknown>;

  // Ein Befund ohne Text wuerde next-intl werfen und die Profilseite mit 500
  // beenden - und zwar erst bei der Person, die genau diese Kombination
  // eingetragen hat.
  const keys = [...readoutModule.matchAll(/bucket\.(\w+)\.push/g)].map((match) => match[1]);
  assert.ok(keys.length >= 5, `nur ${keys.length} Befunde im Code gefunden`);
  for (const key of new Set(keys)) {
    assert.ok(de[key], `readout.findings.${key} fehlt in der Copy`);
  }
});
