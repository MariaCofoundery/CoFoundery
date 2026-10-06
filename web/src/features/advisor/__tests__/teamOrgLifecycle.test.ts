import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Phase 12C.1B: Team-, Organisations- und Einwilligungs-Lebenszyklus. Die
 * Zugriffsregeln selbst pruefen die pgTAP-Tests in
 * supabase/tests/team_org_lifecycle.sql. Hier: die Vertraege der Migration und
 * die zwei UI-Wege (Team-Einladung ohne Schreiben beim Aufruf, Selbst-Austritt).
 */
const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const MIGRATION = "../supabase/migrations/20261122120000_team_org_lifecycle.sql";
const fnBody = (sql: string, name: string) => {
  const start = sql.indexOf(`function public.${name}(`);
  assert.ok(start > 0, `${name} fehlt`);
  const open = sql.indexOf("$$", start);
  return sql.slice(start, sql.indexOf("$$;", open + 2));
};

test("Team-Einladung: der Seitenaufruf schreibt nichts, finalisiert wird nur im zweiten Slot-Klick", () => {
  const page = codeOnly("src/app/team-invite/[token]/page.tsx");
  assert.ok(!/finalizeAdvisorTeamInvite\w*\(/.test(page), "die Seite finalisiert wieder selbst");
  const data = source("src/features/dashboard/advisorTeamInviteData.ts");
  assert.match(data, /const finalizeResult = await finalizeAdvisorTeamInviteCompletely\(refreshedRow, privileged\)/);
  const loop = data.slice(data.indexOf("export async function finalizeAdvisorTeamInviteCompletely"));
  assert.match(loop.slice(0, 1200), /pass < 3 && !result\.activated && result\.repaired/);
  // relationships hat keine status/revoked_at-Spalten - nur id lesen, nur die Personen schreiben.
  const resolve = data.slice(data.indexOf("async function resolveRelationshipIdForFounders("), data.indexOf("async function loadInvitationBootstrapRow("));
  assert.ok(!/status|revoked_at/.test(resolve.replace(/\/\/.*$/gm, "")), "relationships-Spalten, die es nicht gibt");
  // Keine erzwungene Annahme der Founder-Einladung mehr (12C.0: Annahme nur im Dialog).
  const finalize = data.slice(data.indexOf("export async function finalizeAdvisorTeamInviteIfPossible("));
  assert.ok(!/\.from\("invitations"\)\s*\.update\(/.test(finalize.replace(/\/\/.*$/gm, "")), "die Finalisierung nimmt die Einladung wieder selbst an");
  assert.ok(!/accept_invitation/.test(finalize), "die Finalisierung ruft eine Annahme auf");
});

test("Organisation selbst verlassen: Aktion, Hinweis fuer die letzte Inhaberin, Texte", () => {
  const actions = source("src/features/advisor/orgActions.ts");
  assert.match(actions, /export async function leaveOrgAction[\s\S]*rpc\("leave_advisor_org", \{\s*p_org_id:/);
  const section = source("src/features/advisor/AdvisorOrgSection.tsx");
  assert.match(section, /<form action=\{leaveOrgAction\}/);
  assert.match(section, /member\.role === "owner" && member\.status === "active"\)\.length <= 1/);
  assert.match(section, /t\("leaveLastOwner"\)/);
  for (const locale of ["de", "en"]) {
    const advisor = JSON.parse(source(`messages/${locale}/advisor.json`)) as { org: Record<string, unknown> };
    assert.ok(advisor.org.leave && advisor.org.leaveLastOwner, `${locale}: org.leave*`);
    const invite = JSON.parse(source(`messages/${locale}/invite.json`)) as { teamInvite: Record<string, unknown> & { statusErrors: Record<string, string> } };
    assert.ok(invite.teamInvite.statusErrors.emailNotVerified, `${locale}: statusErrors.emailNotVerified`);
  }
});

test("Migration: Review an Team gebunden, erster Rosterwechsel beendet den Teambericht", () => {
  const sql = source(MIGRATION);
  assert.match(sql, /add column if not exists team_id uuid references public\.founder_teams\(id\) on delete set null/);
  assert.match(fnBody(sql, "decide_advisor_team_review"), /team_id = v_team/);
  assert.match(fnBody(sql, "can_read_workstyle_team"), /r\.team_id=p_team_id and r\.team_access_ended_at is null/);
  const end = fnBody(sql, "end_advisor_team_review_access_after_roster_change");
  assert.match(end, /set team_access_ended_at = pg_catalog\.now\(\)/);
  assert.ok(!/team_access_ended_at\s*=\s*null/.test(sql), "irgendwo wird der Teamzugriff wieder geoeffnet");
  assert.match(sql, /after insert or delete on public\.founder_team_members/);
});

test("Migration: Org-Freigaben ohne Aufleben, Orakel geschlossen, Lebenszyklus", () => {
  const sql = source(MIGRATION);
  const eff = fnBody(sql, "alignment_share_is_effective");
  assert.match(eff, /grant_row\.approved_at <= share\.created_at/);
  assert.match(eff, /member\.activated_at <= share\.created_at/);
  assert.match(fnBody(sql, "stamp_advisor_org_member_activation"), /new\.activated_at := pg_catalog\.now\(\)/);
  for (const name of ["has_advisor_person_access", "has_advisor_team_review_access", "was_ever_advisor_for_team_review", "is_advisor_org_member", "is_accompanied_by_advisor_org"]) {
    assert.match(fnBody(sql, name), /is not distinct from auth\.uid\(\) or auth\.uid\(\) is null/, `${name} ist ein Orakel`);
  }
  assert.match(fnBody(sql, "create_team_intake"), /advisor_org_member_internal\(p_org,id\)/);
  assert.match(sql, /revoke all on function public\.advisor_org_member_internal\(uuid, uuid\) from public, anon, authenticated/);
  assert.match(fnBody(sql, "suspend_advisor_org_without_owner"), /set status = 'suspended'/);
  assert.match(sql, /advisor_person_grants_requested_by_user_id_fkey\s+foreign key \(requested_by_user_id\) references auth\.users\(id\) on delete set null/);
  assert.match(sql, /advisor_team_reviews_requested_by_user_id_fkey\s+foreign key \(requested_by_user_id\) references auth\.users\(id\) on delete set null/);
  const leave = fnBody(sql, "leave_advisor_org");
  assert.match(leave, /advisor_org_needs_an_owner/);
  assert.match(fnBody(sql, "request_advisor_team_review"), /is_network_interaction_blocked\(v_advisor, v_subject\)/);
  assert.match(fnBody(sql, "get_advisor_confirmed_founder_setup"), /confirmation\.user_id = current_member\.user_id/);
  const archive = fnBody(sql, "delete_empty_founder_team_after_member_delete");
  assert.match(archive, /set archived_at = coalesce\(archived_at, pg_catalog\.now\(\)\)/);
  assert.match(archive, /not exists \(select 1 from auth\.users u where u\.id = old\.user_id\)[\s\S]*delete from public\.founder_teams/);
  assert.match(fnBody(sql, "ensure_founder_team_for_relationship"), /founder_team_archived/);
});

test("Eigene Org-Rolle: nur die eigene Mitgliedschaft bestimmt die Knoepfe", () => {
  const data = source("src/features/advisor/orgData.ts");
  const fn = data.slice(data.indexOf("export async function getMyAdvisorOrgs"));
  assert.match(fn.slice(0, fn.indexOf("if (rows.length === 0)")), /\.eq\("user_id", user\.id\)/);
});
