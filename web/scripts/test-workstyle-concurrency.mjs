/** Local-only HTTP transactions. Temporary accounts are deleted in finally. */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(url ?? "")) throw Error("Local Supabase only");
const users = [];
async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw Error(`${name}: ${error.code}`);
  return data;
}
const start = { p_consent_version: "workstyle_research_v1", p_context: { founder_experience: "none", team_size: "no_venture" } };
try {
  for (let i = 0; i < 3; i++) {
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signUp({ email: `workstyle-race-${randomBytes(8).toString("hex")}@example.invalid`, password: randomBytes(24).toString("hex") });
    if (error || !data.session) throw Error("Local signup failed");
    users.push({ id: data.user.id, client });
  }
  const concurrent = await Promise.all(Array.from({ length: 9 }, (_, i) => rpc(users[i % 3].client, "start_workstyle_pretest", start)));
  for (let i = 0; i < 3; i++) {
    const sameUser = concurrent.filter((_, j) => j % 3 === i);
    assert.equal(new Set(sameUser.map(row => row.assessment_id)).size, 1);
    assert.equal(new Set(sameUser.map(row => row.form)).size, 1);
    assert.equal((await rpc(users[i].client, "get_my_workstyle_pretest")).session_id, sameUser[0].session_id);
  }
  console.log("PASS: 9 concurrent starts yield 3 assessments; duplicate starts and reload retain form");
  const session = concurrent[0];
  const [save, withdraw] = await Promise.all([
    users[0].client.rpc("save_workstyle_pretest_answer", { p_assessment_id: session.assessment_id, p_item_key: "EVI-01", p_item_version: "8.4-v0.2", p_response_value: 3, p_missing_reason: null }),
    users[0].client.rpc("withdraw_workstyle_research"),
  ]);
  assert.equal(withdraw.error, null);
  if (save.error) assert.equal(save.error.code, "42501");
  assert.equal(await rpc(users[0].client, "get_my_workstyle_pretest"), null);
  assert.equal((await users[0].client.rpc("save_workstyle_pretest_answer", { p_assessment_id: session.assessment_id, p_item_key: "EVI-01", p_item_version: "8.4-v0.2", p_response_value: 3, p_missing_reason: null })).error?.code, "42501");
  console.log("PASS: save/withdraw race ends withdrawn; future saves denied");
} finally {
  const ids = users.map(user => user.id);
  ids.forEach(id => assert.match(id, /^[0-9a-f-]{36}$/));
  if (ids.length) execFileSync("docker", ["exec", "-i", "supabase_db_cofoundery-app", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: `delete from auth.users where id in (${ids.map(id => `'${id}'`).join(",")});`, stdio: ["pipe", "ignore", "pipe"],
  });
}
