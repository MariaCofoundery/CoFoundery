import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { CURRENT_WORKSTYLE_INSTRUMENT, CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import {
  capabilityAdapter,
  directionAdapter,
  getModuleAdapter,
  MODULE_ADAPTERS,
  strengthsAdapter,
  ventureCoreAdapter,
  workstyleAdapter,
} from "@/features/modules/adapters";
import { loadModuleContext } from "@/features/modules/loadModuleContext";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import {
  LEGACY_UNVERSIONED,
  ModuleContextError,
  type AssessmentRow,
  type ModuleAdapter,
  type ModuleContext,
  type ModuleState,
} from "@/features/modules/types";
import {
  buildAboutYou,
  stationStatus,
  type AboutYouFacts,
  type StepId,
  type StepStatus,
} from "@/features/profile/aboutYou";
import { parseTeamReadiness } from "@/features/reporting/workstyle/teamReadiness";
import { eqOf, fakeClient } from "@/features/modules/__tests__/fakeClient";

/**
 * Phase B: Die Adapter geben wieder, was das Produkt heute sagt - nicht mehr.
 *
 * Jeder Adapter wird gegen die BESTEHENDE Produktlogik geprueft:
 *   - Person-Module gegen `buildAboutYou` (die Logik von `/profile`),
 *   - Venture gegen die Regel der Teamseite (`loadTeamJourneyStatus`; die Datei
 *     ist eine TSX und im Test nicht ladbar - ihre Regel steht deshalb als
 *     Referenz unten und ihr QUELLTEXT wird festgenagelt),
 *   - Freigaben gegen die bestehenden Leser.
 * Wer die Produktlogik aendert, bricht diese Tests - und muss die Adapter
 * bewusst nachziehen.
 */

const read = (path: string) => readFileSync(path, "utf8");
const user = { id: "u-1" };

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const leer: AboutYouFacts = {
  identityGaps: 3,
  identityTouched: false,
  workAnswers: 0,
  workSubmitted: false,
  interviewStarted: false,
  interviewCompleted: false,
  unsortedAnswers: 0,
  areaCount: 0,
  levelledCount: 0,
  wishedCount: 0,
  strengthCount: 0,
  directionAnswers: 0,
  directionStatements: 0,
  confirmedResources: 0,
  pendingResources: 0,
  marks: new Set<string>(),
};
const mit = (teil: Partial<AboutYouFacts>): AboutYouFacts => ({ ...leer, ...teil });
const ctx = (personFacts: AboutYouFacts, rest: Partial<ModuleContext> = {}): ModuleContext => ({ personFacts, ...rest });

/** Was das Produkt zu einem Schritt sagt - unabhaengig vom Adapter gelesen. */
const produktSchritt = (facts: AboutYouFacts, id: StepId): StepStatus =>
  buildAboutYou(facts).flatMap((station) => station.steps).find((step) => step.id === id)!.status;

const zustand: Record<StepStatus, ModuleState> = { open: "not_started", started: "in_progress", doneForNow: "done_for_now" };

/** Alle Kombinationen, die die Stati der vier Person-Module unterscheiden. */
function* personFakten(): Generator<AboutYouFacts> {
  for (const workSubmitted of [false, true])
    for (const workAnswers of [0, 4])
      for (const workStarted of [false, true])
        for (const strengthCount of [0, 2])
          for (const marks of [[], ["staerken"], ["faehigkeiten"], ["faehigkeiten", "staerken"]])
            for (const areaCount of [0, 3])
              for (const levelledCount of [0, 1, 3])
                for (const wishedCount of [0, 1, 3])
                  for (const directionAnswers of [0, 2, 4])
                    for (const directionStatements of [0, 1])
                      yield mit({
                        workSubmitted, workAnswers, workStarted, strengthCount, areaCount,
                        levelledCount: Math.min(levelledCount, areaCount),
                        wishedCount: Math.min(wishedCount, areaCount),
                        directionAnswers, directionStatements,
                        marks: new Set(marks),
                      });
}

// ---------------------------------------------------------------------------
// Person-Module: Parity mit `buildAboutYou`
// ---------------------------------------------------------------------------

test("Workstyle: der Adapter sagt dasselbe wie der Schritt „arbeitsweise“ des Profils", () => {
  let faelle = 0;
  for (const facts of personFakten()) {
    const erwartet = zustand[produktSchritt(facts, "arbeitsweise")];
    assert.equal(workstyleAdapter.status(user, ctx(facts)).state, erwartet);
    faelle += 1;
  }
  assert.ok(faelle > 1000, "die Gegenprobe: genug Kombinationen");
  // Ausdruecklich, damit die Bedeutung lesbar bleibt:
  assert.equal(workstyleAdapter.status(user, ctx(leer)).state, "not_started");
  assert.equal(workstyleAdapter.status(user, ctx(mit({ workAnswers: 3 }))).state, "in_progress");
  assert.equal(workstyleAdapter.status(user, ctx(mit({ workStarted: true }))).state, "in_progress");
  assert.equal(workstyleAdapter.status(user, ctx(mit({ workSubmitted: true }))).state, "done_for_now");
});

test("Strengths: der Adapter sagt dasselbe wie der Schritt „staerken“ - fertig ist, was die Person markiert", () => {
  for (const facts of personFakten()) {
    assert.equal(strengthsAdapter.status(user, ctx(facts)).state, zustand[produktSchritt(facts, "staerken")]);
  }
  assert.equal(strengthsAdapter.status(user, ctx(mit({ strengthCount: 2 }))).state, "in_progress", "Stärken da, aber nicht markiert");
  assert.equal(strengthsAdapter.status(user, ctx(mit({ strengthCount: 2, marks: new Set(["staerken"]) }))).state, "done_for_now");
  assert.equal(strengthsAdapter.status(user, ctx(mit({ marks: new Set(["staerken"]) }))).state, "done_for_now", "die Person darf auch ohne Eintrag abschliessen");
});

test("Capability: die drei Schritte Bereiche, Erfahrung und Verantwortung - wie die Station des Profils", () => {
  for (const facts of personFakten()) {
    const schritte = (["faehigkeiten", "erfahrung", "verantwortung"] as const).map((id) =>
      buildAboutYou(facts).flatMap((s) => s.steps).find((step) => step.id === id)!
    );
    assert.equal(capabilityAdapter.status(user, ctx(facts)).state, zustand[stationStatus(schritte)]);
  }
  const fertig = mit({ areaCount: 3, levelledCount: 3, wishedCount: 3, marks: new Set(["faehigkeiten"]) });
  assert.equal(capabilityAdapter.status(user, ctx(fertig)).state, "done_for_now");
  assert.equal(capabilityAdapter.status(user, ctx(mit({ areaCount: 3 }))).state, "in_progress");
  assert.equal(capabilityAdapter.status(user, ctx(leer)).state, "not_started");
});

test("Capability: das Gespraech ist ein Erhebungsweg und aendert den Abschluss nicht", () => {
  const fertig = mit({ areaCount: 3, levelledCount: 3, wishedCount: 3, marks: new Set(["faehigkeiten"]) });
  const mitOffenemGespraech = { ...fertig, interviewStarted: true, unsortedAnswers: 5 };
  assert.equal(capabilityAdapter.status(user, ctx(fertig)).state, capabilityAdapter.status(user, ctx(mitOffenemGespraech)).state);
  assert.equal(capabilityAdapter.status(user, ctx(mitOffenemGespraech)).state, "done_for_now");
});

test("Direction: der Adapter sagt dasselbe wie der Schritt „antrieb“", () => {
  for (const facts of personFakten()) {
    assert.equal(directionAdapter.status(user, ctx(facts)).state, zustand[produktSchritt(facts, "antrieb")]);
  }
  assert.equal(directionAdapter.status(user, ctx(mit({ directionStatements: 1 }))).state, "in_progress");
  assert.equal(directionAdapter.status(user, ctx(mit({ directionAnswers: 4 }))).state, "done_for_now");
});

// ---------------------------------------------------------------------------
// legacy_unversioned
// ---------------------------------------------------------------------------

test("Bestand ohne Stempel ist legacy_unversioned und wird nie auf die aktuelle Version gemappt", () => {
  const fertig = mit({
    strengthCount: 2, areaCount: 3, levelledCount: 3, wishedCount: 3, directionAnswers: 4,
    marks: new Set(["staerken", "faehigkeiten"]),
  });
  for (const [adapter, versionId] of [
    [strengthsAdapter, "strengths@1"],
    [capabilityAdapter, "capability@1"],
    [directionAdapter, "direction@1"],
  ] as const) {
    const status = adapter.status(user, ctx(fertig));
    assert.equal(status.state, "done_for_now");
    assert.equal(status.completedVersion, LEGACY_UNVERSIONED);
    assert.equal(LEGACY_UNVERSIONED, "legacy_unversioned");
    assert.notEqual(status.completedVersion, versionId);
    assert.equal(adapter.describe().versions[0]?.versionId, versionId, "die Registry kennt die Version, der Bestand gehoert nicht dazu");
  }
});

test("completedVersion ist nur bei einem abgeschlossenen Ergebnis gesetzt", () => {
  for (const adapter of [workstyleAdapter, strengthsAdapter, capabilityAdapter, directionAdapter]) {
    for (const facts of personFakten()) {
      const status = adapter.status(user, ctx(facts));
      assert.equal(status.completedVersion === null, status.state !== "done_for_now", `${adapter.describe().moduleId}: ${status.state}`);
    }
  }
});

test("Workstyle traegt seine echte Version, weil das Instrument ein Stempel ist", () => {
  const status = workstyleAdapter.status(user, ctx(mit({ workSubmitted: true })));
  assert.equal(status.completedVersion, CURRENT_WORKSTYLE_VERSION);
  assert.equal(workstyleAdapter.describe().versions[0]?.instrumentId, CURRENT_WORKSTYLE_INSTRUMENT);
});

// ---------------------------------------------------------------------------
// Venture Alignment: Status je Vorhaben
// ---------------------------------------------------------------------------

/**
 * Die Regel der Teamseite (`loadTeamJourneyStatus`), als Referenz.
 * present = abgegeben, inProgress = Zeile ohne Abgabe, open = keine Zeile.
 */
const teamseite = (row: { submitted_at: string | null } | null) =>
  row?.submitted_at ? "present" : row ? "inProgress" : "open";
const ausTeamseite: Record<string, ModuleState> = { present: "done_for_now", inProgress: "in_progress", open: "not_started" };

const zeile = (teil: Partial<AssessmentRow> = {}): AssessmentRow => ({
  instrument_id: "venture-alignment-v1",
  venture_id: "v-1",
  submitted_at: null,
  created_at: "2026-10-01T10:00:00Z",
  ...teil,
});
const venture = (rows: readonly AssessmentRow[] | null | undefined, ventureId: string | null = "v-1"): ModuleContext => ({
  ventureId,
  ventureAssessments: rows,
});

test("die Regel der Teamseite steht im Quelltext, wie die Referenz sie annimmt", () => {
  const quelle = read("src/features/teams/TeamJourneyStatus.tsx");
  assert.ok(quelle.includes('result.data?.submitted_at ? "present" : result.data ? "inProgress" : "open"'));
  assert.ok(
    quelle.includes('.eq("instrument_id", "venture-alignment-v1").eq("venture_id", teamId).order("created_at", { ascending: false }).limit(1)'),
    "neueste Zeile je Vorhaben und Instrument"
  );
  assert.ok(quelle.includes("`/founder-alignment/vorhaben/antworten?venture=${venture}`"));
  assert.ok(quelle.includes("`/founder-alignment/vorhaben?venture=${venture}`"));
});

test("Venture: Status je Vorhaben folgt der Teamseite", () => {
  const faelle: { rows: AssessmentRow[]; row: AssessmentRow | null }[] = [
    { rows: [], row: null },
    { rows: [zeile()], row: zeile() },
    { rows: [zeile({ submitted_at: "2026-10-02T10:00:00Z" })], row: zeile({ submitted_at: "2026-10-02T10:00:00Z" }) },
  ];
  for (const { rows, row } of faelle) {
    assert.equal(ventureCoreAdapter.status(user, venture(rows)).state, ausTeamseite[teamseite(row)!]);
  }
  assert.deepEqual(ventureCoreAdapter.status(user, venture([])), { state: "not_started", completedVersion: null });
  assert.deepEqual(ventureCoreAdapter.status(user, venture([zeile()])), { state: "in_progress", completedVersion: null });
  assert.deepEqual(
    ventureCoreAdapter.status(user, venture([zeile({ submitted_at: "2026-10-02T10:00:00Z" })])),
    { state: "done_for_now", completedVersion: "venture-alignment-v1" }
  );
});

test("Venture: die NEUESTE Zeile zaehlt - ein neuerer Entwurf macht den Stand wieder „begonnen“", () => {
  const alt = zeile({ submitted_at: "2026-10-02T10:00:00Z", created_at: "2026-10-01T10:00:00Z" });
  const neuerEntwurf = zeile({ created_at: "2026-10-05T10:00:00Z" });
  assert.equal(ventureCoreAdapter.status(user, venture([alt, neuerEntwurf])).state, "in_progress");
  assert.equal(ventureCoreAdapter.status(user, venture([neuerEntwurf, alt])).state, "in_progress");
  assert.equal(teamseite(neuerEntwurf), "inProgress", "so rechnet die Teamseite");
});

test("Venture: Zeilen anderer Vorhaben oder unbekannter Instrumente zaehlen nicht", () => {
  const anderes = zeile({ venture_id: "v-2", submitted_at: "2026-10-02T10:00:00Z" });
  const unbekannt = zeile({ instrument_id: "venture-alignment-v9", submitted_at: "2026-10-02T10:00:00Z" });
  assert.equal(ventureCoreAdapter.status(user, venture([anderes, unbekannt])).state, "not_started");
  assert.equal(ventureCoreAdapter.status(user, venture([anderes, zeile()], "v-1")).state, "in_progress");
  assert.equal(ventureCoreAdapter.status(user, venture([anderes], "v-2")).state, "done_for_now");
});

test("Venture: ohne Vorhaben oder ohne lesbare Daten gibt es keinen Status - kein stilles „offen“", () => {
  const code = (fn: () => unknown) => {
    try { fn(); } catch (error) { return (error as ModuleContextError).code; }
    return null;
  };
  assert.equal(code(() => ventureCoreAdapter.status(user, venture([], null))), "module_context_missing_venture");
  assert.equal(code(() => ventureCoreAdapter.status(user, venture(undefined))), "module_context_missing_venture_assessments");
  assert.equal(code(() => ventureCoreAdapter.status(user, venture(null))), "module_data_unavailable");
  assert.equal(code(() => ventureCoreAdapter.profileTeaser(user, venture([], null))), "module_context_missing_venture");
});

test("Venture: Ziel der Profilkarte wie `ventureHref` der Teamseite", () => {
  const offen = ventureCoreAdapter.profileTeaser(user, venture([]));
  assert.deepEqual(offen, { href: "/founder-alignment/vorhaben?venture=v-1", hasContent: false });
  const fertig = ventureCoreAdapter.profileTeaser(user, venture([zeile({ submitted_at: "2026-10-02T10:00:00Z" })]));
  assert.deepEqual(fertig, { href: "/founder-alignment/vorhaben/antworten?venture=v-1", hasContent: true });
  assert.equal(ventureCoreAdapter.profileTeaser(user, venture([], "v 1/2"))?.href, "/founder-alignment/vorhaben?venture=v%201%2F2");
});

// ---------------------------------------------------------------------------
// Profilkarten und bestehende Freigaben
// ---------------------------------------------------------------------------

test("die Wegweiser der Person-Module zeigen auf dieselben Ziele wie das Profil", () => {
  const stationen = buildAboutYou(leer).flatMap((s) => s.steps);
  const href = (id: StepId) => stationen.find((step) => step.id === id)!.href;
  assert.equal(workstyleAdapter.profileTeaser(user, ctx(leer))?.href, href("arbeitsweise"));
  assert.equal(strengthsAdapter.profileTeaser(user, ctx(leer))?.href, href("staerken"));
  assert.equal(capabilityAdapter.profileTeaser(user, ctx(leer))?.href, href("faehigkeiten"));
  assert.equal(directionAdapter.profileTeaser(user, ctx(leer))?.href, href("antrieb"));
});

test("die Wegweiser melden Inhalte, aber keinen Fortschritt", () => {
  const facts = mit({ strengthCount: 4, areaCount: 2, directionStatements: 3, directionAnswers: 1, workSubmitted: true });
  assert.deepEqual(strengthsAdapter.profileTeaser(user, ctx(facts))?.counts, { statements: 4 });
  assert.deepEqual(capabilityAdapter.profileTeaser(user, ctx(facts))?.counts, { areas: 2 });
  assert.deepEqual(directionAdapter.profileTeaser(user, ctx(facts))?.counts, { statements: 3 });
  assert.equal(workstyleAdapter.profileTeaser(user, ctx(facts))?.hasContent, true);
  assert.equal(strengthsAdapter.profileTeaser(user, ctx(leer))?.hasContent, false);
  for (const adapter of [workstyleAdapter, strengthsAdapter, capabilityAdapter, directionAdapter]) {
    const teaser = JSON.stringify(adapter.profileTeaser(user, ctx(facts)));
    assert.doesNotMatch(teaser, /percent|prozent|score|total|von/i);
  }
});

test("shareState gibt die bestehenden Freigabevertraege wieder - ohne sie zu aendern", () => {
  // Workstyle: Teamfreigabe je Team; ohne Team im Kontext fuer keines geteilt.
  assert.deepEqual(workstyleAdapter.shareState(user, ctx(leer)), { contract: "team_share", teamId: null, active: false });
  assert.deepEqual(
    workstyleAdapter.shareState(user, ctx(leer, { teamShare: { teamId: "t-1", active: true } })),
    { contract: "team_share", teamId: "t-1", active: true }
  );
  // Capability: Freigabestufe, ohne Angabe „private“ wie auf /profile.
  assert.deepEqual(capabilityAdapter.shareState(user, ctx(leer)), { contract: "capability_disclosure", level: "private" });
  assert.deepEqual(capabilityAdapter.shareState(user, ctx(leer, { capabilityDisclosure: "areas" })), { contract: "capability_disclosure", level: "areas" });
  assert.ok(read("src/app/(product)/profile/page.tsx").includes('(data?.capability_disclosure as string | undefined) ?? "private"'));
  // Strengths und Direction: auf Modulebene kein Vertrag.
  assert.deepEqual(strengthsAdapter.shareState(user, ctx(leer)), { contract: "none" });
  assert.deepEqual(directionAdapter.shareState(user, ctx(leer)), { contract: "none" });
  // Venture v1: sichtbar mit der Abgabe.
  assert.deepEqual(ventureCoreAdapter.shareState(user, venture([])), { contract: "visible_on_submit", ventureId: "v-1", visibleToTeam: false });
  assert.deepEqual(
    ventureCoreAdapter.shareState(user, venture([zeile({ submitted_at: "2026-10-02T10:00:00Z" })])),
    { contract: "visible_on_submit", ventureId: "v-1", visibleToTeam: true }
  );
});

test("ohne Person-Fakten werfen die Person-Adapter - sie raten nicht", () => {
  for (const adapter of [workstyleAdapter, strengthsAdapter, capabilityAdapter, directionAdapter]) {
    assert.throws(() => adapter.status(user, {}), /module_context_missing_person_facts/);
    assert.throws(() => adapter.profileTeaser(user, {}), /module_context_missing_person_facts/);
  }
});

// ---------------------------------------------------------------------------
// Die Adapter-Registry
// ---------------------------------------------------------------------------

test("jedes registrierte Modul hat genau einen Adapter, der seine eigene Definition beschreibt", () => {
  assert.deepEqual(Object.keys(MODULE_ADAPTERS).sort(), MODULE_REGISTRY.map((def) => def.moduleId).sort());
  for (const def of MODULE_REGISTRY) {
    const adapter: ModuleAdapter | null = getModuleAdapter(def.moduleId);
    assert.ok(adapter, def.moduleId);
    assert.equal(adapter!.describe(), def);
  }
  assert.equal(getModuleAdapter("gibt_es_nicht"), null);
});

// ---------------------------------------------------------------------------
// Der Lader: nur lesen, mit den Abfragen des Produkts
// ---------------------------------------------------------------------------

function produktClient(over: { ventureRow?: AssessmentRow | null; readiness?: unknown; fehler?: string[] } = {}) {
  const fehler = new Set(over.fehler ?? []);
  return fakeClient(
    (query) => {
      if (fehler.has(query.table)) return { error: { message: "kaputt" } };
      switch (query.table) {
        case "assessments":
          if (eqOf(query, "instrument_id") === CURRENT_WORKSTYLE_INSTRUMENT) {
            return { data: { id: "w-1", submitted_at: "2026-10-01T00:00:00Z" } };
          }
          return { data: over.ventureRow ?? null };
        case "alignment_answers": return { count: 29 };
        case "capability_interview_sessions": return { data: [{ status: "completed" }] };
        case "capability_interview_turns": return { count: eqOf(query, "kind") === "direction" ? 4 : 0 };
        case "direction_statements": return { count: 1 };
        case "person_resources": return { count: 0 };
        case "person_section_marks": return { data: [{ section: "staerken" }] };
        case "person_capability_entries":
          return { data: [
            { id: "e1", area_id: "a", application_level: 3, ownership_wish: "own", person_capability_evidence: [] },
            { id: "e2", area_id: "b", application_level: 2, ownership_wish: null, person_capability_evidence: [] },
          ] };
        case "person_strengths":
          return { data: [{ id: "s1", label: null, statement: "Bleibt dran", origin: "own_words", self_frequency: null, reflected_frequency: null, reflected_who: null }] };
        case "person_core": return { data: { capability_disclosure: "areas" } };
        default: return {};
      }
    },
    (name) => (name === "get_workstyle_team_share_readiness" ? { data: over.readiness ?? null } : {})
  );
}

test("der Lader reicht die Fakten des Produkts weiter - und die Adapter lesen daraus dasselbe", async () => {
  const client = produktClient();
  const context = await loadModuleContext(client, "u-1");
  assert.equal(context.personFacts?.workSubmitted, true);
  assert.equal(context.personFacts?.workAnswers, 29);
  assert.equal(context.personFacts?.strengthCount, 1);
  assert.equal(context.personFacts?.areaCount, 2);
  assert.equal(context.personFacts?.levelledCount, 2);
  assert.equal(context.personFacts?.wishedCount, 1);
  assert.equal(context.personFacts?.directionAnswers, 4);
  assert.equal(context.capabilityDisclosure, "areas");

  assert.deepEqual(workstyleAdapter.status(user, context), { state: "done_for_now", completedVersion: CURRENT_WORKSTYLE_VERSION });
  assert.deepEqual(strengthsAdapter.status(user, context), { state: "done_for_now", completedVersion: LEGACY_UNVERSIONED });
  assert.deepEqual(capabilityAdapter.status(user, context), { state: "in_progress", completedVersion: null });
  assert.deepEqual(directionAdapter.status(user, context), { state: "done_for_now", completedVersion: LEGACY_UNVERSIONED });
});

test("der Lader fragt das Vorhaben wie die Teamseite: neueste Zeile je Vorhaben und Instrument", async () => {
  const client = produktClient({ ventureRow: zeile({ submitted_at: "2026-10-02T10:00:00Z" }) });
  const context = await loadModuleContext(client, "u-1", { ventureId: "v-1" });
  const abfrage = client.queries.find((q) => q.table === "assessments" && eqOf(q, "venture_id") === "v-1")!;
  assert.equal(eqOf(abfrage, "instrument_id"), "venture-alignment-v1");
  assert.equal(eqOf(abfrage, "user_id"), "u-1");
  assert.ok(abfrage.ops.includes("order") && abfrage.ops.includes("limit"), "neueste zuerst, eine Zeile");
  assert.equal(ventureCoreAdapter.status(user, context).state, "done_for_now");

  const leerClient = produktClient({ ventureRow: null });
  const leerContext = await loadModuleContext(leerClient, "u-1", { ventureId: "v-1" });
  assert.deepEqual(leerContext.ventureAssessments, []);
  assert.equal(ventureCoreAdapter.status(user, leerContext).state, "not_started");
});

test("ein Lesefehler beim Vorhaben wird als „nicht lesbar“ gemeldet, nicht als „leer“", async () => {
  const client = fakeClient((query) =>
    query.table === "assessments" && eqOf(query, "venture_id") === "v-1" ? { error: { message: "kaputt" } } : {}
  );
  const context = await loadModuleContext(client, "u-1", { ventureId: "v-1" });
  assert.equal(context.ventureAssessments, null);
  assert.throws(() => ventureCoreAdapter.status(user, context), /module_data_unavailable/);
});

test("die Teamfreigabe kommt aus derselben Auskunft wie auf der Teamseite", async () => {
  const readiness = { status: "ready", members: [], viewer_team_share: true };
  assert.equal(parseTeamReadiness(readiness)?.viewer_team_share, true);
  const client = produktClient({ readiness });
  const context = await loadModuleContext(client, "u-1", { teamId: "t-1" });
  assert.deepEqual(client.rpcCalls, [{ name: "get_workstyle_team_share_readiness", args: { p_team_id: "t-1" } }]);
  assert.deepEqual(workstyleAdapter.shareState(user, context), { contract: "team_share", teamId: "t-1", active: true });

  const ohne = await loadModuleContext(produktClient({ readiness: { status: "kaputt" } }), "u-1", { teamId: "t-1" });
  assert.equal(ohne.teamShare, null);
});

test("der Lader liest nur: keine schreibende Operation, keine Markierung, nur die eine Lese-RPC", async () => {
  const client = produktClient({ ventureRow: zeile() });
  await loadModuleContext(client, "u-1", { ventureId: "v-1", teamId: "t-1" });
  const schreibend = ["insert", "update", "upsert", "delete"];
  for (const query of client.queries) {
    assert.deepEqual(query.ops.filter((op) => schreibend.includes(op)), [], query.table);
  }
  assert.deepEqual(client.rpcCalls.map((call) => call.name), ["get_workstyle_team_share_readiness"]);
  assert.ok(client.queries.length > 8, "die Gegenprobe: es wurde wirklich gefragt");
});

// ---------------------------------------------------------------------------
// Was bewusst NICHT passiert ist
// ---------------------------------------------------------------------------

function* quellen(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__") continue;
      yield* quellen(path);
    } else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}
const ohneKommentare = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("die Modulschicht schreibt nirgends: keine Schreib-Operation, keine schreibende RPC", () => {
  for (const file of quellen("src/features/modules")) {
    const code = ohneKommentare(file);
    assert.doesNotMatch(code, /\.(insert|update|upsert|delete)\(/, file);
    const rpcs = [...code.matchAll(/\.rpc\(\s*"([a-z_0-9]+)"/g)].map((m) => m[1]);
    for (const name of rpcs) assert.equal(name, "get_workstyle_team_share_readiness", `${file}: ${name}`);
  }
});

test("person_section_marks wird nicht generalisiert: Die Modulschicht fragt die Tabelle nie selbst", () => {
  // Erwaehnt wird sie in den Beschreibungen (`completion.source`); gelesen wird sie
  // nur ueber `getAboutYouFacts`, geschrieben nie.
  for (const file of quellen("src/features/modules")) {
    assert.doesNotMatch(ohneKommentare(file), /from\(\s*["']person_section_marks["']/, file);
  }
});

test("keine Migration, keine neue Completion-Tabelle, keine DB-Spiegelung", () => {
  // Phase E darf `module_versions` einfuehren - dieser Test dann bewusst anpassen.
  for (const name of readdirSync("../supabase/migrations")) {
    const sql = read(`../supabase/migrations/${name}`);
    assert.doesNotMatch(sql, /module_versions|module_completion|module_registry|module_runs?\b/i, name);
  }
});

test("das Produkt benutzt die Modulschicht noch nicht: kein bestehender Flow, keine Navigation, kein Sharing wurde angeschlossen", () => {
  // Phase C darf die Karten anschliessen - dieser Test dann bewusst anpassen.
  const ausserhalb: string[] = [];
  for (const file of quellen("src")) {
    if (file.startsWith(join("src", "features", "modules"))) continue;
    if (/@\/features\/modules/.test(read(file))) ausserhalb.push(file);
  }
  assert.deepEqual(ausserhalb, []);
});
