import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addDays,
  boardColumns,
  checklistToText,
  filterTasks,
  isAway,
  myWeek,
  openCountsByMember,
  parseChecklist,
  taskFilterOf,
  taskOf,
  unassignedTasks,
  type OrgTask,
} from "@/features/advisor/teamraumModel";

const task = (overrides: Partial<OrgTask>): OrgTask => ({
  id: overrides.id ?? "t",
  orgId: "o",
  title: "Aufgabe",
  details: null,
  status: "open",
  assigneeUserId: null,
  dueOn: null,
  programId: null,
  eventId: null,
  pageId: null,
  checklist: [],
  createdByUserId: "me",
  createdAt: "2026-11-01T10:00:00Z",
  updatedAt: "2026-11-01T10:00:00Z",
  doneAt: null,
  ...overrides,
});

const TODAY = "2026-11-05";

test("Teamraum: Diese Woche trennt Ueberfaelliges, die naechsten sieben Tage und den Rest", () => {
  const tasks = [
    task({ id: "late", assigneeUserId: "me", dueOn: "2026-11-03" }),
    task({ id: "soon", assigneeUserId: "me", dueOn: "2026-11-12" }),
    task({ id: "later", assigneeUserId: "me", dueOn: "2026-11-13" }),
    task({ id: "nodate", assigneeUserId: "me" }),
    task({ id: "done", assigneeUserId: "me", dueOn: "2026-11-01", status: "done" }),
    task({ id: "other", assigneeUserId: "you", dueOn: "2026-11-04" }),
  ];
  const week = myWeek(tasks, "me", TODAY);
  assert.deepEqual(week.overdue.map((entry) => entry.id), ["late"]);
  assert.deepEqual(week.thisWeek.map((entry) => entry.id), ["soon"]);
  assert.equal(week.later, 2);
});

test("Teamraum: Board-Spalten sortieren nach Faelligkeit, Erledigtes zuletzt erledigt zuerst und gekappt", () => {
  const tasks = [
    task({ id: "b", dueOn: "2026-11-09" }),
    task({ id: "a", dueOn: "2026-11-06" }),
    task({ id: "c" }),
    ...Array.from({ length: 10 }, (_, index) => task({ id: `d${index}`, status: "done", doneAt: `2026-11-0${index % 9 + 1}T08:00:00Z` })),
  ];
  const columns = boardColumns(tasks, 8);
  assert.deepEqual(columns.open.map((entry) => entry.id), ["a", "b", "c"]);
  assert.equal(columns.done.length, 8);
  assert.equal(columns.doneHidden, 2);
  assert.ok(columns.done[0].doneAt! >= columns.done[1].doneAt!);
});

test("Teamraum: Filter, niemand zustaendig und Zaehler je Person sind Anzahl, keine Wertung", () => {
  const tasks = [
    task({ id: "1", assigneeUserId: "me", dueOn: "2026-11-01" }),
    task({ id: "2", assigneeUserId: "me" }),
    task({ id: "3" }),
    task({ id: "4", status: "done" }),
  ];
  assert.deepEqual(filterTasks(tasks, "mine", "me").map((entry) => entry.id), ["1", "2"]);
  assert.deepEqual(filterTasks(tasks, "nobody", "me").map((entry) => entry.id), ["3", "4"]);
  assert.deepEqual(unassignedTasks(tasks).map((entry) => entry.id), ["3"]);
  assert.deepEqual(openCountsByMember(tasks, TODAY).get("me"), { open: 2, overdue: 1 });
  assert.equal(taskFilterOf("mine"), "mine");
  assert.equal(taskFilterOf("<script>"), "all");
});

test("Teamraum: Checkliste als Text hin und zurueck, leere Zeilen fallen weg, hoechstens dreissig", () => {
  const items = parseChecklist("[x] Angebot vergleichen\n\n- [ ] Zusage schicken\nCatering fragen\n[X] Technik");
  assert.deepEqual(items, [
    { text: "Angebot vergleichen", done: true },
    { text: "Zusage schicken", done: false },
    { text: "Catering fragen", done: false },
    { text: "Technik", done: true },
  ]);
  assert.deepEqual(parseChecklist(checklistToText(items)), items);
  assert.equal(parseChecklist(Array.from({ length: 40 }, (_, index) => `Punkt ${index}`).join("\n")).length, 30);
});

test("Teamraum: Datumsrechnung ohne Zeitzonen-Sprung, Abwesenheit endet nach dem Datum", () => {
  assert.equal(addDays("2026-10-25", 7), "2026-11-01");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(isAway({ userId: "u", teamRole: null, awayUntil: "2026-11-05", standInUserId: null }, TODAY), true);
  assert.equal(isAway({ userId: "u", teamRole: null, awayUntil: "2026-11-04", standInUserId: null }, TODAY), false);
  assert.equal(isAway(undefined, TODAY), false);
});

test("Teamraum: Zeilen aus der Datenbank - unbekannter Stand wird offen, kaputte Checklisten-Eintraege fallen weg", () => {
  const row = taskOf({ id: "x", org_id: "o", title: "T", status: "weird", checklist: [{ text: "ok", done: true }, 7, { done: true }], created_at: "a", updated_at: "a" });
  assert.equal(row.status, "open");
  assert.deepEqual(row.checklist, [{ text: "ok", done: true }]);
});

test("Teamraum: nur fuer Mitglieder, Zugriff in der Datenbank, nie fuer Teams im Programm", () => {
  const sql = readFileSync("../supabase/migrations/20270312120000_org_teamraum.sql", "utf8");
  for (const table of ["advisor_org_tasks", "advisor_org_task_comments", "advisor_org_member_presence"]) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`));
    assert.match(sql, new RegExp(`grant select on public\\.${table} to authenticated;`));
    assert.match(sql, new RegExp(`on public\\.${table}\\s+for select to authenticated using \\(public\\.is_advisor_org_member\\(org_id\\)\\)`));
  }
  // Ein Team verknuepft nur, wer es sieht; der Name kommt nicht aus der Aufgabe.
  assert.match(sql, /not public\.can_see_org_program\(v_org, p_program_id\)/);
  assert.doesNotMatch(sql, /team_name/);
  // Kein Verweis auf auth.users blockiert eine Kontoloeschung.
  assert.doesNotMatch(sql, /references auth\.users \(id\)(?! on delete (cascade|set null))/);
  const ui = readFileSync("src/features/advisor/Teamraum.tsx", "utf8");
  assert.match(ui, /program\?\.name \?\? t\("hiddenProgram"\)/);
  assert.doesNotMatch(ui, /score|rank|percent|compatib|leistung/i);
});

test("Teamraum: Aktionen bauen den Rueckweg selbst und rufen nur die Datenbankfunktionen", () => {
  const actions = readFileSync("src/features/advisor/teamraumActions.ts", "utf8");
  for (const rpc of ["save_org_task", "move_org_task", "take_org_task", "check_org_task_item", "delete_org_task", "add_org_task_comment", "delete_org_task_comment", "set_my_org_presence"]) {
    assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.doesNotMatch(actions, /\.from\("advisor_org_/);
  assert.doesNotMatch(actions, /formData\.get\("returnTo"\)/);
  assert.match(actions, /\["week", "tasks", "pages", "who"\]\.includes/);
});

test("Teamraum: eigene Gruppe in der Organisation, auf dem Advisor-Start und im Kontoexport", () => {
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(page, /\{ key: "team", tabs: \["week", "tasks", "pages", "who"\] \}/);
  assert.match(page, /canWrite: org\.status === "active"/);
  const start = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(start, /listMyDueOrgTasks\(client, user\.id\)/);
  const exported = readFileSync("src/features/account/accountExport.ts", "utf8");
  for (const table of ["advisor_org_tasks", "advisor_org_task_comments", "advisor_org_member_presence"]) assert.match(exported, new RegExp(`table: "${table}"`));
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.equal(Object.keys(messages.teamraum.status).length, 4, locale);
    assert.ok(messages.area.start.orgTask, locale);
  }
});

test("Teamraum-Mitteilungen: Hinweis in der Datenbank, Mitteilung ohne Titel, abbestellbar, taeglicher Lauf", () => {
  const sql = readFileSync("../supabase/migrations/20270316120000_org_task_notices.sql", "utf8");
  assert.match(sql, /p_recipient_user_id = auth\.uid\(\)/);
  assert.match(sql, /public\.wants_email_notification\(n\.recipient_user_id, 'org_tasks'\)/);
  assert.match(sql, /after delete on public\.advisor_org_tasks/);
  const push = readFileSync("src/features/advisor/teamraumNotifications.ts", "utf8");
  assert.doesNotMatch(push, /title: task|\.title\b(?!\`)|programName|teamName/);
  for (const locale of ["de", "en"]) {
    const copy = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")).teamraum.push;
    for (const kind of ["org_task_assigned", "org_task_comment", "org_task_due"]) assert.ok(copy[kind].title && copy[kind].body, `${locale} ${kind}`);
  }
  const cron = readFileSync("src/app/api/cron/connect-suggestions/route.ts", "utf8");
  assert.match(cron, /runOrgTaskDueNotices\(\)/);
  const account = readFileSync("src/features/account/AccountPreferencesSection.tsx", "utf8");
  assert.match(account, /\.filter\(\(\{ kind \}\) => !optedOut\.includes\(kind\)\)\s*\.map\(\(\{ kind \}\) => <input key=\{kind\} type="hidden" name="notification" value=\{kind\} \/>\)/);
});
