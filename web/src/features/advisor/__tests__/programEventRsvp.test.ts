import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const sql = source("../supabase/migrations/20270307120000_program_event_rsvps.sql");
const rsvp = source("src/features/advisor/ProgramEventRsvp.tsx");
const teamPage = source("src/app/(product)/programm/page.tsx");
const plan = source("src/features/advisor/OrgProgramPlan.tsx");

test("Zusagen: je Person, nur ja oder nein, nur vor Beginn, Tabelle geschlossen", () => {
  assert.match(sql, /primary key \(event_id, program_id, user_id\)/);
  assert.match(sql, /check \(response in \('yes', 'no'\)\)/);
  assert.match(sql, /if v_starts <= pg_catalog\.now\(\) then/);
  assert.match(sql, /revoke all on public\.team_program_event_rsvps from anon, authenticated/);
});

test("der Knopf fuers ganze Team ueberschreibt keine eigene Antwort", () => {
  assert.match(
    sql,
    /where public\.team_program_event_rsvps\.user_id = auth\.uid\(\)\s+or public\.team_program_event_rsvps\.set_by_user_id is distinct from public\.team_program_event_rsvps\.user_id;/
  );
  // Zuruecknehmen geht nur fuer sich selbst.
  assert.match(sql, /delete from public\.team_program_event_rsvps\s+where event_id = p_event_id and program_id = p_program_id and user_id = auth\.uid\(\);/);
});

test("Zusagen enden mit dem Team, dem Programm und dem Konto - und stehen im Export", () => {
  assert.match(sql, /user_id uuid not null references auth\.users \(id\) on delete cascade/);
  assert.match(sql, /after delete on public\.founder_team_members/);
  assert.match(sql, /delete from public\.team_program_event_rsvps where program_id = new\.id;/);
  // Die bestehenden Aufraeumschritte bleiben im Trigger.
  for (const table of ["team_program_attendance", "advisor_private_notes", "advisor_follow_ups"]) {
    assert.match(sql, new RegExp(`delete from public\\.${table} where program_id = new\\.id;`));
  }
  assert.match(sql, /'team_program_event_rsvps', coalesce/);
});

test("das Team liest ueber die eigene Funktion, die Organisation ueber ihre", () => {
  assert.match(teamPage, /getMyProgramEventRsvps\(client\)/);
  assert.doesNotMatch(teamPage, /getEventRsvps\(/);
  assert.match(plan, /getEventRsvps\(/);
  // Zusagen nur fuer kommende Veranstaltungen; danach zaehlt die Anwesenheit.
  assert.match(teamPage, /new Date\(event\.startsAt\)\.getTime\(\) > now \? \(\s*<ProgramEventRsvp/);
  // Die Anwesenheit traegt weiter nur die Organisation ein.
  assert.doesNotMatch(teamPage + rsvp, /setProgramAttendanceAction/);
});

test("bequem und ohne Wertung: eigene Knoepfe, ein Knopf fuers Team, keine Zahlen beim Team", () => {
  assert.match(rsvp, /aria-pressed=\{me\.response === response\}/);
  assert.match(rsvp, /name="whole" value="1"/);
  assert.match(rsvp, /others\.length > 0 && rows\.some/);
  assert.doesNotMatch(rsvp + plan, /score|rank|percent|ampel|traffic/i);
  assert.match(rsvp, /t\("rsvpNote"\)/);
});

test("DE und EN tragen dieselben Zusage-Texte", () => {
  const keys = (locale: string) =>
    Object.keys(JSON.parse(source(`messages/${locale}/advisor.json`)).teamProgram as Record<string, string>)
      .filter((key) => key.startsWith("rsvp") || key.startsWith("planRsvp"))
      .sort();
  assert.ok(keys("de").length >= 14);
  assert.deepEqual(keys("en"), keys("de"));
});
