import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { handoffInput, hypothesisInput } from "@/features/problem-radar/hypotheses";
type ResolveResult = { url: string; shortCircuit?: boolean };
const registerHooks = (
  nodeModule as unknown as {
    registerHooks(h: {
      resolve(
        s: string,
        c: unknown,
        n: (s: string, c: unknown) => ResolveResult,
      ): ResolveResult;
    }): { deregister(): void };
  }
).registerHooks;
const id = "78c00000-0000-4000-8000-000000000001",
  signal = "78c00000-0000-4000-8000-000000000002";
const state = {
  admin: true,
  error: null as null | { code: string; message: string },
  calls: [] as { name: string; args: unknown }[],
  paths: [] as string[],
};
const client = {
  rpc: async (name: string, args?: unknown) => {
    state.calls.push({ name, args });
    return { data: id, error: state.error };
  },
};
(
  globalThis as typeof globalThis & { __hypothesisTest?: unknown }
).__hypothesisTest = { state, client };
const modules: Record<string, string> = {
  "@/features/moderation/access": `export async function requirePlatformAdmin(){if(!globalThis.__hypothesisTest.state.admin)throw new Error('NOT_FOUND');return globalThis.__hypothesisTest.client}`,
  "next/navigation": `export function redirect(url){throw new Error('REDIRECT:'+url)}`,
  "next/cache": `export function revalidatePath(p){globalThis.__hypothesisTest.state.paths.push(p)}`,
};
const hooks = registerHooks({
  resolve(s, c, n) {
    return modules[s]
      ? {
          url: `data:text/javascript,${encodeURIComponent(modules[s])}`,
          shortCircuit: true,
        }
      : n(s, c);
  },
});
const actions = await import("@/features/problem-radar/hypothesisActions");
hooks.deregister();
beforeEach(() =>
  Object.assign(state, { admin: true, error: null, calls: [], paths: [] }),
);
function payload() {
  return {
    id,
    revision: 3,
    request: id,
    title: "My workspace",
    description: "My own description",
    signals: [signal],
    links: [],
  };
}
function form() {
  const f = new FormData();
  f.set("handoff", JSON.stringify(payload()));
  f.set("confirm", "on");
  return f;
}
test("handoff only sends explicit selections and uses session RPC", async (t) => {
  const network = t.mock.method(globalThis, "fetch", async () => {
    throw Error("UNEXPECTED_NETWORK");
  });
  await assert.rejects(
    actions.handoffHypothesisAction(form()),
    new RegExp(`REDIRECT:/connect/workspaces/${id}`),
  );
  assert.deepEqual(state.calls, [
    {
      name: "handoff_radar_hypothesis",
      args: {
        p_id: id,
        p_revision: 3,
        p_request: id,
        p_title: "My workspace",
        p_description: "My own description",
        p_signals: [signal],
        p_links: [],
        p_confirm: true,
      },
    },
  ]);
  assert.equal(network.mock.callCount(), 0);
});
test("no owner/actor/admin text fields can be injected", () => {
  const f = form();
  f.set(
    "handoff",
    JSON.stringify({
      ...payload(),
      owner_user_id: "forged",
      actor: "forged",
      entries: ["secret"],
      review_note: "secret",
    }),
  );
  const result = handoffInput(f)!;
  assert.equal("owner_user_id" in result, false);
  assert.equal("actor" in result, false);
  assert.equal("entries" in result, false);
  f.set("created_by", "forged");
  f.set("status", "reviewed");
  f.set("title", "Own title");
  assert.equal("created_by" in hypothesisInput(f), false);
  assert.equal("status" in hypothesisInput(f), false);
});
test("malformed handoffs rejected before RPC", async () => {
  for (const patch of [
    { id: "bad" },
    { request: "bad" },
    { revision: 0 },
    { revision: 1.2 },
    { title: "" },
    { title: "x".repeat(161) },
    { description: "x".repeat(3001) },
    { signals: [signal, signal] },
    { links: [id] },
    { links: [signal, signal] },
    { signals: "bad" },
  ]) {
    const f = form();
    f.set("handoff", JSON.stringify({ ...payload(), ...patch }));
    await assert.rejects(actions.handoffHypothesisAction(f), /result=invalid/);
  }
  assert.equal(state.calls.length, 0);
});
test("confirmation required and revision conflict returns neutral failure", async () => {
  const f = form();
  f.delete("confirm");
  await assert.rejects(actions.handoffHypothesisAction(f), /result=invalid/);
  assert.equal(state.calls.length, 0);
  state.error = { code: "40001", message: "PRIVATE_INTERNAL_TEXT" };
  await assert.rejects(
    actions.handoffHypothesisAction(form()),
    /^Error: REDIRECT:\/admin\/problem-radar\/hypotheses\?result=conflict$/,
  );
  assert.deepEqual(state.paths, []);
});
for (const denied of ["normal", "anonymous", "revoked"])
  test(`${denied} cannot execute any hypothesis mutation`, async () => {
    state.admin = false;
    for (const action of Object.values(actions))
      await assert.rejects(action(form()), /NOT_FOUND/);
    assert.equal(state.calls.length, 0);
  });
test("redaction can target only a signal, never arbitrary workspace or entry", async () => {
  const f = new FormData();
  f.set("signal", signal);
  f.set("confirm", "on");
  f.set("workspace_id", id);
  f.set("entry_id", id);
  await assert.rejects(actions.redactImportsAction(f), /imports\?result=saved/);
  assert.deepEqual(state.calls, [
    {
      name: "redact_radar_imports",
      args: { p_signal: signal, p_confirm: true },
    },
  ]);
});
test("redaction confirmation cannot be skipped", async () => {
  const f = new FormData();
  f.set("signal", signal);
  await assert.rejects(actions.redactImportsAction(f), /result=invalid/);
  assert.equal(state.calls.length, 0);
});
test("DE/EN explain unknown independence and controlled imports", () => {
  for (const lang of ["de", "en"]) {
    const d = JSON.parse(
      readFileSync(
        new URL(`../../../../messages/${lang}/radar.json`, import.meta.url),
        "utf8",
      ),
    ).hypotheses;
    assert.ok(d.independence);
    assert.ok(d.importHint);
    assert.ok(d.redactionConfirm);
    assert.ok(d.handoffGate);
    assert.ok(d.fields.counter_observations);
  }
});
test("new routes remain private and client preview starts without preselected signals", () => {
  const base = new URL("../", import.meta.url);
  const client = readFileSync(new URL("HandoffForm.tsx", base), "utf8");
  assert.match(client, /signals:\s*\[\]/);
  assert.match(client, /links:\s*\[\]/);
  assert.match(client, /preview/);
  for (const file of [
    "hypotheses.ts",
    "hypothesisActions.ts",
    "HandoffForm.tsx",
    "HypothesisForm.tsx",
  ])
    assert.doesNotMatch(
      readFileSync(new URL(file, base), "utf8"),
      /fetch\s*\(|axios|service_role|SERVICE_ROLE|<img|next\/image/,
    );
  const sql = readFileSync(
    new URL(
      "../../../../../supabase/migrations/20261108120000_radar_hypotheses_handoff.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    sql,
    /insert into public\.(network_problems|network_problem_opportunities|founder_teams)/,
  );
});
