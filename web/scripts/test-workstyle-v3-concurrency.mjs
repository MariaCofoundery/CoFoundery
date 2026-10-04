/** Local HTTP transaction test: duplicate start/finalize, retry and withdrawal. */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(url ?? "")) throw Error("Local Supabase only");
const registry = JSON.parse(readFileSync("docs/founder-workstyle-pretest-8.5a-v3.json", "utf8"));
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;
async function rpc(name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw Error(`${name}: ${error.code}`);
  return data;
}
try {
  const { data, error } = await client.auth.signUp({ email: `workstyle-v3-race-${randomBytes(8).toString("hex")}@example.invalid`, password: randomBytes(24).toString("hex") });
  if (error || !data.session) throw Error("Local signup failed");
  userId = data.user.id;
  const sessions = await Promise.all(Array.from({ length: 6 }, () => rpc("start_workstyle_pretest", { p_consent_version: "workstyle_research_v3", p_context: { founder_experience: "0", team_size: "no_venture" } })));
  assert.equal(new Set(sessions.map(s => s.assessment_id)).size, 1);
  assert.ok(sessions.every(s => s.form === null && s.manifest_version === "3.0.0"));
  const assessmentId = sessions[0].assessment_id;
  for (const item of registry.items.slice(0, 51)) {
    await rpc("save_workstyle_pretest_v3", { p_assessment_id: assessmentId, p_item_key: item.item_key, p_item_version: item.item_version, p_response_value: null, p_missing_reason: "cannot_assess", p_response_option: null, p_rendered_order: item.rendered_order, p_response_time_ms: 100 });
  }
  const finish = { p_item_key: "DEC-R2", p_response_option: null, p_rendered_order: null, p_finalize: true, p_assessment_id: assessmentId, p_item_version: "8.4-v0.4", p_response_value: 3, p_missing_reason: null, p_response_time_ms: 100 };
  const completions = await Promise.all(Array.from({ length: 6 }, () => rpc("save_workstyle_pretest_v3", finish)));
  assert.equal(new Set(completions.map(s => s.completed_at)).size, 1);
  assert.deepEqual(await rpc("save_workstyle_pretest_v3", finish), completions[0]);
  const stored = await rpc("get_my_workstyle_pretest_version", { p_assessment_version: "8.5a-v3" });
  assert.equal(stored.answers.length, 52);
  assert.equal(stored.feedback, null);
  const changed = await client.rpc("save_workstyle_pretest_v3", { ...finish, p_response_value: 2 });
  assert.equal(changed.error?.code, "23514");
  console.log("PASS: 6 duplicate starts -> one null-form v3; 6 concurrent finalizations and lost-response retry -> one completion, 52 answers, no required feedback");
  const [retry, withdrawal] = await Promise.all([client.rpc("save_workstyle_pretest_v3", finish), client.rpc("withdraw_workstyle_research")]);
  assert.equal(withdrawal.error, null);
  if (retry.error) assert.equal(retry.error.code, "42501");
  const withdrawn = await rpc("get_my_workstyle_pretest_version", { p_assessment_version: "8.5a-v3" });
  assert.ok(withdrawn.withdrawn_at);
  assert.equal(withdrawn.answers.length, 29);
  assert.ok(withdrawn.answers.every(a => !a.item_key.endsWith("-R1")));
  assert.equal((await client.rpc("save_workstyle_pretest_v3", finish)).error?.code, "42501");
  console.log("PASS: finalize/withdraw race ends withdrawn; only 29 product answers survive; further retries denied");
} finally {
  if (userId) {
    assert.match(userId, /^[0-9a-f-]{36}$/);
    execFileSync("docker", ["exec", "-i", "supabase_db_cofoundery-app", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: `delete from auth.users where id='${userId}';`, stdio: ["pipe", "ignore", "pipe"] });
  }
}
