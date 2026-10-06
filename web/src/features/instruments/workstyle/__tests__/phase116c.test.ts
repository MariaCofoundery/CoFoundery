import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { RESEARCH_SETS, RESEARCH_SET_VERSION, REVISED_RESEARCH_ITEMS, researchSetItems, workstyleV3Item } from "@/features/instruments/workstyle/researchSets";
import { parseWorkstyleV3Answer } from "@/features/instruments/workstyle/answers";
import { WORKSTYLE_PRETEST_V3 } from "@/features/instruments/workstyle/registry";

/**
 * Phase 11.6C - 29 Core + optional 8 Entwicklungsfragen (Set A oder B), gemischt.
 * Zuteilung, Reihenfolge und Abschluss pruefen die pgTAP-Tests in
 * supabase/tests/workstyle_research_wave1.sql.
 */

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const MIGRATION = "../supabase/migrations/20261118140000_workstyle_research_wave1.sql";
const FLOW = "src/features/instruments/workstyle/WorkstyleProfileFlow.tsx";
const SPEC = JSON.parse(src("docs/founder-workstyle-research-sets-1.0.0.json"));

test("Sets exakt wie beschlossen, nur ORG-06 als Anchor", () => {
  assert.equal(RESEARCH_SET_VERSION, "research-sets/1.0.0");
  assert.deepEqual([...RESEARCH_SETS.A], ["ORG-06", "EXP-05", "EVI-R1", "AMB-06", "EL-03r", "VOICE-R1", "ORG-05", "DEC-02"]);
  assert.deepEqual([...RESEARCH_SETS.B], ["ORG-06", "EXP-R1", "VOICE-06", "AMB-03", "EVI-04r", "EL-06r", "AMB-R1", "FS-R2"]);
  assert.deepEqual(RESEARCH_SETS.A.filter(key => RESEARCH_SETS.B.includes(key)), ["ORG-06"]);
  for (const set of ["A", "B"] as const) assert.ok(researchSetItems(set).every(item => item.usage === "research_only" && item.product_status === "excluded"));
});

test("Set-Datei, Migration und Code stimmen ueberein", () => {
  const sql = src(MIGRATION);
  for (const set of ["A", "B"] as const) assert.match(sql, new RegExp(`when '${set}' then array\\['${SPEC.sets[set].join("','")}'\\]`));
  // Die ueberarbeiteten Items stehen byte-genau als Definition in der Migration.
  for (const item of SPEC.revised_items) assert.ok(sql.includes(`'${JSON.stringify(item)}'::jsonb`), item.item_key);
  assert.deepEqual(REVISED_RESEARCH_ITEMS.map(item => item.item_key), ["EVI-04r", "EL-03r", "EL-06r"]);
});

test("Ueberarbeitete Items: eigene Schluessel, Original bleibt, Konstrukt und Format gleich", () => {
  for (const item of SPEC.revised_items) {
    const original = WORKSTYLE_PRETEST_V3.items.find(candidate => candidate.item_key === item.revision_of)!;
    assert.ok(original, item.revision_of);
    assert.equal(item.area_key, original.area_key);
    assert.equal(item.construct, original.construct);
    assert.equal(item.response_format, original.response_format);
    assert.notEqual(item.prompt, original.prompt);
    assert.equal(WORKSTYLE_PRETEST_V3.items.some(candidate => candidate.item_key === item.item_key), false, "nicht im Core-Manifest");
  }
  // EL-03r: vier klar unterschiedliche naechste Schritte, ohne die EVI-nahe Ursachen-Option.
  assert.equal(workstyleV3Item("EL-03r")!.options!.length, 4);
  assert.doesNotMatch(JSON.stringify(workstyleV3Item("EL-03r")), /wodurch es entstanden/);
  assert.equal(workstyleV3Item("EVI-04r")!.options!.length, 5);
  assert.match(workstyleV3Item("EL-06r")!.prompt, /was du beim nächsten Versuch gezielt anders prüfst/);
  // Antworten auf ueberarbeitete Items werden wie alle anderen geprueft.
  assert.equal(parseWorkstyleV3Answer("EL-03r", "8.4-v0.4", { response_value: null, response_option: "D", missing_reason: null, rendered_order: null }).response_option, "D");
  assert.throws(() => parseWorkstyleV3Answer("EL-03r", "8.4-v0.4", { response_value: null, response_option: "E", missing_reason: null, rendered_order: null }));
});

test("Core-Manifest und Core-Items unveraendert", () => {
  // Nur Anweisungen ausserhalb von Funktionsruempfen: keine Datenaenderung an Core, Freigaben oder Instrumenten.
  const sql = code(MIGRATION).replace(/\$\$[\s\S]*?\$\$/g, " ");
  assert.doesNotMatch(sql, /manifest_version\s*=\s*'3\.[1-9]|update public\.workstyle_item_versions|delete from public\.workstyle_item_versions/i);
  assert.doesNotMatch(sql, /insert into public\.(alignment_shares|alignment_answers|instruments)/i);
  for (const item of SPEC.revised_items) assert.equal(item.usage, "research_only");
  assert.equal(WORKSTYLE_PRETEST_V3.items.length, 52);
});

test("Einstieg: warm, faire Wahl zwischen 29 und 37, nichts vorausgewaehlt", () => {
  const flow = code(FLOW);
  assert.match(flow, /Mach’s dir kurz bequem\./);
  assert.match(flow, /nicht so, wie es ideal klingen würde/);
  assert.match(flow, /Dein Arbeitsprofil basiert auf \{coreItems\.length\} Situationen\./);
  assert.match(flow, /die zusätzlichen Fragen werden ganz normal zwischen die anderen gemischt/);
  assert.match(flow, /\["profile", "Nur mein Arbeitsprofil"/);
  assert.match(flow, /\["research", "Ja, ich unterstütze die Weiterentwicklung"/);
  assert.match(flow, /useState<"profile" \| "research" \| null>\(null\)/);
  assert.match(flow, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(flow, /disabled=\{pending \|\| !choice \|\| \(choice === "research" && !consent\)\}/);
  // Beide Wege sehen gleich aus: eine Karte je Weg, derselbe Startknopf.
  assert.equal((flow.match(/Los geht’s/g) ?? []).length, 1);
});

test("Ein gemeinsamer Fragebogen: gespeicherte Reihenfolge, keine Forschungsmarkierung, kein Zufall im Client", () => {
  const flow = code(FLOW);
  assert.match(flow, /return order && order\.some\(isCore\) \? order : coreItems;/);
  assert.doesNotMatch(flow, /Forschungsfrage/);
  assert.doesNotMatch(flow + code("src/features/instruments/workstyle/researchSets.ts"), /Math\.random|shuffle|sort\(\(\) =>/);
});

test("Abschluss 37 und Zwischenstand bei offenen Entwicklungsfragen", () => {
  const flow = code(FLOW);
  assert.match(flow, /Geschafft – danke\./);
  assert.match(flow, /Dein Arbeitsprofil ist fertig, und du hast uns zusätzlich bei der Weiterentwicklung unterstützt\./);
  assert.match(flow, /Deine \{DEVELOPMENT_COUNT\} Entwicklungsantworten verändern deinen aktuellen Report nicht\./);
  assert.match(flow, /Dein Arbeitsprofil ist fertig\./);
  assert.match(flow, /freiwillige Entwicklungsfragen offen/);
  // Der Abschluss erscheint erst, wenn der gewaehlte Ablauf zu Ende ist.
  assert.match(flow, /profileDone && openInFlow === 0 &&/);
  assert.match(flow, /openInFlow > 0 && \(!profileDone \|\| continuing\)/);
});

test("Migrationsreihenfolge: Workbook-Migration bereits remote, drei DB-first-Migrationen danach", () => {
  // 20261117120000 ist remote angewendet (Release-Preflight); die Umbenennung aus 11.6C ist rueckgaengig gemacht.
  const files = readdirSync("../supabase/migrations").sort();
  assert.ok(existsSync("../supabase/migrations/20261117120000_retire_active_workbook_writes.sql"));
  assert.equal(files.filter(file => file.includes("retire_active_workbook_writes")).length, 1);
  // Phase 11.7B: danach die Teamfreigabe-Migration. Phase 12C.0/0b: Einladungsannahme nur nach Entscheidung.
  const pending = ["20261118120000_workstyle_team_mutual_readiness.sql", "20261118130000_workstyle_product_core_completion.sql", "20261118140000_workstyle_research_wave1.sql", "20261119120000_team_shares_and_leave.sql", "20261119130000_team_share_scope_corrections.sql", "20261120120000_invitation_acceptance_by_decision.sql", "20261120130000_advisor_invite_consent.sql", "20261121120000_advisor_access_integrity.sql", "20261122120000_team_org_lifecycle.sql"];
  assert.deepEqual(files.slice(files.indexOf("20261117120000_retire_active_workbook_writes.sql") + 1), pending);
});
