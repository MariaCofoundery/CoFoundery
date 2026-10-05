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

const member = (over: Partial<ReadinessMember>): ReadinessMember => ({
  person_id: Math.random().toString(36), name: "X", is_viewer: false, has_current_workstyle: true, shared_with_all_members: true, ...over,
});

test("Bereitschaft: alle Zustände aus echten Freigabezuständen", () => {
  const ready = readinessState({ status: "ready", members: [member({ is_viewer: true }), member({ name: "Mia" })] });
  assert.equal(ready.state, "READY");

  const mine = readinessState({ status: "missing", members: [member({ is_viewer: true, shared_with_all_members: false }), member({ name: "Mia" })] });
  assert.deepEqual([mine.state, mine.viewerAction, mine.waitingFor], ["MISSING_MINE", "review_shares", []]);

  const others = readinessState({ status: "missing", members: [member({ is_viewer: true }), member({ name: "Mia", shared_with_all_members: false })] });
  assert.deepEqual([others.state, others.viewerAction, others.waitingFor], ["MISSING_OTHERS", null, ["Mia"]]);

  const both = readinessState({ status: "missing", members: [member({ is_viewer: true, shared_with_all_members: false }), member({ name: "Mia", shared_with_all_members: false }), member({ name: "Ben" })] });
  assert.deepEqual([both.state, both.viewerAction, both.waitingFor], ["MISSING_MULTIPLE", "review_shares", ["Mia"]]);

  const noProfile = readinessState({ status: "missing", members: [member({ is_viewer: true, has_current_workstyle: false, shared_with_all_members: false }), member({ name: "Mia" })] });
  assert.deepEqual([noProfile.state, noProfile.viewerAction], ["INSUFFICIENT_WORKSTYLE", "complete_workstyle"]);

  const otherNoProfile = readinessState({ status: "missing", members: [member({ is_viewer: true }), member({ name: "Mia", has_current_workstyle: false, shared_with_all_members: false })] });
  assert.deepEqual([otherNoProfile.state, otherNoProfile.viewerAction, otherNoProfile.waitingFor], ["INSUFFICIENT_WORKSTYLE", null, ["Mia"]]);
});

test("Bereitschaft: Parser nimmt nur Wahrheitswerte und Namen, keine Antworten", () => {
  const parsed = parseTeamReadiness({ status: "missing", members: [{ person_id: "a", name: "", is_viewer: true, has_current_workstyle: true, shared_with_all_members: false, answers: [1, 2] }] });
  assert.deepEqual(parsed, { status: "missing", members: [{ person_id: "a", name: "Founder", is_viewer: true, has_current_workstyle: true, shared_with_all_members: false }] });
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

test("Teamreport-Seite: konkrete Bereitschaft nur für Mitglieder, kein Knopf für fremde Freigaben", () => {
  const page = code("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.match(page, /current === "not_ready" && membership\s*\?\s*parseTeamReadiness/);
  assert.match(page, /get_workstyle_team_share_readiness/);
  const panel = code("src/features/reporting/workstyle/TeamReadinessPanel.tsx");
  assert.match(panel, /viewerAction === "review_shares"/);
  assert.match(panel, /#freigaben/);
  assert.doesNotMatch(panel, /share_workstyle_product|shareWorkstyle|onClick/);
  assert.match(code("src/app/me/profile/workstyle/page.tsx"), /id="freigaben"/);
  for (const locale of ["de", "en"]) {
    const r = json(`messages/${locale}/report.json`).workstyle.readiness;
    assert.ok(r.title && r.reviewShares && r.state.MISSING_OTHERS.includes("{names}"), locale);
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

test("Abschluss: Erfolg, eigenes Arbeitsprofil, Freigaben prüfen, Dashboard - Forschung nachgeordnet, nichts automatisch geteilt", () => {
  const ui = code("src/features/instruments/workstyle/WorkstyleProfileFlow.tsx");
  const done = ui.slice(ui.indexOf("Dein Arbeitsprofil ist bereit."));
  // Phase 11.6C: Aktionen sind ein gemeinsamer Block; Forschung danach nur noch als kleiner Link.
  const actions = ui.slice(ui.indexOf("const actions ="), ui.indexOf("const withdrawal ="));
  assert.ok(actions.indexOf("Arbeitsprofil ansehen") < actions.indexOf("Zum Dashboard"));
  assert.ok(done.indexOf("{actions}") < done.indexOf("Forschung später unterstützen"));
  assert.match(done, /Dein Arbeitsprofil bleibt privat, bis du etwas freigibst\./);
  assert.match(actions, /\/me\/profile\/workstyle#freigaben/);
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

test("Signature: kontextbezogene Pole innerhalb der Konstrukte, Spuren je Person ab drei", () => {
  const sig = src("src/features/reporting/workstyle/SignatureOverview.tsx");
  for (const area of ["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"]) assert.match(sig, new RegExp(`${area}: \\{ left: "`));
  assert.doesNotMatch(sig, /intelligen|rational|Risiko|risikobereit|extravert|Toleranz|gewissenhaft|Intuition|Bauchgefühl|Vision|Typ\b/i);
  assert.match(sig, /const lanes = people\.length >= 3/);
  assert.match(code("src/features/reporting/workstyle/SignatureOverview.tsx"), /overviewMark\(p\.profile, area\.key\)/);
});

test("Einzelbericht: Einstieg → Signature → Richtungen → Bereiche → So liest du das → Anhang", () => {
  const ui = code("src/features/reporting/workstyle/IndividualWorkstyle.tsx");
  const order = ["<SignatureOverview", 'id="ws-findings-title"', 'id="ws-areas-title"', 'id="ws-method-title"', 'className="ws-appendix'].map((m) => ui.indexOf(m));
  order.forEach((at, n) => assert.ok(at > (n ? order[n - 1] : 0), `Reihenfolge ${n}`));
  assert.match(ui, /n\.pattern\.kind === "direction" && n\.pattern\.band !== "middle"/);
});

test("Fähigkeiten-Karte: Mosaik aus dem bestehenden Modell, keine Lückensprache", () => {
  const matrix = code("src/features/reporting/workstyle/ComponentMatrix.tsx");
  assert.match(matrix, /<CapabilityMosaic rows=\{rows\}/);
  assert.match(matrix, /ws-mosaic/);
  assert.doesNotMatch(matrix, /fehlt euch|Lücke|Score|Prozent|vollständig abgedeckt/i);
  assert.match(matrix, /Daraus wird keine fehlende Fähigkeit abgeleitet/);
  assert.match(matrix, /Verantwortung ungeklärt/);
  assert.match(src("src/features/reporting/workstyle/report.css"), /\.ws-report \.ws-mosaic\.grid \{\s*display: grid !important;/);
});

test("Profil-Druck: historische Auswertung standardmäßig nur als Archivkarte", () => {
  const print = code("src/app/me/profile/print/page.tsx");
  assert.match(print, /\{voll && workProfile && !includeLegacy \? \(\s*<ArchiveCard/);
  assert.match(print, /\{voll && !includeLegacy && report \? \(\s*<ArchiveCard/);
});
