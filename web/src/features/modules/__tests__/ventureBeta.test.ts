import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { REGISTRIES, VENTURE_ALIGNMENT } from "@/features/instruments/align/registries";
import { INSTRUMENT_IDS } from "@/features/instruments/instruments";
import { validateAnswerV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";
import { VENTURE_CORE_BETA_MODULE } from "@/features/modules/definitions";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import { validateModuleRegistry } from "@/features/modules/validate";
import { COMPARE_RULES } from "@/features/modules/ventureBeta/compareConfig";
import { BETA_ITEM_HANDOFFS } from "@/features/modules/ventureBeta/handoff";
import {
  BETA_BLOCKS,
  BETA_CORE_ITEM_IDS,
  BETA_PRIVATE_BLOCK_IDS,
  BETA_REPORT_GROUPS,
  betaItems,
  findBetaItem,
  VENTURE_ALIGNMENT_BETA,
} from "@/features/modules/ventureBeta/registry";

/**
 * Venture Alignment v2 (Beta 1): Instrument, Registry, Gate, Texte.
 *
 * Die Beta ist ein ECHTES Assessment (pgTAP: `venture_alignment_v2_beta.sql`). Hier steht, was die
 * Anwendung daraus macht: die 19 Items mit den zuletzt korrigierten Fassungen, die Exklusivoptionen, die
 * Texte in beiden Sprachen und dass nirgends ein Score, eine Ampel oder ein „x von y" auftaucht.
 */
const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const BETA_DIR = join("src", "features", "modules", "ventureBeta");
const MIGRATION = join("..", "supabase", "migrations", "20261207120000_assessment_share_instruments.sql");

const item = (id: string) => findBetaItem(id)!;
const sample = (id: string): AlignmentAnswerV21 => {
  const it = item(id);
  const first = it.options.find((o) => !o.exclusive) ?? it.options[0];
  switch (it.answerFormat) {
    case "single_choice":
    case "ordinal_choice":
      return { blockId: id, value: { optionId: it.options[0]!.optionId, ...(it.options[0]!.requiresDate ? { date: "2027-03-01" } : {}) } };
    case "multi_choice":
      return { blockId: id, value: { optionIds: [first!.optionId], ...(first!.requiresText ? { texts: { [first!.optionId]: "x" } } : {}) } };
    case "number_range":
      return { blockId: id, value: { number: 10, unit: it.unit ?? "Stunden pro Woche" } };
    default:
      return { blockId: id, value: { amount: 1500, currency: "EUR" } };
  }
};

test("Instrument: eigene ID, nur mit sich selbst vergleichbar, v1 bleibt unberuehrt", () => {
  assert.ok((INSTRUMENT_IDS as readonly string[]).includes("venture-alignment-v2-beta1"));
  assert.equal(VENTURE_ALIGNMENT_BETA.instrumentId, "venture-alignment-v2-beta1");
  // NICHT die endgueltige ID.
  assert.ok(!(INSTRUMENT_IDS as readonly string[]).includes("venture-alignment-v2"));
  // Die Beta steht nicht in `REGISTRIES` (kein Leser ueber den Scope sieht sie), v1 ist unveraendert.
  assert.deepEqual(Object.values(REGISTRIES).map((r) => r.instrumentId).sort(), ["founder-profile-v1", "venture-alignment-v1"]);
  assert.equal(VENTURE_ALIGNMENT.items.length, 43);
  assert.ok(VENTURE_ALIGNMENT.items.every((i) => !BETA_CORE_ITEM_IDS.includes(i.itemId as never)));
  // Das Modul: nativ, nur mit sich selbst vergleichbar (eine Version, eine Kompatibilitaetsgruppe).
  assert.deepEqual(VENTURE_CORE_BETA_MODULE.versions.map((v) => v.compatGroup), ["venture-alignment-v2-beta1"]);
  assert.equal(VENTURE_CORE_BETA_MODULE.sharing.bindsTo, "assessment");
  assert.equal(VENTURE_CORE_BETA_MODULE.legacyAdapter, undefined);
  assert.deepEqual(validateModuleRegistry(MODULE_REGISTRY).filter(Boolean), []);
});

test("alle 19 Core-Items und zwei private Felder; IDs passen in die Datenbank-Spalte", () => {
  assert.equal(BETA_CORE_ITEM_IDS.length, 19);
  assert.deepEqual(betaItems().map((i) => i.itemId).filter((id) => !(BETA_PRIVATE_BLOCK_IDS as readonly string[]).includes(id)), [...BETA_CORE_ITEM_IDS]);
  for (const i of betaItems()) {
    // alignment_answers_block_shape
    assert.match(i.itemId, /^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$/, i.itemId);
    for (const o of i.options) assert.match(o.optionId, new RegExp(`^${i.itemId}_o\\d+$`));
  }
  // Jedes Item nimmt eine gueltige Antwort an.
  for (const i of betaItems()) assert.deepEqual(validateAnswerV21(sample(i.itemId), answerableOf(i)), { ok: true }, i.itemId);
  // Die Blocke und die Report-Gruppen decken genau die 19 ab - jedes Item in genau einem Block.
  const blocks = BETA_BLOCKS.flatMap((b) => [...b.itemIds]);
  assert.deepEqual([...blocks].sort(), [...BETA_CORE_ITEM_IDS].sort());
  assert.equal(BETA_BLOCKS.length, 8);
  const groups = BETA_REPORT_GROUPS.flatMap((g) => [...g.itemIds]);
  assert.deepEqual([...groups].sort(), [...BETA_CORE_ITEM_IDS].sort());
  assert.equal(BETA_REPORT_GROUPS.length, 5);
});

test("Datenbank-Allowlist und Registry sind dieselbe Liste (keine zwei Wahrheiten)", () => {
  const sql = read(MIGRATION);
  const arrays = [...sql.matchAll(/array\[([^\]]+)\]/g)].map((m) => [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!));
  // Reihenfolge im Seed: tradeoffs (3), beta (required, allowed, visible)
  const beta = arrays.slice(3, 6);
  assert.deepEqual(beta[0], [...BETA_CORE_ITEM_IDS], "Pflichtbloecke");
  assert.deepEqual(beta[1], [...BETA_CORE_ITEM_IDS, ...BETA_PRIVATE_BLOCK_IDS], "erlaubte Bloecke");
  assert.deepEqual(beta[2], [...BETA_CORE_ITEM_IDS], "team-sichtbar: die privaten Felder fehlen absichtlich");
  assert.ok(!(beta[2] as string[]).includes("M01p") && !(beta[2] as string[]).includes("M02p"));
});

test("zuletzt korrigierte Fassungen: ZC03, EN03, TQ01, ZB01, GR02-B", () => {
  // C03 (ZC03): „bereits Haupttaetigkeit" und „aktuell nicht geplant" exklusiv, 2-6 kombinierbar.
  const c03 = item("C03");
  assert.deepEqual(c03.options.filter((o) => o.exclusive).map((o) => o.optionId), ["C03_o1", "C03_o7"]);
  const ans = (ids: string[]) => validateAnswerV21({ blockId: "C03", value: { optionIds: ids } }, answerableOf(c03));
  assert.equal(ans(["C03_o2", "C03_o3", "C03_o5"]).ok, true);
  assert.equal(ans(["C03_o1"]).ok, true);
  assert.equal(ans(["C03_o7"]).ok, true);
  assert.equal(ans(["C03_o1", "C03_o2"]).ok, false);
  assert.equal(ans(["C03_o7", "C03_o3"]).ok, false);
  assert.equal(ans(["C03_o1", "C03_o7"]).ok, false);
  // E03 (EN03): „Keine davon" exklusiv.
  const e03 = item("E03");
  assert.deepEqual(e03.options.filter((o) => o.exclusive).map((o) => o.label), ["Keine davon"]);
  assert.equal(validateAnswerV21({ blockId: "E03", value: { optionIds: ["E03_o7", "E03_o1"] } }, answerableOf(e03)).ok, false);
  assert.equal(validateAnswerV21({ blockId: "E03", value: { optionIds: ["E03_o7"] } }, answerableOf(e03)).ok, true);
  assert.equal(alignmentDisplayText("Keine davon", "en"), "None of these");
  // T01: nur Startgeschwindigkeit/Vorbereitungsdauer - kein anderes Konstrukt in den Optionen.
  const t01 = item("T01").options.map((o) => o.label).join(" | ");
  assert.doesNotMatch(t01, /abstimm|gemeinsam|Entscheidungsrecht|Risiko|rückgängig/i);
  assert.equal(item("T01").options.length, 4);
  assert.doesNotMatch(item("T02").options.map((o) => o.label).join(" | "), /hängt davon ab/);
  // Z01: vier parallele Bilder plus „noch kein klares Bild"; keine Fremdkonstrukte.
  const z01 = item("Z01").options.map((o) => o.label);
  assert.equal(z01.length, 5);
  assert.equal(z01[4], "Ich habe dazu noch kein klares Bild");
  assert.doesNotMatch(z01.join(" | "), /eigener Kraft|führend|Finanzierung|Experiment|begrenzt/i);
  // M02 (GR02, Variante B): neutrale Euro-Baender, keine wertenden Groessenlabels.
  const m02 = item("M02").options.map((o) => o.label);
  assert.deepEqual(m02, ["Kein zusätzliches eigenes Geld", "Bis 2.000 €", "Über 2.000 € bis 10.000 €", "Über 10.000 € bis 50.000 €", "Über 50.000 €"]);
  assert.doesNotMatch(m02.join(" "), /klein|spürbar|größer|groß/i);
  // Z02 und O01: bis zu zwei.
  for (const id of ["Z02", "O01"]) assert.equal(item(id).maxChoices, 2);
  assert.equal(validateAnswerV21({ blockId: "Z02", value: { optionIds: ["Z02_o1", "Z02_o2", "Z02_o3"] } }, answerableOf(item("Z02"))).ok, false);
});

test("GR01/GR02: Zeitpunkt und Band sind Core, die Betraege private Zusatzfelder (nur nach der passenden Antwort)", () => {
  assert.deepEqual(item("M01").options.map((o) => o.label), ["Ab sofort", "Ab einem Datum", "Innerhalb der nächsten zwölf Monate voraussichtlich nicht"]);
  assert.equal(item("M01").options[1]!.requiresDate, true);
  for (const [priv, base, opts] of [["M01p", "M01", ["M01_o1", "M01_o2"]], ["M02p", "M02", ["M02_o2", "M02_o3", "M02_o4", "M02_o5"]]] as const) {
    const it = item(priv);
    assert.equal(it.answerFormat, "money_range");
    assert.equal(it.showAfter, base);
    assert.deepEqual(it.showAfterOptions, [...opts]);
    assert.match(it.prompt, /nur für dich/i);
    assert.match(it.prompt, /nie im Teamvergleich/i);
  }
  assert.equal(item("M03").unit, "Monate");
  assert.match(item("M03").prompt, /größere neue finanzielle Verpflichtung/);
});

test("DE/EN: jeder Text der Registry hat eine englische Fassung; Sprachbundles haben dieselben Schluessel", () => {
  const strings = new Set<string>();
  for (const i of betaItems()) {
    [i.prompt, i.hint, i.unit, i.section, i.shortLabel, ...i.options.map((o) => o.label), ...i.missing.map((m) => m.label)].forEach((s) => s && strings.add(s));
  }
  const untranslated = [...strings].filter((s) => alignmentDisplayText(s, "en") === s);
  assert.deepEqual(untranslated, []);

  const keys = (o: unknown, p = ""): string[] =>
    Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const de = JSON.parse(read("messages/de/ventureBeta.json"));
  const en = JSON.parse(read("messages/en/ventureBeta.json"));
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  for (const loc of [de, en]) {
    for (const id of [...BETA_CORE_ITEM_IDS, ...BETA_PRIVATE_BLOCK_IDS] as string[]) assert.ok(loc.summary[id], `summary.${id}`);
    for (const id of BETA_CORE_ITEM_IDS as readonly string[]) assert.ok(loc.report.itemShort[id], `report.itemShort.${id}`);
  }
  assert.deepEqual(keys(JSON.parse(read("messages/de/modules.json"))).sort(), keys(JSON.parse(read("messages/en/modules.json"))).sort());
});

test("kein Score, keine Prozente, kein Match, keine Ampel, kein „x von y\" - in keinem Text der Beta", () => {
  const forbidden = /score|prozent|percent|%|ampel|traffic|match|ranking|rang\b|gewinner|winner|risikoindex|kompatibel|compatib|\d+\s+(von|of)\s+\d+/i;
  for (const loc of ["de", "en"]) {
    const text = read(`messages/${loc}/ventureBeta.json`)
      // Die ausdrueckliche Verneinung („bewertet nicht, wie gut ihr zusammenpasst") ist die Abgrenzung, keine Wertung.
      .replace(/(bewertet nicht[^"]*|does not assess[^"]*)/g, "");
    assert.doesNotMatch(text, forbidden, loc);
  }
  for (const file of walk(BETA_DIR).concat(walk(join("src", "features", "modules", "ui")).filter((f) => /Beta/.test(f)))) {
    assert.doesNotMatch(code(file), /\bscore\b|percent|ampel|trafficLight|matchPercent|\brank\(|compatibilityIndex/i, file);
  }
  for (const i of betaItems()) assert.doesNotMatch([i.prompt, ...i.options.map((o) => o.label)].join(" "), /%/, i.itemId);
});

test("Kein Feature-Schalter mehr: die Beta ist fuer alle Angemeldeten sichtbar, Zugang regelt BETA_ACCESS_CODES", () => {
  assert.equal(existsSync(join(BETA_DIR, "gate.ts")), false);
  const all = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
  for (const file of all) {
    assert.doesNotMatch(read(file), /VENTURE_ALIGNMENT_V2_BETA|isVentureBetaEnabled/, file);
  }
  // Die Seiten bleiben angemeldet erreichbar.
  for (const page of [
    join("src", "app", "(product)", "founder-alignment", "vorhaben", "beta", "page.tsx"),
    join("src", "app", "(product)", "teams", "[teamId]", "vorhaben-beta", "page.tsx"),
  ]) {
    assert.match(code(page), /redirect\(/, page);
  }
});

test("Setup-Handoffs: nur bestehende Themen, nur Verweise - keine Antwort wird zur Vereinbarung", () => {
  for (const [itemId, handoffs] of Object.entries(BETA_ITEM_HANDOFFS)) {
    assert.ok((BETA_CORE_ITEM_IDS as readonly string[]).includes(itemId), itemId);
    for (const h of handoffs) assert.ok((FOUNDER_SETUP_ITEM_KEYS as readonly string[]).includes(h.target), `${itemId}: ${h.target}`);
  }
  // Das Modul deklariert dieselben Ziele.
  assert.ok(VENTURE_CORE_BETA_MODULE.setupHandoff!.length >= 8);
  for (const target of ["time_commitment", "decision_rights", "communication", "compensation", "equity", "founder_exit", "changing_commitment", "contributions_expenses"]) {
    assert.ok(VENTURE_CORE_BETA_MODULE.setupHandoff!.some((h) => h.target === target), target);
  }
  // Der Report verlinkt nur („Im Founder Setup vereinbaren"), er schreibt nichts.
  const report = code(join("src", "features", "modules", "ui", "BetaTeamReport.tsx"));
  assert.match(report, /report\.setupCta/);
  assert.doesNotMatch(report, /\.(insert|update|upsert|delete)\(|\.rpc\(|from\(/);
});

test("Vergleichsregeln: jedes der 19 Items hat genau eine Regel, an EINER Stelle", () => {
  assert.deepEqual(Object.keys(COMPARE_RULES).sort(), [...BETA_CORE_ITEM_IDS].sort());
  // Die Modulbeschreibung leitet ihren Vertrag aus derselben Datei ab - keine zweite Liste.
  assert.deepEqual(VENTURE_CORE_BETA_MODULE.compare!.map((r) => r.target).sort(), [...BETA_CORE_ITEM_IDS].sort());
  // Keine Schwellen ausserhalb der Konfiguration.
  for (const file of [join(BETA_DIR, "compare.ts"), join("src", "features", "modules", "ui", "BetaTeamReport.tsx")]) {
    assert.doesNotMatch(code(file), /minDistance:\s*\d|>=\s*[3-9]\b.*months|distance\s*>=\s*\d/i, file);
  }
});
