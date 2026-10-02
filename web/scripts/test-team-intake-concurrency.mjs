/** Local integration check: independent HTTP transactions; never calls Resend. */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(url ?? ""))
  throw Error("Local Supabase only");
if (
  !/\[auth.email\][\s\S]*?enable_confirmations = false/.test(
    readFileSync("../supabase/config.toml", "utf8"),
  )
)
  throw Error("Local automatic email confirmation required");
const users = [],
  teams = new Set();
async function rpc(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error) throw Error(`${name}: ${result.error.code}`);
  return result.data;
}
async function round(size) {
  const tokens = Array.from({ length: size }, () =>
    randomBytes(24).toString("hex"),
  );
  const id = await rpc(users[0].client, "create_team_intake", {
    p_mode: "selection",
    p_name: "Local concurrency fixture",
    p_emails: users.slice(1, size + 1).map((u) => u.email),
    p_hashes: tokens.map((t) => createHash("sha256").update(t).digest("hex")),
  });
  for (let i = 0; i < size; i++)
    await rpc(users[i + 1].client, "claim_team_intake", {
      p_hash: createHash("sha256").update(tokens[i]).digest("hex"),
    });
  for (let i = 1; i <= size; i++)
    await rpc(users[i].client, "confirm_team_intake", { p_round: id });
  const meta = await rpc(users[0].client, "get_team_intake", { p_round: id });
  teams.add(meta.team_id);
  for (let i = 1; i <= size; i++)
    await rpc(users[i].client, "save_team_intake", {
      p_round: id,
      p_shared: { formation: "together", venture_since: "2025", existed: "no" },
      p_pairs: users
        .slice(1, size + 1)
        .filter((u) => u.id !== users[i].id)
        .map((u) => ({
          target_user_id: u.id,
          data: { origin: "project", since: "2024", worked: false },
        })),
    });
  return id;
}
try {
  for (let i = 0; i < 4; i++) {
    const email = `intake-race-${randomBytes(8).toString("hex")}@example.invalid`;
    const client = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await client.auth.signUp({
      email,
      password: randomBytes(24).toString("hex"),
    });
    if (error || !data.session) throw Error("Local signup failed");
    users.push({ id: data.user.id, email, client });
  }
  for (const size of [2, 3]) {
    const id = await round(size);
    if (size === 3)
      await rpc(users[3].client, "submit_team_intake", {
        p_round: id,
        p_release: true,
      });
    await Promise.all(
      [1, 2].map((i) =>
        rpc(users[i].client, "submit_team_intake", {
          p_round: id,
          p_release: true,
        }),
      ),
    );
    const meta = await rpc(users[0].client, "get_team_intake", { p_round: id });
    assert.equal(meta.status, "published");
    const report = await rpc(users[0].client, "get_team_intake_report", {
      p_round: id,
    });
    assert.equal(report.common.length, size);
    assert.equal(report.pairs.length, size * (size - 1));
    console.log(
      `PASS: ${size} founders, concurrent final submissions, one complete report`,
    );
  }
  const id = await round(2);
  await rpc(users[1].client, "submit_team_intake", {
    p_round: id,
    p_release: true,
  });
  const [submit, revoke] = await Promise.all([
    users[2].client.rpc("submit_team_intake", { p_round: id, p_release: true }),
    users[1].client.rpc("revoke_team_intake", { p_round: id }),
  ]);
  assert.equal(revoke.error, null);
  if (submit.error) assert.equal(submit.error.code, "42501");
  const meta = await rpc(users[0].client, "get_team_intake", { p_round: id });
  assert.equal(meta.status, "revoked");
  for (const client of [users[0].client, users[1].client, users[2].client])
    assert.equal(
      (await client.rpc("get_team_intake_report", { p_round: id })).error?.code,
      "42501",
    );
  console.log(
    "PASS: concurrent release/revocation finishes revoked; all future reads denied",
  );
} finally {
  const ids = users.map((u) => u.id);
  for (const id of [...ids, ...teams]) assert.match(id, /^[0-9a-f-]{36}$/);
  if (ids.length) {
    const sql = `begin; delete from auth.users where id in (${ids.map((id) => `'${id}'`).join(",")}); ${teams.size ? `delete from public.founder_teams where id in (${[...teams].map((id) => `'${id}'`).join(",")});` : ""} commit;`;
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_cofoundery-app",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input: sql, stdio: ["pipe", "ignore", "pipe"] },
    );
  }
}
