import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
const sql = read("../supabase/migrations/20270407120000_program_event_archive.sql");

test("Termine werden archiviert statt gelöscht: nur die Inhaberin, ein öffentlicher Vorschlag geht zurück", () => {
  assert.match(sql, /add column archived_at timestamptz/);
  assert.match(sql, /create or replace function public\.archive_program_event[\s\S]*is_advisor_org_owner_of\(v_org\)/);
  assert.match(sql, /create or replace function public\.restore_program_event[\s\S]*is_advisor_org_owner_of\(v_org\)/);
  assert.match(sql, /delete from public\.ecosystem_events where id = v_public/);
  // Endgültig löschen gibt es nicht mehr - Teilnahme, Zusagen und Referenten blieben sonst nicht erhalten.
  assert.match(sql, /drop function public\.delete_program_event\(uuid\)/);
  assert.match(sql, /grant execute on function public\.archive_program_event\(uuid\), public\.restore_program_event\(uuid\) to authenticated/);
});

test("Teams sehen und beantworten archivierte Termine nicht; archivierte sind eingefroren", () => {
  const mine = sql.slice(sql.indexOf("FUNCTION public.get_my_program_events"), sql.indexOf("FUNCTION public.get_my_program_event_rsvps"));
  assert.match(mine, /and e\.archived_at is null/);
  const rsvps = sql.slice(sql.indexOf("FUNCTION public.get_my_program_event_rsvps"), sql.indexOf("FUNCTION public.set_program_event_rsvp"));
  assert.match(rsvps, /and e\.archived_at is null/);
  assert.equal((sql.match(/raise exception 'program_event_archived' using errcode = '55000'/g) ?? []).length, 3);
});

test("die Auswertungen zählen archivierte Termine weiter: sie werden hier gar nicht angefasst", () => {
  // Weder die Teilnahme-Auswertung noch die Förderauflagen noch die Hilfsfunktion, auf der sie beruhen.
  for (const name of ["get_org_report_attendance", "get_org_funding_progress", "program_event_reaches", "program_report_programs"]) {
    assert.ok(!sql.includes(`FUNCTION public.${name}`) && !sql.includes(`function public.${name}`), name);
  }
});

test("Oberfläche: Bestätigung statt Ein-Klick-Löschen, Archiv im Programmplan, Wiederherstellen", () => {
  const panel = code("src/features/advisor/calendar/EventPanel.tsx");
  assert.match(panel, /<details[\s\S]*archiveProgramEventAction[\s\S]*t\("archiveConfirm"\)/);
  assert.doesNotMatch(panel, /deleteProgramEventAction|planDelete/);
  const actions = code("src/features/advisor/teamProgramActions.ts");
  assert.match(actions, /rpc\("archive_program_event"/);
  assert.match(actions, /rpc\("restore_program_event"/);
  assert.doesNotMatch(actions, /rpc\("delete_program_event"/);
  const plan = code("src/features/advisor/calendar/PlanView.tsx");
  assert.match(plan, /restoreProgramEventAction/);
  assert.match(plan, /t\("archiveHeading"/);
  // Der Plan zeigt nur aktive Termine; das Archiv kommt getrennt.
  const data = code("src/features/advisor/teamProgramData.ts");
  assert.match(data, /active: all\.filter\(\(event\) => !event\.archivedAt\)/);
  assert.match(data, /return \(await listProgramEventsSplit\(client, orgId\)\)\.active;/);
});

test("deutsch und englisch haben dieselben Texte für das Archiv", () => {
  for (const key of ["archiveTitle", "archiveText", "archiveConfirm"]) {
    for (const locale of ["de", "en"]) assert.ok(JSON.parse(read(`messages/${locale}/advisor.json`)).calendar.panel[key], `${locale} panel.${key}`);
  }
  for (const key of ["archiveHeading", "archiveNote", "restore", "archived", "restored"]) {
    for (const locale of ["de", "en"]) assert.ok(JSON.parse(read(`messages/${locale}/advisor.json`)).calendar.plan[key], `${locale} plan.${key}`);
  }
});
