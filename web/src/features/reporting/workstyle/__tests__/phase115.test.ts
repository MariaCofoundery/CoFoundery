import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTeamReadiness, readinessState, type ReadinessMember } from "@/features/reporting/workstyle/teamReadiness";
import { QUOTE_COUNT, quoteIndexFor } from "@/features/dashboard/quoteDayIndex";

/**
 * Phase 11.5 - Assessment-UX, gegenseitige Teamreport-Sichtbarkeit,
 * Report-Visuals, Zitat des Tages. Die DB-Regel selbst (A-G) pruefen die
 * pgTAP-Tests in supabase/tests/workstyle_team_mutual_readiness.sql.
 */

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const json = (p: string) => JSON.parse(src(p));

// Phase 11.7B: je Person "fuer dieses Team geteilt" statt Paarmatrix.
// "Nicht geteilt" heisst: weder Teamfreigabe noch Bestand.
const member = (over: Partial<ReadinessMember>): ReadinessMember => ({
  person_id: Math.random().toString(36), name: "X", is_viewer: false, has_current_workstyle: true, shared_with_team: true,
  team_share_active: over.shared_with_team === false ? false : true, ...over,
});
const readiness = (status: "ready" | "missing", members: ReadinessMember[]) => ({ status, members, viewer_team_share: false });

test("Bereitschaft: alle Zustände aus echten Teamfreigaben", () => {
  const ready = readinessState(readiness("ready", [member({ is_viewer: true }), member({ name: "Mia" })]));
  assert.equal(ready.state, "READY");

  const mine = readinessState(readiness("missing", [member({ is_viewer: true, shared_with_team: false }), member({ name: "Mia" })]));
  assert.deepEqual([mine.state, mine.viewerAction, mine.waitingFor], ["MISSING_MINE", "share_team", []]);

  const others = readinessState(readiness("missing", [member({ is_viewer: true }), member({ name: "Mia", shared_with_team: false })]));
  assert.deepEqual([others.state, others.viewerAction, others.waitingFor], ["MISSING_OTHERS", null, ["Mia"]]);

  const both = readinessState(readiness("missing", [member({ is_viewer: true, shared_with_team: false }), member({ name: "Mia", shared_with_team: false }), member({ name: "Ben" })]));
  assert.deepEqual([both.state, both.viewerAction, both.waitingFor], ["MISSING_MULTIPLE", "share_team", ["Mia"]]);

  // Teilen geht auch vor dem fertigen Arbeitsprofil - zuerst die eigene Teamfreigabe.
  const noProfile = readinessState(readiness("missing", [member({ is_viewer: true, has_current_workstyle: false, shared_with_team: false }), member({ name: "Mia" })]));
  assert.deepEqual([noProfile.state, noProfile.viewerAction], ["INSUFFICIENT_WORKSTYLE", "share_team"]);
  // Teamfreigabe aktiv, Arbeitsprofil fehlt: die DB meldet shared_with_team=false, team_share_active=true.
  const sharedNoProfile = readinessState(readiness("missing", [member({ is_viewer: true, has_current_workstyle: false, shared_with_team: false, team_share_active: true }), member({ name: "Mia" })]));
  assert.deepEqual([sharedNoProfile.state, sharedNoProfile.viewerAction], ["INSUFFICIENT_WORKSTYLE", "complete_workstyle"]);

  const otherNoProfile = readinessState(readiness("missing", [member({ is_viewer: true }), member({ name: "Mia", has_current_workstyle: false, shared_with_team: false })]));
  assert.deepEqual([otherNoProfile.state, otherNoProfile.viewerAction, otherNoProfile.waitingFor], ["INSUFFICIENT_WORKSTYLE", null, ["Mia"]]);
});

test("Bereitschaft: Parser nimmt nur Wahrheitswerte und Namen, keine Antworten", () => {
  const parsed = parseTeamReadiness({ status: "missing", viewer_team_share: true, members: [{ person_id: "a", name: "", is_viewer: true, has_current_workstyle: true, shared_with_team: false, team_share_active: false, answers: [1, 2] }] });
  assert.deepEqual(parsed, { status: "missing", viewer_team_share: true, members: [{ person_id: "a", name: "Founder", is_viewer: true, has_current_workstyle: true, shared_with_team: false, team_share_active: false }] });
  // Bestandsfeld der Phase 11.5 wird weiter verstanden.
  assert.equal(parseTeamReadiness({ status: "missing", members: [{ person_id: "b", shared_with_all_members: true }] })?.members[0].shared_with_team, true);
  assert.equal(parseTeamReadiness({ status: "maybe" }), null);
});

test("Migration: gemeinsamer Teambericht nur bei gegenseitiger Freigabe, ohne automatische Freigabe", () => {
  const migration = src("../supabase/migrations/20261118120000_workstyle_team_mutual_readiness.sql");
  assert.match(migration, /create or replace function public\.get_workstyle_product_team/);
  assert.match(migration, /not public\.workstyle_core_visible_to\(x\.user_id,y\.user_id\)/);
  assert.match(migration, /create function public\.get_workstyle_team_share_readiness/);
  assert.match(migration, /revoke all on function public\.workstyle_core_visible_to\(uuid,uuid\) from public,anon,authenticated/);
  assert.doesNotMatch(migration, /insert into public\.alignment_shares|update public\.alignment_shares|create table/i);
  assert.match(src("../supabase/tests/workstyle_team_mutual_readiness.sql"), /A: one-sided share hides report from sharer/);
});

test("Teamreport-Seite: konkrete Bereitschaft nur für Mitglieder, nur ein Knopf für die eigene Teamfreigabe", () => {
  const page = code("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.match(page, /current === "not_ready" && membership\s*\?\s*parseTeamReadiness/);
  assert.match(page, /get_workstyle_team_share_readiness/);
  const panel = code("src/features/reporting/workstyle/TeamReadinessPanel.tsx");
  assert.match(panel, /viewerAction === "share_team"/);
  assert.match(panel, /<TeamShareCard/);
  assert.doesNotMatch(panel, /share_workstyle_product|shareWorkstyle|onClick|#freigaben/);
  assert.match(code("src/app/me/profile/workstyle/page.tsx"), /id="freigaben"/);
  for (const locale of ["de", "en"]) {
    const r = json(`messages/${locale}/report.json`).workstyle.readiness;
    assert.ok(r.title && r.rule && r.state.MISSING_OTHERS.includes("{names}"), locale);
    assert.ok(r.member.shared && r.member.notShared, locale);
  }
});

test("Fragebogen: Fortschritt in Markenfarben mit echter Zahl, Scroll unter der Kopfleiste, Fokus auf die Frage", () => {
  // Fortschritt und Fragekarte sind gemeinsam genutzt (Phase 11.6: auch fuer den Forschungsteil).
  const ui = code("src/features/instruments/workstyle/WorkstylePretestV2.tsx");
  assert.doesNotMatch(ui, /<progress/);
  assert.match(ui, /role="progressbar"/);
  assert.match(ui, /from-violet-600 to-cyan-400/);
  assert.match(ui, /`\$\{noun\} \$\{position \+ 1\} von \$\{total\}`/);
  assert.doesNotMatch(ui, /%<\/|Prozent/);
  assert.match(ui, /scroll-mt-36/);
  assert.match(ui, /focus\(\{ preventScroll: true \}\)/);
  assert.match(ui, />Zurück</);
  // Aktueller Ablauf: warm, mit echter Anzahl, ohne erfundene Minuten.
  const flow = code("src/features/instruments/workstyle/WorkstyleProfileFlow.tsx");
  assert.match(flow, /Mach’s dir kurz bequem\./);
  assert.match(flow, /Dein Arbeitsprofil basiert auf \{coreItems\.length\} Situationen\./);
  assert.match(flow, /Später weitermachen/);
  assert.doesNotMatch(flow, /Minuten|minutes/);
});

test("Abschluss: Erfolg, eigenes Arbeitsprofil, Zusammenspiel, Dashboard - Forschung nachgeordnet, nichts automatisch geteilt", () => {
  const ui = code("src/features/instruments/workstyle/WorkstyleProfileFlow.tsx");
  const done = ui.slice(ui.indexOf("Dein Arbeitsprofil ist bereit."));
  // Phase 11.6C: Aktionen sind ein gemeinsamer Block; Forschung danach nur noch als kleiner Link.
  const actions = ui.slice(ui.indexOf("const actions ="), ui.indexOf("const withdrawal ="));
  assert.ok(actions.indexOf("Arbeitsprofil ansehen") < actions.indexOf("Zum Dashboard"));
  assert.ok(done.indexOf("{actions}") < done.indexOf("Forschung später unterstützen"));
  assert.match(done, /Niemand sieht deine Antworten automatisch/);
  // Phase 11.7B: geteilt wird einmal mit dem Team, nicht je Person.
  assert.match(actions, /\/teams\/\$\{context\.teamId\}\/workstyle/);
  assert.doesNotMatch(actions, /#freigaben|Freigaben für/);
  assert.match(actions, /href="\/dashboard"/);
  assert.doesNotMatch(ui, /Danke für deine Teilnahme\./);
  assert.doesNotMatch(ui, /saveWorkstyleProduct|share_workstyle_product/);
  const page = code("src/app/(product)/research/workstyle-pretest/page.tsx");
  assert.match(page, /context=\{completionContext\}/);
});

test("Einladung: klarer Hinweis, dass nichts automatisch geteilt wird", () => {
  assert.match(code("src/features/dashboard/CoFounderInviteForm.tsx"), /t\("sharingNote"\)/);
  assert.match(json("messages/de/dashboard.json").coFounderInviteForm.sharingNote, /nichts automatisch geteilt/);
  assert.match(json("messages/en/dashboard.json").coFounderInviteForm.sharingNote, /shares nothing automatically/);
});

test("Zitat des Tages: stabil je Tag, für alle Rollen gleich, kuratiert und ohne Fit-Behauptung", () => {
  const a = quoteIndexFor(new Date("2026-10-05T06:00:00Z"));
  assert.equal(a, quoteIndexFor(new Date("2026-10-05T20:00:00Z")), "derselbe Berliner Tag");
  assert.notEqual(a, quoteIndexFor(new Date("2026-10-06T06:00:00Z")));
  for (const page of ["src/app/(product)/dashboard/page.tsx", "src/app/(product)/advisor/dashboard/page.tsx"])
    assert.equal((code(page).match(/<QuoteOfTheDay/g) ?? []).length, 1, page);
  for (const locale of ["de", "en"]) {
    const q = json(`messages/${locale}/common.json`).quoteOfTheDay.quotes;
    assert.equal(Object.keys(q).length, QUOTE_COUNT);
    assert.doesNotMatch(Object.values(q).join(" "), /Konflikte kleiner|passt|kompatib|fewer conflicts|compatib/i);
  }
});

test("Auf einen Blick (11.7B): kurze Pole innerhalb der Konstrukte, eine Spur je Person, keine Kürzel", () => {
  const narrative = src("src/features/reporting/workstyle/narrative.ts");
  const poles = narrative.slice(narrative.indexOf("export const AREA_POLES"), narrative.indexOf("};", narrative.indexOf("export const AREA_POLES")));
  for (const area of ["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"]) assert.match(poles, new RegExp(`${area}: \\{ left: "`));
  assert.match(poles, /EVI: \{ left: "erste Einschätzung stehen lassen", right: "noch einmal genauer hinschauen" \}/);
  assert.doesNotMatch(poles, /intelligen|rational|Risiko|risikobereit|extravert|Toleranz|gewissenhaft|Intuition|Bauchgefühl|Vision|Typ\b/i);
  const glance = code("src/features/reporting/workstyle/WorkstyleGlance.tsx");
  assert.match(glance, /overviewMark\(p\.profile, area\.key\)/);
  assert.match(glance, /people\.map\(\(p\) => \(\s*<Track/);
  assert.doesNotMatch(glance, /memberInitials|ws-token|lanes|people\.length >= 3/);
  assert.doesNotMatch(glance, /Workstyle Signature|radar|score|Prozent/i);
});

test("Einzelbericht (11.7B): Einstieg → auf einen Blick → Auffälliges → Bereiche → eine Frage → So liest du das → Anhang", () => {
  const ui = code("src/features/reporting/workstyle/IndividualWorkstyle.tsx");
  const order = ["<WorkstyleGlance", 'id="ws-findings-title"', 'id="ws-areas-title"', 'id="ws-question-title"', 'id="ws-method-title"', 'className="ws-appendix'].map((m) => ui.indexOf(m));
  order.forEach((at, n) => assert.ok(at > (n ? order[n - 1] : 0), `Reihenfolge ${n}`));
  assert.match(ui, /n\.pattern\.kind === "direction" && n\.pattern\.band !== "middle"/);
  assert.match(ui, /"Deine Arbeitsweise auf einen Blick"/);
  assert.match(ui, /"Was bei dir besonders auffällt"/);
  assert.match(ui, /"Eine Frage für dich"/);
});

test("Fähigkeiten (11.7B): Textchips statt Symbol-Mosaik, offene Verantwortung zuerst, keine Lückensprache", () => {
  const matrix = code("src/features/reporting/workstyle/ComponentMatrix.tsx");
  assert.doesNotMatch(matrix, /CapabilityMosaic|ws-mosaic|Legende|[★◆＋↗↪◇]/);
  assert.ok(matrix.indexOf("Wo Verantwortung noch offen ist") < matrix.indexOf("Wer was mitbringt"));
  assert.match(matrix, /"viel Erfahrung"/);
  assert.match(matrix, /"möchte verantworten"/);
  assert.match(matrix, /Keine Angabe: \{without\.join/);
  assert.match(matrix, /Weitere Bereiche mit Angaben/);
  assert.doesNotMatch(matrix, /fehlt euch|Lücke|Score|Prozent|vollständig abgedeckt/i);
  assert.match(matrix, /das heißt nicht, dass etwas fehlt/);
  assert.doesNotMatch(src("src/features/reporting/workstyle/report.css"), /ws-mosaic|ws-token/);
});

test("Profil-Druck: historische Auswertung standardmäßig nur als Archivkarte", () => {
  const print = code("src/app/me/profile/print/page.tsx");
  assert.match(print, /\{voll && workProfile && !includeLegacy \? \(\s*<ArchiveCard/);
  assert.match(print, /\{voll && !includeLegacy && report \? \(\s*<ArchiveCard/);
});
