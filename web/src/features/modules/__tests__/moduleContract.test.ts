import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { deepDiveLinks } from "@/features/instruments/align/deepDive";
import { CURRENT_WORKSTYLE_INSTRUMENT, CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import {
  CAPABILITY_MODULE,
  DIRECTION_MODULE,
  MODULE_DEFINITIONS,
  STRENGTHS_MODULE,
  VENTURE_CORE_MODULE,
  VENTURE_TRADEOFFS_MODULE,
  WORKSTYLE_MODULE,
} from "@/features/modules/definitions";
import {
  findVersionOfInstrument,
  getModuleDefinition,
  getModuleVersion,
  MODULE_REGISTRY,
} from "@/features/modules/registry";
import type { ModuleDefinition } from "@/features/modules/types";
import {
  assertModuleRegistry,
  moduleMessageKeys,
  validateModuleDefinition,
  validateModuleRegistry,
  type ModuleContractEnv,
} from "@/features/modules/validate";
import { AREAS } from "@/features/reporting/workstyle/model";
import { workstyleSetupHandoff } from "@/features/reporting/workstyle/setupHandoff";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

/**
 * Made2Found Module Architecture v1.0 - Phase A: Registry und Contract-Validatoren.
 *
 * Die Validatoren werden an erfundenen Definitionen geprueft (jede Regel
 * einzeln), die Registry an den fuenf echten Bestandsmodulen.
 */

const read = (path: string) => readFileSync(path, "utf8");
const messages = (locale: "de" | "en") => JSON.parse(read(`messages/${locale}/modules.json`)) as Record<string, Record<string, string>>;

const env: ModuleContractEnv = {
  setupItemKeys: FOUNDER_SETUP_ITEM_KEYS,
  hasMessage: (locale, namespace, key) => {
    if (namespace !== "modules") return false;
    const [moduleId, field] = key.split(".");
    return Boolean(messages(locale)[moduleId!]?.[field!]);
  },
};

/** Eine in sich stimmige, neue Vertiefung - die Grundlage der Negativtests. */
const gut = (): ModuleDefinition => ({
  moduleId: "beispiel_vertiefung",
  scope: "person_in_venture",
  tier: "deepening",
  deepens: "venture_core",
  cadence: "revisable",
  usage: "product",
  input: { method: "questionnaire", storage: "assessments", writesTo: "alignment_answers" },
  versions: [{ versionId: "v1", instrumentId: "beispiel-vertiefung-v1", compatGroup: "beispiel-1" }],
  completion: { source: "assessments.submitted_at" },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "assessment" },
  compare: [{ target: "W03", method: "path_and_weights", stance: "conversation_only" }],
  renderers: { profileCard: "card", detail: "/detail", comparison: "compare" },
  setupHandoff: [{ target: "conflict_deadlock", when: "difference" }],
  i18n: { namespace: "modules" },
});

const teamModul = (): ModuleDefinition => ({
  moduleId: "beispiel_check_in",
  scope: "team",
  tier: "deepening",
  cadence: "recurring",
  usage: "product",
  input: { method: "rounds", storage: "rounds", writesTo: "runden" },
  versions: [{ versionId: "r1", compatGroup: "check-in-1" }],
  completion: { source: "runde" },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "round" },
  renderers: { detail: "/team/check-in", teamView: "team-view" },
  i18n: { namespace: "modules" },
});

const regeln = (def: ModuleDefinition) => validateModuleDefinition(def, { setupItemKeys: FOUNDER_SETUP_ITEM_KEYS }).map((issue) => issue.rule);
const mit = (basis: ModuleDefinition, teil: Record<string, unknown>) => ({ ...basis, ...teil }) as ModuleDefinition;

// ---------------------------------------------------------------------------
// Die Validatoren
// ---------------------------------------------------------------------------

test("eine stimmige Vertiefung und ein stimmiges Team-Modul haben keinen Verstoss", () => {
  assert.deepEqual(validateModuleDefinition(gut(), { setupItemKeys: FOUNDER_SETUP_ITEM_KEYS }), []);
  assert.deepEqual(validateModuleDefinition(teamModul(), { setupItemKeys: FOUNDER_SETUP_ITEM_KEYS }), []);
});

test("Scope, Tier, Cadence und Usage muessen gueltig sein", () => {
  assert.ok(regeln(mit(gut(), { scope: "pair" })).includes("scope"));
  assert.ok(regeln(mit(gut(), { tier: "optional" })).includes("tier"));
  assert.ok(regeln(mit(gut(), { cadence: "weekly" })).includes("cadence"));
  assert.ok(regeln(mit(gut(), { usage: "research" })).includes("usage"));
});

test("moduleId ist eindeutig und klein geschrieben", () => {
  assert.ok(regeln(mit(gut(), { moduleId: "Gross" })).includes("module_id"));
  const doppelt = validateModuleRegistry([VENTURE_CORE_MODULE, gut(), { ...gut(), versions: [{ versionId: "v1", instrumentId: "anders-v1", compatGroup: "x" }] }]);
  assert.ok(doppelt.some((issue) => issue.rule === "module_id_unique"));
});

test("versionId ist je Modul eindeutig und immer Pflicht", () => {
  const doppelt = mit(gut(), {
    versions: [
      { versionId: "v1", instrumentId: "a-v1", compatGroup: "g" },
      { versionId: "v1", instrumentId: "a-v2", compatGroup: "g" },
    ],
  });
  assert.ok(regeln(doppelt).includes("version_id"));
  const ohne = mit(gut(), { versions: [{ versionId: "", instrumentId: "a-v1", compatGroup: "g" }] });
  assert.ok(regeln(ohne).includes("version_id"));
  assert.ok(regeln(mit(gut(), { versions: [] })).includes("versions"));
  // dieselbe versionId in zwei VERSCHIEDENEN Modulen ist in Ordnung
  const zwei = validateModuleRegistry([VENTURE_CORE_MODULE, gut(), { ...gut(), moduleId: "zweites", versions: [{ versionId: "v1", instrumentId: "zweites-v1", compatGroup: "z" }] }]);
  assert.deepEqual(zwei, []);
});

test("method und storage sind getrennte Pflichtfelder - nichts folgt automatisch", () => {
  assert.ok(regeln(mit(gut(), { input: { method: "questionnaire", writesTo: "x" } })).includes("input_storage"));
  assert.ok(regeln(mit(gut(), { input: { storage: "assessments", writesTo: "x" } })).includes("input_method"));
  // Ein Fragebogen darf strukturiert gespeichert werden - ohne Instrument.
  const strukturiert = mit(gut(), {
    input: { method: "questionnaire", storage: "structured", writesTo: "eigene_tabelle" },
    versions: [{ versionId: "v1", compatGroup: "g" }],
    sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  });
  assert.equal(regeln(strukturiert).includes("instrument_id"), false);
  // Ein Interview kann in assessments muenden - dann verlangt die Speicherform ein Instrument.
  const interview = mit(gut(), { input: { method: "interview", storage: "assessments", writesTo: "x" }, versions: [{ versionId: "v1", compatGroup: "g" }] });
  assert.ok(regeln(interview).includes("instrument_id"));
  // weitere Methoden: gueltig und nicht die Hauptmethode
  assert.ok(regeln(mit(gut(), { input: { method: "interview", additionalMethods: ["interview"], storage: "assessments", writesTo: "x" } })).includes("input_method"));
});

test("storage = assessments verlangt instrumentId und bindsTo = assessment", () => {
  const ohneInstrument = mit(gut(), { versions: [{ versionId: "v1", compatGroup: "g" }] });
  assert.ok(regeln(ohneInstrument).includes("instrument_id"));
  const falscheBindung = mit(gut(), { sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "round" } });
  assert.ok(regeln(falscheBindung).includes("binds_to"));
});

test("storage = rounds verlangt bindsTo = round, storage = existing verlangt existing_contract", () => {
  assert.ok(regeln(mit(teamModul(), { sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "assessment" } })).includes("binds_to"));
  const bestand = mit(gut(), { input: { method: "interview", storage: "existing", writesTo: "x" }, versions: [{ versionId: "m@1", compatGroup: "g" }] });
  assert.ok(regeln(bestand).includes("binds_to"), "existing mit bindsTo = assessment");
  const stimmig = mit(bestand, { sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" } });
  assert.equal(regeln(stimmig).includes("binds_to"), false);
});

test("Team-Module: storage = rounds, teamView Pflicht, kein profileCard", () => {
  assert.ok(regeln(mit(teamModul(), { input: { method: "rounds", storage: "assessments", writesTo: "x" } })).includes("team_storage"));
  assert.ok(regeln(mit(teamModul(), { renderers: { detail: "/d" } })).includes("team_view"));
  assert.ok(regeln(mit(teamModul(), { renderers: { detail: "/d", teamView: "t", profileCard: "p" } })).includes("team_profile_card"));
});

test("profileCard nur bei passenden Scopes, teamView nur bei Team", () => {
  assert.ok(regeln(mit(gut(), { renderers: { detail: "/d", teamView: "t" } })).includes("team_view"));
  assert.equal(regeln(mit(gut(), { scope: "person" })).includes("team_profile_card"), false);
  assert.ok(regeln(mit(gut(), { renderers: { profileCard: "p" } })).includes("renderer_detail"));
});

test("ein Vergleichs-Renderer braucht einen definierten Compare Contract", () => {
  assert.ok(regeln(mit(gut(), { compare: undefined })).includes("comparison_without_contract"));
  assert.ok(regeln(mit(gut(), { compare: [] })).includes("comparison_without_contract"));
  assert.ok(regeln(mit(gut(), { compare: [{ target: "x", method: "score", stance: "conversation_only" }] })).includes("compare_method"));
  assert.ok(regeln(mit(gut(), { compare: [{ target: "x", method: "equality", stance: "ranking" }] })).includes("compare_stance"));
  // Ohne Vergleichs-Renderer ist ein fehlender Vertrag in Ordnung.
  assert.equal(regeln(mit(gut(), { compare: undefined, renderers: { detail: "/d" } })).includes("comparison_without_contract"), false);
});

test("research_only hat weder Produkt-Renderer noch Handoff noch Vergleich", () => {
  const forschung = mit(gut(), { usage: "research_only" });
  const verstoesse = regeln(forschung);
  assert.ok(verstoesse.includes("research_renderer"));
  assert.ok(verstoesse.includes("research_compare"));
  assert.ok(verstoesse.includes("research_handoff"));
  assert.ok(verstoesse.includes("research_sharing"));
  const sauber = mit(gut(), {
    usage: "research_only",
    compare: undefined,
    setupHandoff: undefined,
    renderers: { detail: "/research" },
    sharing: { ceiling: "owner_only", sensitivity: "standard", bindsTo: "assessment" },
  });
  assert.deepEqual(regeln(sauber).filter((rule) => rule.startsWith("research_")), []);
});

test("ein sensibles Modul teilt hoechstens bestaetigte Aussagen", () => {
  assert.ok(regeln(mit(gut(), { sharing: { ceiling: "answers", sensitivity: "sensitive", bindsTo: "assessment" } })).includes("sensitive_ceiling"));
  assert.equal(regeln(mit(gut(), { sharing: { ceiling: "statements", sensitivity: "sensitive", bindsTo: "assessment" } })).includes("sensitive_ceiling"), false);
});

test("Setup-Handoff-Schluessel muessen im bestehenden Katalog existieren", () => {
  assert.ok(regeln(mit(gut(), { setupHandoff: [{ target: "erfundenes_thema", when: "always" }] })).includes("handoff_target"));
  assert.ok(regeln(mit(gut(), { setupHandoff: [{ target: "equity", when: "sometimes" }] })).includes("handoff_when"));
  // Ohne Katalog in der Umgebung wird der Schluessel nicht geprueft.
  assert.deepEqual(validateModuleDefinition(mit(gut(), { setupHandoff: [{ target: "erfunden", when: "always" }] })).filter((i) => i.rule === "handoff_target"), []);
});

test("Sprachtexte: DE und EN muessen fuer jedes Modul vorhanden sein", () => {
  const fehlt = validateModuleDefinition(gut(), env).filter((issue) => issue.rule === "i18n_messages");
  // `beispiel_vertiefung` hat keine Texte - zweimal Titel, zweimal Zusammenfassung je Sprache.
  assert.equal(fehlt.length, 4);
  assert.deepEqual(moduleMessageKeys("x"), ["x.title", "x.summary"]);
  assert.ok(regeln(mit(gut(), { i18n: { namespace: "" } })).includes("i18n"));
});

test("eine Instrument-ID gehoert hoechstens einem Modul", () => {
  const geteilt = validateModuleRegistry([VENTURE_CORE_MODULE, gut(), { ...gut(), moduleId: "zweites" }]);
  assert.ok(geteilt.some((issue) => issue.rule === "instrument_id_unique"));
});

test("assertModuleRegistry nennt alle Verstoesse und wirft", () => {
  assert.throws(() => assertModuleRegistry([mit(gut(), { scope: "pair", tier: "x" })]), /module_registry_invalid[\s\S]*scope[\s\S]*tier/);
});

// ---------------------------------------------------------------------------
// Die Registry der fuenf Bestandsmodule
// ---------------------------------------------------------------------------

test("registriert sind die fuenf Bestandsmodule und das erste native Modul", () => {
  assert.deepEqual(MODULE_REGISTRY.map((def) => def.moduleId), [
    "workstyle", "strengths", "capability", "direction", "venture_core", "venture_tradeoffs",
  ]);
  assert.deepEqual(MODULE_DEFINITIONS.map((def) => def.moduleId), MODULE_REGISTRY.map((def) => def.moduleId));
  // Genau ein Modul ist nativ - alle anderen sind Bestandsadapter.
  assert.deepEqual(MODULE_REGISTRY.filter((def) => !def.legacyAdapter).map((def) => def.moduleId), ["venture_tradeoffs"]);
});

test("die Registry erfuellt den Contract - mit echtem Setup-Katalog und echten Sprachtexten", () => {
  assert.deepEqual(validateModuleRegistry(MODULE_REGISTRY, env), []);
});

test("Scope und Tier der Bestandsmodule", () => {
  for (const def of [WORKSTYLE_MODULE, STRENGTHS_MODULE, CAPABILITY_MODULE, DIRECTION_MODULE]) {
    assert.equal(def.scope, "person", def.moduleId);
    assert.equal(def.tier, "core", def.moduleId);
    assert.equal(def.usage, "product", def.moduleId);
  }
  assert.equal(VENTURE_CORE_MODULE.scope, "person_in_venture");
  assert.equal(VENTURE_CORE_MODULE.tier, "core");
});

test("storage ist der Antwortspeicher, bindsTo der Freigabevertrag - beides getrennt", () => {
  // Workstyle und Venture v1 liegen in assessments (mit Instrument), Strengths, Capability und Direction haben eigene Tabellen.
  for (const def of [WORKSTYLE_MODULE, VENTURE_CORE_MODULE]) {
    assert.equal(def.input.storage, "assessments", def.moduleId);
    assert.ok(def.versions.every((v) => v.instrumentId), `${def.moduleId}: storage = assessments verlangt die Instrument-ID`);
  }
  for (const def of [STRENGTHS_MODULE, CAPABILITY_MODULE, DIRECTION_MODULE]) {
    assert.equal(def.input.storage, "existing", def.moduleId);
  }
  // Die Bestandsmodule teilen nach ihrem bestehenden Vertrag und sind ausdruecklich als bestehende Adapter markiert.
  for (const def of MODULE_REGISTRY.filter((candidate) => candidate.moduleId !== "venture_tradeoffs")) {
    assert.equal(def.sharing.bindsTo, "existing_contract", def.moduleId);
    assert.equal(def.legacyAdapter, true, def.moduleId);
  }
  // Das native Modul: eigenes Instrument in assessments, Freigabe (spaeter) an den Durchlauf, KEIN Bestandsmarker.
  assert.equal(VENTURE_TRADEOFFS_MODULE.input.storage, "assessments");
  assert.equal(VENTURE_TRADEOFFS_MODULE.sharing.bindsTo, "assessment");
  assert.equal(VENTURE_TRADEOFFS_MODULE.legacyAdapter, undefined);
  assert.equal(VENTURE_TRADEOFFS_MODULE.versions[0]?.instrumentId, "venture-tradeoffs-v1");
});

test("bindsTo = existing_contract bei assessments gilt nur mit dem Marker legacyAdapter - nie geraten", () => {
  // Natives Modul: teilt an den Durchlauf.
  const nativ = mit(gut(), { sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" } });
  assert.ok(regeln(nativ).includes("binds_to"), "ein natives Modul mit assessments darf nicht existing_contract verwenden");
  assert.deepEqual(regeln(gut()), []);

  // Bestehender Adapter in assessments: darf seinen eigenen Vertrag behalten.
  const adapter = mit(gut(), { legacyAdapter: true, sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" } });
  assert.deepEqual(regeln(adapter), []);

  // Der Marker erlaubt nur existing_contract - er ist kein Freibrief fuer assessment-Bindung.
  assert.ok(regeln(mit(gut(), { legacyAdapter: true })).includes("legacy_adapter_binds_to"));
  assert.ok(regeln(mit(gut(), { legacyAdapter: false })).includes("legacy_adapter"));

  // Die Instrument-Pflicht bleibt: ein Adapter in assessments hat trotzdem ein Instrument.
  const ohneInstrument = mit(adapter, { versions: [{ versionId: "v1", compatGroup: "g" }] });
  assert.ok(regeln(ohneInstrument).includes("instrument_id"));

  // rounds und existing bleiben unveraendert streng, auch mit Marker.
  assert.ok(regeln(mit(teamModul(), { legacyAdapter: true, sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" } })).includes("binds_to"));
  const bestandOhneMarker = mit(gut(), { input: { method: "interview", storage: "existing", writesTo: "x" }, versions: [{ versionId: "m@1", compatGroup: "g" }], sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "assessment" } });
  assert.ok(regeln(bestandOhneMarker).includes("binds_to"));
});

test("Modul ist nicht Instrument: Strengths, Capability und Direction haben keine instrumentId", () => {
  for (const def of [STRENGTHS_MODULE, CAPABILITY_MODULE, DIRECTION_MODULE]) {
    assert.ok(def.versions.length > 0);
    for (const version of def.versions) {
      assert.equal(version.instrumentId, undefined, def.moduleId);
      assert.match(version.versionId, new RegExp(`^${def.moduleId}@\\d+$`));
    }
    assert.ok(def.input.additionalMethods?.includes("manual"), `${def.moduleId} entsteht auch manuell`);
    assert.equal(def.input.method, "interview");
  }
});

test("Workstyle und Venture tragen ihre echte Instrument-Version", () => {
  assert.equal(getModuleVersion("workstyle", CURRENT_WORKSTYLE_VERSION)?.instrumentId, CURRENT_WORKSTYLE_INSTRUMENT);
  assert.equal(findVersionOfInstrument("workstyle", CURRENT_WORKSTYLE_INSTRUMENT)?.versionId, CURRENT_WORKSTYLE_VERSION);
  assert.equal(findVersionOfInstrument("venture_core", "venture-alignment-v1")?.versionId, "venture-alignment-v1");
  assert.equal(findVersionOfInstrument("venture_core", "venture-alignment-v2"), null, "v2 gibt es noch nicht");
  assert.equal(getModuleDefinition("gibt_es_nicht"), null);
});

test("die Bestandsmodule behaupten keinen Vergleichsvertrag und keine Team-Sicht", () => {
  for (const def of MODULE_REGISTRY.filter((candidate) => candidate.legacyAdapter)) {
    assert.equal(def.compare, undefined, `${def.moduleId}: Compare Contracts folgen in Phase E und F`);
    assert.equal(def.renderers.comparison, undefined, def.moduleId);
    assert.equal(def.renderers.teamView, undefined, def.moduleId);
  }
  // Das native Modul hat seit Phase E einen Vergleichs-Renderer - aber keine `teamView`: Das ist Team-Modulen
  // vorbehalten, dies ist eine Person-Vertiefung (sonst wuerde sie auch nie als Profilkarte erscheinen).
  assert.equal(VENTURE_TRADEOFFS_MODULE.renderers.comparison, "/teams/[teamId]/zielkonflikte");
  assert.equal(VENTURE_TRADEOFFS_MODULE.renderers.teamView, undefined);
  assert.deepEqual(VENTURE_TRADEOFFS_MODULE.compare?.map((rule) => [rule.method, rule.stance]).flat(), [
    "path_and_weights", "conversation_only", "path_and_weights", "conversation_only",
    "path_and_weights", "conversation_only", "path_and_weights", "conversation_only",
  ]);
});

test("Renderer-Verweise zeigen auf Routen und Profilabschnitte, die es gibt", () => {
  const route = (path: string) => {
    const pfad = path.split("?")[0]!;
    return existsSync(`src/app${pfad}/page.tsx`) || existsSync(`src/app/(product)${pfad}/page.tsx`);
  };
  const profil = read("src/app/me/profile/page.tsx");
  const sectionIds = profil.match(/type SectionId =([\s\S]*?);/)?.[1] ?? "";
  for (const def of MODULE_REGISTRY) {
    assert.ok(route(def.renderers.detail), `${def.moduleId}: ${def.renderers.detail} existiert nicht`);
    const card = def.renderers.profileCard;
    assert.ok(card?.startsWith("me-profile:"), def.moduleId);
    const id = card!.slice("me-profile:".length);
    assert.ok(sectionIds.includes(`"${id}"`), `${def.moduleId}: Abschnitt ${id} fehlt auf /me/profile`);
  }
});

test("Setup-Handoffs der Bestandsmodule entsprechen dem, was das Produkt heute verlinkt", () => {
  // Workstyle: ein Link je Arbeitsbereich im Teambericht.
  const heute = new Set(AREAS.map((area) => workstyleSetupHandoff(area.key)?.topic).filter(Boolean));
  assert.deepEqual(new Set(WORKSTYLE_MODULE.setupHandoff?.map((h) => h.target)), heute);

  // Venture Alignment: Abschnittslinks auf der Paarvergleichsseite (alle Phasen).
  const venture = new Set(deepDiveLinks("venture_alignment", "existing_team").map((link) => link.itemKey));
  assert.deepEqual(new Set(VENTURE_CORE_MODULE.setupHandoff?.map((h) => h.target)), venture);

  // Strengths, Capability, Direction: heute kein Handoff - die Registry erfindet keinen.
  for (const def of [STRENGTHS_MODULE, CAPABILITY_MODULE, DIRECTION_MODULE]) {
    assert.equal(def.setupHandoff, undefined, def.moduleId);
  }
});

test("die Sprachtexte der Module sind in DE und EN paritaetisch und ohne Wertung", () => {
  const de = messages("de");
  const en = messages("en");
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const moduleId of Object.keys(de)) {
    assert.deepEqual(Object.keys(de[moduleId]!).sort(), Object.keys(en[moduleId]!).sort(), moduleId);
    for (const text of [...Object.values(de[moduleId]!), ...Object.values(en[moduleId]!)]) {
      assert.doesNotMatch(text, /%|score|prozent|percent|typ\b|ranking|kompatib|compatib/i, `${moduleId}: ${text}`);
    }
  }
});
