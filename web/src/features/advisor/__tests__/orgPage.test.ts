import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");

test("die Organisationsseite hat vier Reiter und waehlt zwischen mehreren Organisationen", () => {
  assert.match(page, /\["overview", "teams", "people", "settings"\]/);
  assert.match(page, /orgs\.find\(\(entry\) => entry\.id === query\.org\) \?\? orgs\[0\]/);
  assert.match(page, /orgs\.length > 1/);
});

test("die Seite zeigt Zaehler und Plaetze - keine Gesamtwertung, keine Rangfolge", () => {
  assert.match(page, /countOrgSeatsUsed\(/);
  assert.doesNotMatch(page, /score|rank|percent|compatib/i);
  // Teams kommen aus dem, was diese Person ohnehin sehen darf.
  assert.match(page, /getAdvisorDashboardTeams\(user\.id\)/);
});

test("Aktionen der Organisation kehren in den Reiter Mitglieder und Einstellungen zurueck", () => {
  const actions = readFileSync("src/features/advisor/orgActions.ts", "utf8");
  assert.match(actions, /const TAB = "tab=settings"/);
  assert.match(page, /tab === "settings" \? \(\s*<>\s*<AdvisorOrgSection/);
  assert.match(page, /<OrgTeamProgramsSection/);
});

test("Team-Programm: Zustimmung und Einloesen laufen nur ueber die Datenbankfunktionen, der Link steht nur einmal da", () => {
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  for (const rpc of ["create_team_program_invite", "start_team_program", "consent_team_program", "end_team_program", "set_team_program_contacts"]) {
    assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.match(actions, /createHash\("sha256"\)/);
  const section = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(section, /inviteShownOnce/);
  assert.match(section, /\[0-9a-f\]\{48\}/);
});

test("Meilensteine: Fortschritt ist eine Zahl gegen das eigene Ziel, die Rueckkehr ist begrenzt, es gibt keine Wertung", () => {
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_team_program_milestone"/);
  assert.match(actions, /safeReturn/);
  const ui = readFileSync("src/features/advisor/ProgramMilestones.tsx", "utf8");
  assert.match(ui, /msProgress/);
  assert.doesNotMatch(ui, /score|rank|compatib|ampel|traffic/i);
  const sql = readFileSync("../supabase/migrations/20270118120000_team_program_milestones.sql", "utf8");
  assert.match(sql, /can_use_team_program/);
  assert.match(sql, /team_program_is_active\(p_program_id\)/);
});

test("Programm-Updates: Hinweis im Postfach plus Mitteilung und Mail nach Zustimmung, ein Lauf im taeglichen Cron, nur Team antwortet", () => {
  const route = readFileSync("src/app/api/cron/connect-suggestions/route.ts", "utf8");
  assert.match(route, /runProgramUpdateReminders\(\)/);
  const run = readFileSync("src/features/advisor/programUpdateReminders.ts", "utf8");
  assert.match(run, /prepare_program_update_reminders/);
  assert.match(run, /wants_email/);
  assert.match(run, /sendNetworkNotificationEmail/);
  const sql = readFileSync("../supabase/migrations/20270119120000_team_program_updates.sql", "utf8");
  assert.match(sql, /'program_update_due'/);
  assert.match(sql, /grant execute on function public\.prepare_program_update_reminders\(integer\) to service_role/);
  const notify = readFileSync("../supabase/migrations/20270120120000_program_update_notifications.sql", "utf8");
  assert.match(notify, /'program_update_email'/);
  assert.match(notify, /wants_email_channel/);
});
