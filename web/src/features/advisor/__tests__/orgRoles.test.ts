import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ORG_RIGHTS, ORG_ROLES, invitableRoles, isLeadRole, overridesOf, parseOverrides, rightPreset, rightsOf, roleAllows } from "@/features/advisor/orgRights";
import { buildWorkspaceNav, flattenWorkspaceNav, limitNavByRights } from "@/features/navigation/workspace/workspaceNav";

/**
 * Rollen der Organisation (20270410120000): Admin (technisch `owner`), Koordination, Advisor, Gast - mit Rechten pro Person.
 * Die Datenbank entscheidet (pgTAP: org_roles.sql); hier: das Spiegelbild in TypeScript, die Oberflaeche und die Texte.
 */
const read = (path: string) => readFileSync(path, "utf8");
const sql = read("../supabase/migrations/20270410120000_org_roles.sql");

test("die Voreinstellungen in TypeScript sind die der Datenbank", () => {
  for (const role of ORG_ROLES) {
    const match = sql.match(new RegExp(`when '${role}' then p_right (?:in \\(([^)]*)\\)|= '(\\w+)')`));
    assert.ok(match, role);
    const inSql = (match[1] ?? `'${match[2]}'`).split(",").map((part) => part.trim().replaceAll("'", ""));
    assert.deepEqual([...ORG_RIGHTS].filter((right) => rightPreset(role, right)).sort(), [...inSql].sort(), role);
  }
  assert.match(sql, /select p_right in \('invite', 'plan', 'teams', 'people', 'room', 'results', 'profile'\)\s+and \(p_role <> 'guest' or p_right = 'results'\)/);
});

test("Rechte: Admin hat alles, ein Gast hoechstens die Auswertung, Abweichungen ueberschreiben die Rolle", () => {
  assert.ok(ORG_RIGHTS.every((right) => rightsOf("owner", { plan: false })[right]));
  const guest = rightsOf("guest", { plan: true, results: false });
  assert.deepEqual(ORG_RIGHTS.filter((right) => guest[right]), []);
  assert.equal(roleAllows("guest", "room"), false);
  const advisor = rightsOf("advisor", { plan: true, room: false });
  assert.equal(advisor.plan, true);
  assert.equal(advisor.room, false);
  assert.equal(advisor.invite, false);
  assert.equal(rightsOf("coordinator").plan, true);
});

test("gespeichert wird nur, was von der Voreinstellung abweicht; Unbekanntes zaehlt nicht", () => {
  assert.deepEqual(overridesOf("advisor", { plan: true, room: true, invite: false }), { plan: true });
  assert.deepEqual(overridesOf("guest", { plan: true, results: false }), { results: false });
  assert.deepEqual(parseOverrides({ plan: true, fly: true, room: "yes" }), { plan: true });
  assert.deepEqual(parseOverrides(null), {});
});

test("Admin oder Koordination fuehren; Admins ernennt nur ein Admin", () => {
  assert.equal(isLeadRole("owner"), true);
  assert.equal(isLeadRole("coordinator"), true);
  assert.equal(isLeadRole("advisor"), false);
  assert.equal(isLeadRole("guest"), false);
  assert.ok(invitableRoles(true).includes("owner"));
  assert.ok(!invitableRoles(false).includes("owner"));
});

test("die Seitenleiste bietet nur an, was die Rolle oeffnen darf", () => {
  const keys = (role: Parameters<typeof limitNavByRights>[1], overrides = {}) =>
    flattenWorkspaceNav(limitNavByRights(buildWorkspaceNav({ hasOrg: true }), role, rightsOf(role ?? "advisor", overrides))).map((item) => item.key);
  assert.deepEqual(keys("guest").sort(), ["calendar", "home", "plan", "report"]);
  assert.ok(!keys("guest", { results: false }).includes("report"));
  assert.ok(!keys("advisor", { room: false }).some((key) => ["tasks", "chat", "pages", "social"].includes(key)));
  assert.ok(keys("advisor").includes("tasks"));
  assert.ok(keys("coordinator").includes("setup"));
  assert.ok(!keys("advisor").includes("setup"));
  assert.ok(keys("advisor", { teams: true }).includes("setup"));
});

test("Datenbank: Gaeste in eigener Tabelle, ein Pruefpunkt fuer Rechte, der letzte Admin bleibt", () => {
  assert.match(sql, /create table public\.advisor_org_guests/);
  assert.match(sql, /create or replace function public\.org_has_right\(p_org_id uuid, p_right text\)/);
  assert.match(sql, /create or replace function public\.is_advisor_org_lead_of/);
  assert.match(sql, /advisor_org_needs_an_owner/);
  // Wer das Recht hat, gibt es nur Admins: Rechte setzen und Rollen aendern.
  assert.match(sql, /set_org_member_rights[\s\S]*member\.role = 'owner' and member\.status = 'active'[\s\S]*org_rights_admin_fixed/);
  // Einladen: auch mit Recht, aber Admins ernennt nur ein Admin.
  assert.match(sql, /not public\.org_has_right\(p_org_id, 'invite'\)\s+or \(v_role = 'owner' and not public\.is_advisor_org_owner_of\(p_org_id\)\)/);
  // Kalender fuer Gaeste ohne interne Notizen.
  assert.match(sql, /case when public\.is_advisor_org_member\(p_org_id\) then e\.internal_note end/);
  // Ein Vorschlag laedt niemanden ein: erst die Entscheidung.
  assert.match(sql, /create unique index org_suggestion_one_open/);
  // Erfolge, Funktionen und Foerderauflagen bleiben beim Admin.
  for (const name of ["set_org_features", "save_org_grant", "save_outcome_catalog_item", "set_success_enabled"]) {
    assert.doesNotMatch(sql, new RegExp(`function public\\.${name}\\b`), `${name} wird nicht angefasst`);
  }
});

test("Oberflaeche: Gaeste sind keine Mitglieder, Rechte steuern die Seiten, Vorschlag statt Einladung", () => {
  const data = read("src/features/advisor/orgData.ts");
  assert.match(data, /options\.withGuests \|\| member\.role !== "guest"/);
  assert.match(data, /from\("advisor_org_guests"\)/);
  const page = read("src/app/(product)/advisor/organisation/page.tsx");
  assert.match(page, /if \(org\.role === "guest" && tab !== "report"\) redirect\(base\("report"\)\)/);
  assert.match(page, /getOrgMembers\(client, org\.id, \{ withGuests: true \}\)/);
  const panel = read("src/features/advisor/OrgMembersPanel.tsx");
  assert.match(panel, /const canSuggest = !canInvite/);
  assert.match(panel, /action=\{suggestOrgInviteAction\}/);
  assert.match(panel, /action=\{setOrgMemberRightsAction\}/);
  // Rechte stellt nur ein Admin ein; die Letzte Admin-Rolle laesst sich nicht abwaehlen.
  assert.match(panel, /const mayEditRole = isAdmin &&/);
  assert.match(panel, /lastAdmin && role !== "owner"/);
  assert.match(read("src/features/advisor/TeamraumScreen.tsx"), /if \(!org\.rights\.room\) redirect\("\/advisor\/dashboard"\)/);
  assert.match(read("src/app/(product)/advisor/dashboard/page.tsx"), /orgs\[0\]\?\.role === "guest"\) return <GuestStart/);
  const actions = read("src/features/advisor/orgActions.ts");
  assert.match(actions, /export async function decideOrgInviteSuggestionAction/);
  // Die Einladung entsteht wie jede andere - erst bei "Einladen", nie beim Vorschlag.
  assert.match(actions, /export async function suggestOrgInviteAction[\s\S]*suggest_advisor_org_invite/);
  assert.doesNotMatch(actions.slice(actions.indexOf("export async function suggestOrgInviteAction"), actions.indexOf("export async function decideOrgInviteSuggestionAction")), /sendAdvisorOrgInviteEmail/);
});

test("Texte in beiden Sprachen: Rollen, Rechte, Vorschlaege, Gast", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  const de = JSON.parse(read("messages/de/advisor.json"));
  const en = JSON.parse(read("messages/en/advisor.json"));
  assert.deepEqual(keys(de.org).sort(), keys(en.org).sort());
  assert.deepEqual(keys(de.guestStart).sort(), keys(en.guestStart).sort());
  for (const role of ORG_ROLES) assert.ok(de.org.roles[role] && en.org.roles[role] && de.org.roleDesc[role] && en.org.roleDesc[role], role);
  for (const right of ORG_RIGHTS) assert.ok(de.org.rights[right].label && en.org.rights[right].label, right);
  assert.equal(de.org.roles.owner, "Admin");
  assert.equal(en.org.roles.owner, "Admin");
});
