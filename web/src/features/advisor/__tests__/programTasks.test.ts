import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { IN_APP_NOTICE_KINDS } from "@/features/notifications/inAppNotice";

/**
 * Aufgaben im Programm (20270329120000): gemeinsam zwischen Startup und Organisation, oder privat. Zugriff, Zuweisung und
 * Hinweise prueft die Datenbank (pgTAP program_tasks); hier: Oberflaeche und Verdrahtung halten sich daran.
 */
const read = (path: string) => readFileSync(path, "utf8");

test("der Zugriff steht in der Datenbank: Team und Organisation des Programms, nie andere Startups oder Mitglieder", () => {
  const sql = read("../supabase/migrations/20270329120000_program_tasks.sql");
  assert.match(sql, /public\.team_program_is_active\(p\.id\)/);
  assert.match(sql, /public\.is_advisor_org_owner_of\(p\.org_id\)/);
  assert.match(sql, /team_program_contacts c where c\.program_id = p\.id and c\.advisor_user_id = auth\.uid\(\)/);
  assert.match(sql, /\(visibility = 'shared' or created_by_user_id = auth\.uid\(\)\)/);
  assert.match(sql, /create trigger drop_program_tasks_on_end/);
  assert.match(sql, /create trigger drop_orphan_private_program_task/);
  // Der Hinweis geht nie an sich selbst und nie bei privaten Aufgaben.
  assert.match(sql, /new\.visibility = 'shared'\s+and new\.assignee_user_id is distinct from auth\.uid\(\)/);
  assert.ok((IN_APP_NOTICE_KINDS as readonly string[]).includes("program_task_assigned"));
  assert.match(sql, /'program_task_assigned'/);
  for (const locale of ["de", "en"]) assert.ok(JSON.parse(read(`messages/${locale}/notices.json`)).kinds.program_task_assigned, locale);
});

test("Teamraum-Aufgaben der Organisation bleiben fuer Startups unsichtbar: eigene Tabelle, eigene Zeilenregel", () => {
  const sql = read("../supabase/migrations/20270329120000_program_tasks.sql");
  assert.match(sql, /create table public\.team_program_tasks/);
  assert.doesNotMatch(sql, /advisor_org_tasks/);
  assert.match(read("messages/de/advisor.json"), /eure internen Aufgaben im Teamraum bleiben für das Startup unsichtbar/);
});

test("Rueckweg wird zusammengesetzt, nie uebernommen: Startup-Seite oder Teamseite der Organisation", () => {
  const actions = read("src/features/advisor/programTaskActions.ts");
  assert.match(actions, /formData\.get\("side"\) === "org" && programId\) return `\/advisor\/programm\/\$\{programId\}\?tab=\$\{goals \? "ziele" : "aufgaben"\}/);
  assert.match(actions, /return `\/programm\$\{extra/);
  assert.match(actions, /p_visibility: !taskId && formData\.get\("visibility"\) === "private" \? "private" : "shared"/);
  for (const fn of ["save_program_task", "move_program_task", "delete_program_task", "set_program_task_visibility"]) assert.match(actions, new RegExp(fn));
});

test("beide Seiten: Reiter Aufgaben bei der Organisation, Bereich auf der Seite Programm der Startups, Block auf Heute und Dashboard", () => {
  assert.match(read("src/app/(product)/advisor/programm/[programId]/page.tsx"), /<ProgramTasks programId=\{programId\} side="org"/);
  assert.match(read("src/app/(product)/programm/page.tsx"), /side="team"/);
  assert.match(read("src/app/(product)/dashboard/page.tsx"), /<MyProgramTasks/);
  assert.match(read("src/app/(product)/advisor/dashboard/page.tsx"), /<MyProgramTasks/);
  const ui = read("src/features/advisor/ProgramTasks.tsx");
  // Loeschen: wer sie angelegt hat oder die Inhaberin bei gemeinsamen Aufgaben; Teilen nur die Person selbst.
  assert.match(ui, /mine \|\| \(isOrgOwner && task\.visibility === "shared"\)/);
  assert.match(ui, /\{mine \? \(\s*<form action=\{setProgramTaskVisibilityAction\}/);
});

test("Texte in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(JSON.parse(read("messages/de/advisor.json")).programTasks).sort(), keys(JSON.parse(read("messages/en/advisor.json")).programTasks).sort());
});

test("Checkliste und Kommentare: Zugang wie bei der Aufgabe, Hinweis nur an die andere Seite", () => {
  const sql = read("../supabase/migrations/20270330120000_program_task_extras_goals.sql");
  assert.match(sql, /jsonb_array_length\(checklist\) <= 30/);
  assert.match(sql, /create policy team_program_task_comments_read[\s\S]*exists \(select 1 from public\.team_program_tasks t where t\.id = task_id\)/);
  assert.match(sql, /v_task\.id is null or v_task\.visibility = 'private'/);
  assert.match(sql, /u is distinct from new\.author_user_id/);
  assert.ok((IN_APP_NOTICE_KINDS as readonly string[]).includes("program_task_comment"));
  for (const locale of ["de", "en"]) assert.ok(JSON.parse(read(`messages/${locale}/notices.json`)).kinds.program_task_comment, locale);
  const ui = read("src/features/advisor/ProgramTasks.tsx");
  assert.match(ui, /checkProgramTaskItemAction/);
  assert.match(ui, /addProgramTaskCommentAction/);
  // Loeschen darf nur die Autorin ihren Kommentar.
  assert.match(ui, /comment\.authorUserId === me \? \(/);
});

test("Ziele: beide Seiten legen an, bearbeiten und haken ab - Loeschen nur Urheber oder Inhaberin, keine Gesamtzahl", () => {
  const sql = read("../supabase/migrations/20270330120000_program_task_extras_goals.sql");
  assert.match(sql, /create policy team_program_goals_read[\s\S]*public\.program_tasks_access\(program_id\)/);
  assert.match(sql, /v_goal\.created_by_user_id = auth\.uid\(\) or exists \(select 1 from public\.team_programs p where p\.id = v_goal\.program_id and public\.is_advisor_org_owner_of/);
  assert.match(sql, /delete from public\.team_program_goals where program_id = new\.id/);
  assert.match(read("src/app/(product)/advisor/programm/[programId]/page.tsx"), /<ProgramGoals programId=\{programId\} side="org"/);
  assert.match(read("src/app/(product)/programm/page.tsx"), /<ProgramGoals\s+programId=\{program\.programId\}\s+side="team"/);
  const ui = read("src/features/advisor/ProgramGoals.tsx");
  assert.doesNotMatch(ui, /\b(score|rank|prozent|percent)\b/i);
  const actions = read("src/features/advisor/programTaskActions.ts");
  assert.match(actions, /formData\.get\("area"\) === "goals"/);
});

test("Fristen: 'In 7 Tagen' statt 'Naechste Woche' (der kommende Montag liess am Freitag nur drei Tage)", () => {
  const ui = read("src/features/advisor/Teamraum.tsx");
  assert.match(ui, /const inSevenDays = addDays\(today, 7\);/);
  assert.match(ui, /\{ value: inSevenDays, label: t\("form\.nextWeek"\) \}/);
  assert.doesNotMatch(ui, /\(8 - weekday\) % 7/);
  assert.equal(JSON.parse(read("messages/de/advisor.json")).teamraum.form.nextWeek, "In 7 Tagen");
  assert.equal(JSON.parse(read("messages/en/advisor.json")).teamraum.form.nextWeek, "In 7 days");
});

test("Texte der Ziele in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(JSON.parse(read("messages/de/advisor.json")).programGoals).sort(), keys(JSON.parse(read("messages/en/advisor.json")).programGoals).sort());
});
