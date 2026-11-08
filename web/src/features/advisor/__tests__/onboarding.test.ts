import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { OWNER_STEPS, setupProgress, stepHref, type SetupFacts } from "@/features/advisor/setup/setupModel";

const read = (path: string) => readFileSync(path, "utf8");
const facts = (done: string[]): SetupFacts =>
  Object.fromEntries(["profile", "features", "team", "people", "plan", "teams", "teamraum", "phone", "role"].map((key) => [key, done.includes(key)])) as SetupFacts;

test("Los geht's: erledigt ergibt sich aus den Daten, uebersprungen bleibt nachholbar, der naechste offene Schritt", () => {
  const progress = setupProgress(OWNER_STEPS, facts(["profile", "features", "team"]), ["plan"]);
  assert.equal(progress.done, 3);
  assert.equal(progress.total, 8);
  assert.equal(progress.items.find((item) => item.key === "plan")?.state, "skipped");
  assert.equal(progress.next, "people");
  assert.equal(setupProgress(OWNER_STEPS, facts([...OWNER_STEPS]), []).complete, true);
  // Jeder Schritt fuehrt an seinen festen Ort und von dort zurueck.
  assert.match(stepHref("plan", "o"), /ansicht=plan&losgehts=1$/);
  assert.match(stepHref("people", "o"), /tab=members&losgehts=1#wer-ist-wer$/);
  assert.equal(stepHref("phone", "o"), "/account#handy");
});

test("Los geht's: Start zeigt den Stand, bis alles erledigt oder ausgeblendet ist; Seite, Rueckweg und Tipps", () => {
  const start = read("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(start, /!setup\.hidden && !setup\.progress\.complete/);
  assert.match(start, /<StartEvents /);
  assert.match(read("src/features/advisor/TeamraumScreen.tsx"), /<AreaTips area="teamraum" \/>/);
  // Das Banner "zurueck zu Los geht's" ist seit dem 06.11.2026 die Leiste unten (SetupBar), die auch Formulare uebersteht.
  assert.doesNotMatch(read("src/app/(product)/advisor/organisation/page.tsx"), /SetupReturnBanner/);
  const tip = read("src/features/ui/FirstVisitTip.tsx");
  assert.match(tip, /try \{\s*if \(window\.localStorage\.getItem\(key\) !== "seen"\)/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/advisor.json`));
    for (const step of [...OWNER_STEPS, "role"]) {
      for (const field of ["title", "short", "text", "place", "doneWhen"]) assert.ok(messages.setup.steps[step][field], `${locale} ${step}.${field}`);
    }
  }
});

test("Termine: Fuer wen statt Art, interne nie fuer Teams, Aufgaben und Foerderung haengen am Termin", () => {
  const sql = read("../supabase/migrations/20270325120000_program_event_details.sql");
  for (const fn of ["get_my_program_events", "get_my_program_event_rsvps", "get_event_attendance", "get_event_rsvps", "get_org_report_attendance"]) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    assert.match(body.slice(0, body.indexOf("$$;")), /public\.program_event_reaches\(e\.id, p\.(program_)?id\)/, fn);
  }
  assert.match(sql, /update public\.team_program_events set audience = 'internal' where kind = 'internal';/);
  const form = read("src/features/advisor/EventFormFields.tsx");
  assert.match(form, /name="audience"/);
  assert.match(form, /name="orgaTask"/);
  assert.match(form, /name="internalNote"/);
  const actions = read("src/features/advisor/teamProgramActions.ts");
  assert.match(actions, /formData\.get\("orgaTask"\) === "yes"[\s\S]*createOrgaChecklist\(client, orgId, savedId/);
  assert.match(actions, /async function createOrgaChecklist[\s\S]*client\.rpc\("save_org_task"[\s\S]*p_event_id: eventId/);
  // Teamzeile und Teamseite fuehren zu Aufgaben und Terminen dieses Teams.
  assert.match(read("src/features/advisor/OrgTeamProgramsSection.tsx"), /\/advisor\/teamraum\/aufgaben\?\$\{new URLSearchParams\(\{ org: org\.id, team: program\.programId \}\)/);
  assert.match(read("src/app/(product)/advisor/programm/[programId]/page.tsx"), /team: programId/);
});

test("Einrichtung ohne Hin und Her: Cookie merkt den Schritt, die Leiste unten fuehrt zurueck und weiter", async () => {
  const { OWNER_STEPS, MEMBER_STEPS, formatSetupSession, neighbourSteps, parseSetupSession, setupStepUrl } = await import("@/features/advisor/setup/setupModel");
  const org = "5498b60c-508a-4da4-b31b-9422d64b2786";
  const session = { orgId: org, kind: "owner" as const, step: "team" as const };
  assert.deepEqual(parseSetupSession(formatSetupSession(session)), session);
  // Unsinn und fremde Schritte gelten nicht: ein Mitglied kennt keine Inhaber-Schritte.
  assert.equal(parseSetupSession("quatsch"), null);
  assert.equal(parseSetupSession(formatSetupSession({ orgId: org, kind: "member", step: "plan" as never })), null);
  assert.equal(parseSetupSession(undefined), null);
  const middle = neighbourSteps(session);
  assert.deepEqual([middle.prev, middle.next, middle.total], ["features", "people", OWNER_STEPS.length]);
  assert.equal(neighbourSteps({ orgId: org, kind: "owner", step: OWNER_STEPS[0] }).prev, null);
  assert.equal(neighbourSteps({ orgId: org, kind: "member", step: MEMBER_STEPS[MEMBER_STEPS.length - 1] }).next, null);
  assert.match(setupStepUrl(org, "plan"), /^\/advisor\/los-gehts\?org=[0-9a-f-]+&schritt=plan$/);
  // Seite und Leiste.
  const page = read("src/app/(product)/advisor/los-gehts/page.tsx");
  assert.match(page, /<SetupSessionWriter session=\{\{ orgId: org\.id, kind: setup\.isOwner \? "owner" : "member", step: current \}\} \/>/);
  assert.match(page, /\{t\("prevStep"\)\}/);
  const bar = read("src/features/advisor/setup/SetupSessionClient.tsx");
  assert.match(bar, /pathname\.startsWith\("\/advisor\/los-gehts"\)/);
  assert.match(bar, /t\("bar\.next"\)/);
  assert.match(read("src/features/navigation/workspace/WorkspaceChrome.tsx"), /<SetupBar \/>/);
  // Der Cookie ist reine Darstellung.
  assert.doesNotMatch(bar, /rpc\(|supabase/);
});
