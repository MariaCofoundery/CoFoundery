import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterTasks, taskOf } from "@/features/advisor/teamraumModel";

/**
 * Private Aufgaben (20270326120000) und "Wer ist wer" (20270327120000): die Regeln stehen in der Datenbank und werden
 * dort von pgTAP gehalten (org_private_tasks, org_member_cards). Hier: die Oberflaeche haelt sich daran.
 */
const read = (path: string) => readFileSync(path, "utf8");
const row = (patch: Record<string, unknown>) => ({ id: "t", org_id: "o", title: "A", status: "open", created_at: "", updated_at: "", ...patch });

test("Aufgaben kennen ihre Sichtbarkeit, der Filter 'Privat' zeigt nur private", () => {
  const tasks = [taskOf(row({ id: "a", visibility: "private" })), taskOf(row({ id: "b", visibility: "team" })), taskOf(row({ id: "c" }))];
  assert.deepEqual(tasks.map((task) => task.visibility), ["private", "team", "team"]);
  assert.deepEqual(filterTasks(tasks, "private", "me").map((task) => task.id), ["a"]);
});

test("Privat gilt beim Anlegen und gehoert der Person allein: keine anderen Zustaendigen, kein Team im Programm", () => {
  const actions = read("src/features/advisor/teamraumActions.ts");
  assert.match(actions, /const isPrivate = !taskId && formData\.get\("visibility"\) === "private";/);
  assert.match(actions, /p_program_id: isPrivate \? null/);
  assert.match(actions, /p_visibility: isPrivate \? "private" : "team"/);
  assert.match(actions, /export async function setOrgTaskVisibilityAction[\s\S]*set_org_task_visibility/);
  const ui = read("src/features/advisor/Teamraum.tsx");
  assert.match(ui, /\{!task \? \(\s*<div>\s*<span className=\{`\$\{LABEL\} mb-2`\}>\{t\("form\.visibilityQuestion"\)\}/);
  // Nur die Person selbst sieht den Knopf zum Umschalten.
  assert.match(ui, /task\.createdByUserId === ctx\.me && ctx\.canWrite \? \(\s*<form action=\{setOrgTaskVisibilityAction\}/);
});

test("die Datenbank sperrt private Aufgaben fuer alle anderen - auch fuer die Inhaberin und fuer security-definer-Funktionen", () => {
  const sql = read("../supabase/migrations/20270326120000_org_private_tasks.sql");
  assert.match(sql, /visibility = 'team' or created_by_user_id = auth\.uid\(\)/);
  assert.match(sql, /create trigger guard_private_org_task\s+before update or delete/);
  assert.match(sql, /create trigger guard_private_org_task_comment/);
  assert.match(sql, /create trigger guard_private_org_task_assignee/);
  assert.match(sql, /create trigger drop_orphan_private_org_task/);
  assert.match(sql, /private_alone check \(visibility = 'team' or \(program_id is null and page_id is null and requirement_id is null\)\)/);
  assert.match(read("../supabase/tests/org_private_tasks.sql"), /the owner of the organisation does not see it either/);
});

test("Wer ist wer: Standard nicht sichtbar, Kontakt nur von der Person selbst, Zuruecknahme gilt", () => {
  const sql = read("../supabase/migrations/20270327120000_org_member_cards.sql");
  assert.match(sql, /shown boolean not null default false/);
  assert.match(sql, /contact = case when v_self then excluded\.contact else public\.advisor_org_member_cards\.contact end/);
  assert.match(sql, /org_card_self_hidden/);
  assert.match(sql, /join public\.advisor_org_members m on m\.org_id = p\.org_id and m\.status = 'active'/);
  assert.match(sql, /public\.team_program_is_active\(p\.id\)/);
  assert.match(sql, /constraint advisor_org_member_cards_hidden check \(not \(shown and self_hidden\)\)/);
  // Die Startups lesen die Tabelle nie direkt.
  assert.doesNotMatch(sql, /grant select on public\.advisor_org_member_cards to anon/);
});

test("Wer ist wer: Karten in Mitglieder & Rollen und im Onboarding, Startups sehen sie unter Programm", () => {
  assert.match(read("src/app/(product)/advisor/organisation/page.tsx"), /<OrgPeopleCards orgId=\{org\.id\}/);
  assert.match(read("src/app/(product)/advisor/los-gehts/page.tsx"), /<OrgPeopleCards[^>]*back="setup"/);
  assert.match(read("src/app/(product)/programm/page.tsx"), /<ProgramPeople people=\{programPeople\} \/>/);
  const model = read("src/features/advisor/setup/setupModel.ts");
  assert.match(model, /"team", "people", "plan"/);
  const cards = read("src/features/advisor/OrgPeopleCards.tsx");
  assert.match(cards, /member\.isSelf \? \(\s*<label className=\{TILE\}>\s*<span className=\{TILE_LABEL\}>\{t\("contact"\)\}/);
  assert.match(cards, /disabled=\{Boolean\(card\?\.selfHidden && !member\.isSelf\)\}/);
  // Der Kontakt wird nur als https-Link oder E-Mail zum Link.
  // Nur https-Links und schlichte Adressen werden zum Link (Prüfung in contactLink.ts, getestet in contactLink.test.ts).
  assert.match(read("src/features/advisor/contactLink.ts"), /\^https:\\\/\\\//);
});

test("Texte in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  const de = JSON.parse(read("messages/de/advisor.json"));
  const en = JSON.parse(read("messages/en/advisor.json"));
  assert.deepEqual(keys(de.people).sort(), keys(en.people).sort());
  assert.deepEqual(keys(de.setup.steps.people).sort(), keys(en.setup.steps.people).sort());
  for (const key of ["visibilityQuestion", "visibilityTeam", "visibilityPrivate", "visibilityHint"]) assert.ok(de.teamraum.form[key] && en.teamraum.form[key], key);
});
