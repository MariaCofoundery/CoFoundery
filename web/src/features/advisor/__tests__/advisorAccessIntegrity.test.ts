import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Phase 12C.1A: Advisor-Zugriffe. Die eigentlichen Zugriffsregeln pruefen die
 * pgTAP-Tests in supabase/tests/advisor_access_integrity.sql (ueber die echten
 * RPCs als jeweilige Person). Hier: die Vertraege der Migration und der eine
 * UI-Weg, der dabei tot war.
 */
const source = (path: string) => readFileSync(path, "utf8");
const MIGRATION = "../supabase/migrations/20261121120000_advisor_access_integrity.sql";
const fnBody = (sql: string, name: string) => {
  const start = sql.indexOf(`function public.${name}(`);
  assert.ok(start > 0, `${name} fehlt in der Migration`);
  return sql.slice(start, sql.indexOf("$$;", sql.indexOf("$$", start) + 2));
};

test("Legacy-Advisor-Bindung: Zustimmungen setzt nur der Server", () => {
  const sql = source(MIGRATION);
  const guard = fnBody(sql, "guard_legacy_workbook_advisor_consent");
  assert.match(guard, /current_user in \('postgres', 'supabase_admin', 'service_role'\)/);
  for (const column of ["founder_a_approved", "founder_b_approved", "approved_at", "claimed_at", "token_hash", "requested_by", "invitation_id"]) {
    assert.match(guard, new RegExp(`new\\.${column} is distinct from old\\.${column}`), `${column} ist frei schreibbar`);
  }
  assert.match(guard, /tg_op = 'INSERT'[\s\S]*new\.advisor_user_id is not null or new\.founder_a_approved or new\.founder_b_approved/);
  assert.match(sql, /before insert or update on public\.founder_alignment_workbook_advisors/);
  // Alle legitimen Schreibwege der App laufen ueber den Service-Role-Client.
  const actions = source("src/features/reporting/founderAlignmentWorkbookActions.ts");
  const writes = [...actions.matchAll(/(\w+)\s*\.from\("founder_alignment_workbook_advisors"\)\s*\.(upsert|update|insert)/g)];
  assert.ok(writes.length > 0);
  for (const write of writes) assert.equal(write[1], "privileged", "ein Client-Schreibweg auf die Legacy-Bindung");
});

test("Widerruf eines Personenzugangs ist null-sicher (Org-Zugaenge)", () => {
  const body = fnBody(source(MIGRATION), "decide_advisor_person_access");
  assert.ok(!/v_user <> v_grant\.advisor_user_id/.test(body), "der alte NULL-Vergleich ist zurueck");
  assert.match(body, /v_user = v_grant\.subject_user_id/);
  assert.match(body, /v_grant\.org_id is not null and exists[\s\S]*member\.status = 'active' and org\.status = 'active'/);
});

test("Review-Liste und Advisor-Team-Claim", () => {
  const sql = source(MIGRATION);
  assert.match(fnBody(sql, "get_advisor_team_reviews"), /member\.user_id is not null and org\.status = 'active'/);
  assert.match(fnBody(sql, "claim_advisor_team_invite_founder"), /not public\.current_user_email_verified\(\)[\s\S]*email_not_verified/);
  // Keine Datenaenderung in der Migration.
  assert.ok(!/^\s*(update|delete from|insert into)\s+public\./im.test(sql.replace(/\$\$[\s\S]*?\$\$/g, "")), "die Migration aendert Daten");
});

test("Teambericht: der Rueckweg fuer Advisors fuehrt zum Advisor-Start, nicht ins Leere", () => {
  const page = source("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.ok(!page.includes('href="/advisor"'), "toter Link /advisor");
  assert.match(page, /<Link href="\/advisor\/dashboard" className="ws-no-print/);
});
