import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { OWNERSHIP_WISHES, type ApplicationLevel, type CapabilityArea, type CapabilityEntry, type CapabilityFamily, type OwnershipWish } from "@/features/capability/capabilityTypes";
import type { Venture } from "@/features/instruments/align/ventureResolution";
import { buildCapabilityMap } from "@/features/reporting/capabilityMapModel";
import { profileVentures } from "@/features/reporting/profileVentures";
import { AREAS, PRODUCT_ITEMS, type AreaKey, type ProductProfile } from "@/features/reporting/workstyle/model";
import { areaNarrative, areaPattern, glanceSentence, patternItems } from "@/features/reporting/workstyle/narrative";

/**
 * Phase 1 (Profil), 17.10.2026 - „Das bist du" als Profil statt Bericht.
 *
 * Geprueft werden die reinen Bausteine: Capability Map (Erfahrung und Rolle
 * getrennt), Vorhaben (ohne Archiv, eindeutig), Workstyle bei gemischten
 * Antworten (konkreter, aber nie mehr als die Antworten tragen) - und dass
 * die 29 Core-Items unveraendert bleiben.
 */

const read = (path: string) => readFileSync(path, "utf8");
const json = (path: string) => JSON.parse(read(path));
const codeOnly = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---------------------------------------------------------------------------
// Capability Map
// ---------------------------------------------------------------------------
const families: CapabilityFamily[] = [
  { family_id: "commercial_growth", sort_order: 5 },
  { family_id: "product_value", sort_order: 2 },
];
const areas: CapabilityArea[] = [
  { area_id: "product_management", family_id: "product_value", sort_order: 2, sourcing: "internal_only" },
  { area_id: "ux_design", family_id: "product_value", sort_order: 4, sourcing: "unclassified" },
  { area_id: "b2b_sales", family_id: "commercial_growth", sort_order: 1, sourcing: "depends" },
  { area_id: "accounting", family_id: "commercial_growth", sort_order: 9, sourcing: "component" },
];
const entry = (areaId: string, level: ApplicationLevel | null, wish: OwnershipWish | null): CapabilityEntry => ({
  id: `e-${areaId}`,
  area_id: areaId,
  application_level: level,
  ownership_wish: wish,
  evidence: [],
});

test("Capability Map: Erfahrung und Rolle stehen getrennt, je Familie in Vokabular-Reihenfolge", () => {
  const map = buildCapabilityMap(
    [entry("accounting", 2, "prefer_external"), entry("ux_design", 4, "contribute"), entry("product_management", 2, "own"), entry("b2b_sales", null, null)],
    areas,
    families,
  );
  assert.deepEqual(map.families.map((f) => f.familyId), ["product_value", "commercial_growth"]);
  assert.deepEqual(map.families[0].rows.map((r) => r.areaId), ["product_management", "ux_design"]);
  const byArea = Object.fromEntries(map.families.flatMap((f) => f.rows).map((r) => [r.areaId, r]));
  assert.deepEqual(
    { level: byArea.product_management.level, role: byArea.product_management.role },
    { level: 2, role: "own" },
  );
  assert.equal(byArea.ux_design.role, "contribute", "beitragen bleibt beitragen");
  assert.equal(byArea.ux_design.level, 4);
  assert.equal(byArea.b2b_sales.level, null, "keine Stufe heisst nicht eingestuft - keine 0");
  assert.equal(byArea.b2b_sales.role, "unset");
  assert.equal(byArea.accounting.role, "prefer_external");
  // Einordnung nur, wenn sie etwas sagt.
  assert.equal(byArea.ux_design.sourcing, null);
  assert.equal(byArea.accounting.sourcing, "component");
  assert.deepEqual(map.counts, { areas: 4, levelled: 3, withRole: 3 });
});

test("Capability Map: „will verantworten, wenig Erfahrung“ bleibt eine Kombination - kein Hineinwachsen", () => {
  const map = buildCapabilityMap([entry("product_management", 2, "own"), entry("ux_design", 1, "grow_into"), entry("b2b_sales", 5, "own")], areas, families);
  const rows = Object.fromEntries(map.families.flatMap((f) => f.rows).map((r) => [r.areaId, r]));
  assert.equal(rows.product_management.role, "own");
  assert.equal(rows.product_management.ownsWithLessExperience, true);
  assert.equal(rows.ux_design.role, "grow_into");
  assert.equal(rows.ux_design.ownsWithLessExperience, false);
  assert.equal(rows.b2b_sales.ownsWithLessExperience, false);
  // Ohne Stufe keine Aussage ueber Erfahrung.
  const noLevel = buildCapabilityMap([entry("product_management", null, "own")], areas, families);
  assert.equal(noLevel.families[0].rows[0].ownsWithLessExperience, false);
});

test("Capability Map: Eintraege ohne bekannten Bereich erscheinen nicht als leere Zeile", () => {
  const map = buildCapabilityMap([entry("retired_area", 3, "own"), entry("ux_design", 3, null)], areas, families);
  assert.deepEqual(map.families.flatMap((f) => f.rows).map((r) => r.areaId), ["ux_design"]);
  assert.equal(map.counts.areas, 1);
});

test("Capability Map: jede Rolle hat eine Beschriftung in DE und EN - beitragen ist keine Absage", () => {
  for (const locale of ["de", "en"]) {
    const roles = json(`messages/${locale}/profile.json`).founderProfile.bring.roles as Record<string, string>;
    for (const role of [...OWNERSHIP_WISHES, "unset"]) assert.ok(roles[role]?.trim(), `${locale}: bring.roles.${role}`);
    assert.doesNotMatch(roles.contribute, /nicht|lieber|abgeben|not|rather|hand/i, `${locale}: contribute klingt nach Absage`);
  }
  const de = json("messages/de/profile.json").founderProfile.bring.roles;
  assert.equal(de.own, "Verantwortung übernehmen");
  assert.equal(de.contribute, "Beitragen");
  assert.equal(de.grow_into, "Hineinwachsen");
  assert.equal(de.prefer_other, "Lieber eine andere Person");
  assert.equal(de.prefer_external, "Eher extern");
  assert.equal(de.unclear, "Noch offen");
});

test("Capability Map: kein Score, kein Prozent, keine Gesamtbewertung", () => {
  for (const path of ["src/features/reporting/CapabilityMap.tsx", "src/features/reporting/capabilityMapModel.ts"]) {
    const code = codeOnly(path);
    assert.doesNotMatch(code, /score|percent|Prozent|%|rank|total|average|sum\(/i, path);
  }
  for (const locale of ["de", "en"]) {
    const bring = JSON.stringify(json(`messages/${locale}/profile.json`).founderProfile.bring);
    assert.doesNotMatch(bring, /%|score|Punkt(e|zahl)|Note|Rang|stärke|schwäche|strength|weakness|Typ\b|type\b/i, locale);
  }
  // Die dezente Zaehlzeile sagt, wie viel beschrieben ist - nicht „x von y“.
  const counts = json("messages/de/profile.json").founderProfile.bring.counts as string;
  assert.doesNotMatch(counts, /\bvon\b/);
});

// ---------------------------------------------------------------------------
// Vorhaben
// ---------------------------------------------------------------------------
const venture = (id: string, o: Partial<Venture> = {}): Venture => ({
  id,
  name: null,
  teamContext: "pre_founder",
  alone: true,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  archivedAt: null,
  ...o,
});

test("Vorhaben: archivierte entfallen, zuletzt geaenderte zuerst", () => {
  const list = profileVentures([
    venture("a", { name: "Alt", updatedAt: "2026-09-01T00:00:00.000Z" }),
    venture("b", { name: "Archiv", archivedAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-10T00:00:00.000Z" }),
    venture("c", { name: "Neu", updatedAt: "2026-10-12T00:00:00.000Z" }),
  ]);
  assert.deepEqual(list.map((v) => v.id), ["c", "a"]);
});

test("Vorhaben: namenlose bleiben namenlos (kein erfundener Name) und sind trotzdem eindeutig", () => {
  const list = profileVentures([
    venture("x1", { createdAt: "2026-10-05T09:00:00.000Z", updatedAt: "2026-10-05T09:00:00.000Z" }),
    venture("x2", { createdAt: "2026-10-05T18:00:00.000Z", updatedAt: "2026-10-06T09:00:00.000Z" }),
    venture("y", { createdAt: "2026-09-20T09:00:00.000Z", updatedAt: "2026-09-20T09:00:00.000Z" }),
    venture("n1", { name: " Studio ", updatedAt: "2026-08-01T00:00:00.000Z" }),
    venture("n2", { name: "studio", updatedAt: "2026-07-01T00:00:00.000Z" }),
  ]);
  const byId = Object.fromEntries(list.map((v) => [v.id, v]));
  assert.equal(byId.x1.name, null);
  assert.equal(byId.y.name, null);
  assert.equal(byId.y.duplicateIndex, null, "allein an seinem Tag - keine Nummer");
  assert.deepEqual([byId.x2.duplicateIndex, byId.x1.duplicateIndex], [1, 2], "gleicher Tag - durchnummeriert in Anzeigereihenfolge");
  assert.equal(byId.n1.name, "Studio");
  assert.deepEqual([byId.n1.duplicateIndex, byId.n2.duplicateIndex], [1, 2], "gleicher Name - durchnummeriert");
  // Jede Zeile ist eindeutig, wenn man sie so beschriftet wie die Seite.
  const label = (v: (typeof list)[number]) => `${v.name ?? `unnamed ${v.createdAt?.slice(0, 10)}`}${v.duplicateIndex ? ` (${v.duplicateIndex})` : ""}`.toLowerCase();
  assert.equal(new Set(list.map(label)).size, list.length);
});

test("Vorhaben: der Filter sitzt nur im Profil - findVentures liefert weiter alle", () => {
  const resolution = codeOnly("src/features/instruments/align/ventureResolution.ts");
  assert.doesNotMatch(resolution, /archived_at\s*(is|=)|\.is\("archived_at"/, "findVentures filtert selbst - die Vorhaben-Seiten verloeren Teams");
  assert.match(resolution, /select\("id, name, team_context, created_at, updated_at, archived_at"\)/);
});

// ---------------------------------------------------------------------------
// Workstyle: gemischte Antworten
// ---------------------------------------------------------------------------
type V = number | null;
function profile(overrides: Record<string, V>, fallback: V = 3): ProductProfile {
  return {
    person_id: "p",
    assessment_id: "a-p",
    instrument_id: "founder-workstyle-pretest-8-5a-v3",
    manifest_version: "3.0.0",
    item_version: "8.4-v0.4",
    completed_at: "2026-10-05",
    answers: PRODUCT_ITEMS.map((i) => {
      const v = i.item_key in overrides ? overrides[i.item_key] : fallback;
      if (v === null) return { item_key: i.item_key, item_version: i.item_version, value: null, missing_reason: "cannot_assess" };
      return {
        item_key: i.item_key,
        item_version: i.item_version,
        value: i.response_format === "comparative" ? { optionId: v >= 3 ? "lean_b" : "lean_a" } : { scale: v },
        missing_reason: null,
      };
    }),
  } as ProductProfile;
}
const withArea = (area: AreaKey, values: V[]) =>
  profile(Object.fromEntries(patternItems(area).map((item, n) => [item.item_key, values[n] ?? null])));

test("die 29 Core-Items und ihre Bereiche bleiben unveraendert", () => {
  assert.equal(PRODUCT_ITEMS.length, 29);
  const perArea = Object.fromEntries(AREAS.map((a) => [a.key, PRODUCT_ITEMS.filter((i) => i.area_key === a.key).length]));
  assert.deepEqual(perArea, { EVI: 5, EXP: 5, EL: 4, VOICE: 5, AMB: 4, ORG: 6 });
  assert.deepEqual(AREAS.map((a) => a.team), ["Entscheidungen prüfen", "Erfahrung nutzen", "Durch Ausprobieren lernen", "Einwände ansprechen", "Offene Situationen empfinden", "Die Arbeit steuern"]);
});

test("gemischt: der Satz nennt nur die Pole, die in den Antworten vorkommen", () => {
  for (const area of AREAS.map((a) => a.key)) {
    const n = patternItems(area).length;
    // Oben und Mitte (zwei Mal Mitte, damit es nicht „fast alle“ wird), nichts unten.
    const upperMiddle = withArea(area, Array.from({ length: n }, (_, i) => (i < n - 2 ? 5 : 3)));
    // Unten und Mitte.
    const lowerMiddle = withArea(area, Array.from({ length: n }, (_, i) => (i < n - 2 ? 1 : 3)));
    // Beide Pole.
    const both = withArea(area, Array.from({ length: n }, (_, i) => (i % 2 ? 5 : 1)));
    for (const [profileX, expect] of [[upperMiddle, "upper"], [lowerMiddle, "lower"], [both, "both"]] as const) {
      const pattern = areaPattern(profileX, area);
      if (pattern.kind !== "mixed") continue; // z. B. ORG mit 2 Items: kein „Mitte+Pol“-Mix moeglich
      const present = { upper: pattern.upper.length > 0, lower: pattern.lower.length > 0 };
      assert.equal(expect === "both" ? present.upper && present.lower : expect === "upper" ? present.upper && !present.lower : present.lower && !present.upper, true, `${area} ${expect}`);
      for (const locale of ["de", "en"] as const) {
        const core = areaNarrative(profileX, area, locale).core;
        const glance = glanceSentence(profileX, area, locale);
        assert.equal(core, glance, `${area} ${locale}: Karte und Kernsatz sagen dasselbe`);
        assert.doesNotMatch(core, /^(Je nach Situation|It depends on the situation)\.?$/, `${area} ${locale}: wieder nur „je nach Situation“`);
        assert.ok(core.split(/\s+/).length >= 6, `${area} ${locale}: zu leer: ${core}`);
      }
    }
  }
});

test("gemischt: die drei Saetze je Bereich sind verschieden und in beiden Sprachen da", () => {
  const de = read("src/features/reporting/workstyle/narrative.ts");
  const en = read("src/features/reporting/workstyle/displayCopyEn.ts");
  for (const source of [de, en]) {
    const blocks = [...source.matchAll(/mixedBy: \{ both: "([^"]+)", upper: "([^"]+)", lower: "([^"]+)" \}/g)];
    assert.equal(blocks.length, 6);
    for (const [, both, upper, lower] of blocks) assert.equal(new Set([both, upper, lower]).size, 3);
  }
  assert.doesNotMatch(de, /short: \{[^}]*mixed:/, "der leere Kurzsatz ist zurueck");
  assert.doesNotMatch(en, /short: \{[^}]*mixed:/, "der leere Kurzsatz ist zurueck (EN)");
  // Kein Typ, keine Wertung, keine Wirkung auf andere.
  const texts = [...de.matchAll(/mixedBy: \{([^}]+)\}/g), ...en.matchAll(/mixedBy: \{([^}]+)\}/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(texts, /Typ\b|type\b|Stärke|Schwäche|strength|weakness|gut|schlecht|good|bad|andere erleben|others see/i);
});

test("die Kurzfassung auf der Seite rechnet nichts neu und nutzt dieselbe Auswertung", () => {
  const summary = codeOnly("src/features/reporting/workstyle/WorkstyleProfileSummary.tsx");
  assert.match(summary, /individualNarratives\(profile, locale\)/);
  assert.match(summary, /<WorkstyleGlance/);
  assert.doesNotMatch(summary, /score|percent|%|rank/i);
  // Der vollstaendige Bericht bleibt erreichbar - unter Details & Methodik.
  const page = codeOnly("src/app/me/profile/page.tsx");
  assert.ok(page.indexOf("<IndividualWorkstyle") > page.search(/\{teil\(\s*"details",/));
  assert.ok(page.indexOf("<WorkstyleProfileSummary") < page.search(/\{teil\(\s*"details",/));
});

test("der Staerken-CTA landet auf einer Seite, die auch Staerken heisst", () => {
  // GEFUNDEN BEIM DURCHKLICKEN (Phase 1): „Stärken festhalten“ fuehrte auf
  // `/profile?step=strengths` - technisch richtig, aber die Ueberschrift dort
  // hiess „Deine Arbeitsweise“ (EN „How you work“) und klang wie der
  // Workstyle-Abschnitt. Der Weg wirkte, als fuehre er woanders hin.
  const de = json("messages/de/capability.json").strengths.title;
  const en = json("messages/en/capability.json").strengths.title;
  assert.equal(de, "Deine Stärken");
  assert.equal(en, "Your strengths");
  assert.notEqual(de, json("messages/de/profile.json").founderProfile.sections.work);
  assert.notEqual(en, json("messages/en/profile.json").founderProfile.sections.work);
});
