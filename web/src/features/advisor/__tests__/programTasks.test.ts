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
  assert.match(actions, /formData\.get\("side"\) === "org" && programId\) return `\/advisor\/programm\/\$\{programId\}\?tab=aufgaben/);
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
