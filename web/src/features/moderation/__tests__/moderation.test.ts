import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { isModerationStatus, moderationFilter, moderationPage, moderationUrl } from "@/features/moderation/model";

type ResolveResult = { url: string; shortCircuit?: boolean };
const registerHooks = (nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => ResolveResult): ResolveResult }): { deregister(): void };
}).registerHooks;
const state = { signedIn: true, admin: true, guardError: false, writeError: false, calls: [] as Array<{ name: string; args: unknown }>, paths: [] as string[] };
const client = {
  rpc: async (name: string, args?: unknown) => {
    state.calls.push({ name, args });
    if (name === "is_platform_admin") return { data: state.admin, error: state.guardError ? {} : null };
    assert.equal(name, "moderate_network_report");
    return { error: state.writeError ? { message: "Never expose this secret" } : null };
  },
};
const testGlobal = globalThis as typeof globalThis & { __moderationTest?: { state: typeof state; client: typeof client } };
testGlobal.__moderationTest = { state, client };
const modules: Record<string, string> = {
  "@/lib/supabase/server": `export const createClient = async () => globalThis.__moderationTest.client;
    export const getRequestUser = async () => ({data: {user: globalThis.__moderationTest.state.signedIn ? {id:'session-user'} : null}});`,
  "next/navigation": `export function notFound() { throw new Error('NOT_FOUND'); } export function redirect(url) { throw new Error('REDIRECT:'+url); }`,
  "next/cache": `export function revalidatePath(path) { globalThis.__moderationTest.state.paths.push(path); }`,
};
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (modules[specifier]) return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(modules[specifier])}` };
  return next(specifier, context);
} });
const { requirePlatformAdmin } = await import("@/features/moderation/access");
const { moderateReportAction } = await import("@/features/moderation/actions");
hooks.deregister();
beforeEach(() => { Object.assign(state, { signedIn: true, admin: true, guardError: false, writeError: false, calls: [], paths: [] }); });
const form = () => {
  const result = new FormData();
  Object.entries({ report_id: "76000000-0000-4000-8000-000000000001", status: "reviewed", admin_note: "  Internal note  ", filter: "open", page: "0" }).forEach(([key, value]) => result.set(key, value));
  return result;
};
for (const denied of ["anonymous", "normal", "lookup-error"] as const) {
  test(`admin route guard denies ${denied} without data query`, async () => {
    state.signedIn = denied !== "anonymous";
    state.admin = denied !== "normal";
    state.guardError = denied === "lookup-error";
    await assert.rejects(requirePlatformAdmin(), /NOT_FOUND/);
    assert.deepEqual(state.calls.map((call) => call.name), denied === "anonymous" ? [] : ["is_platform_admin"]);
  });
  test(`server action rejects ${denied} before any mutation`, async () => {
    state.signedIn = denied !== "anonymous"; state.admin = denied !== "normal"; state.guardError = denied === "lookup-error";
    await assert.rejects(moderateReportAction(form()), /NOT_FOUND/);
    assert.equal(state.calls.some((call) => call.name === "moderate_network_report"), false);
  });
}
test("explicit admin guard returns only session client", async () => { assert.equal(await requirePlatformAdmin(), client); });
for (const status of ["open", "reviewed", "closed"]) {
  test(`admin action persists ${status}, trims note and refreshes moderation`, async () => {
    const input = form(); input.set("status", status);
    await assert.rejects(moderateReportAction(input), /^Error: REDIRECT:\/admin\/moderation\?status=open&result=saved$/);
    assert.deepEqual(state.calls[1], { name: "moderate_network_report", args: { p_report_id: input.get("report_id"), p_status: status, p_admin_note: "Internal note" } });
    assert.deepEqual(state.paths, ["/admin/moderation"]);
  });
}
for (const [key, value] of [["status", "banned"], ["admin_note", "x".repeat(2001)], ["report_id", "not-a-uuid"]]) {
  test(`invalid ${key} never reaches write RPC`, async () => {
    const input = form(); input.set(key, value);
    await assert.rejects(moderateReportAction(input), /result=invalid$/);
    assert.equal(state.calls.length, 1);
  });
}
test("RPC rejection stays generic and does not claim success", async () => {
  state.writeError = true;
  await assert.rejects(moderateReportAction(form()), /^Error: REDIRECT:\/admin\/moderation\?status=open&result=error$/);
  assert.deepEqual(state.paths, []);
});
test("client-controlled redirect fields cannot leave moderation", async () => {
  const input = form(); input.set("filter", "https://example.invalid"); input.set("page", "-1"); input.set("return_to", "https://example.invalid");
  await assert.rejects(moderateReportAction(input), /^Error: REDIRECT:\/admin\/moderation\?result=saved$/);
});
test("filters and paging reject arrays, unsupported statuses and unsafe offsets", () => {
  assert.equal(moderationFilter("closed"), "closed");
  for (const input of [null, ["open"], "invalid", "https://example.invalid"]) assert.equal(moderationFilter(input), null);
  for (const input of [null, ["1"], "-1", "1e10", "1000000", "NaN"]) assert.equal(moderationPage(input), 0);
  assert.equal(moderationPage("2"), 2);
  assert.equal(moderationUrl("closed", 2), "/admin/moderation?status=closed&page=2");
  assert.equal(isModerationStatus("banned"), false);
});
test("DE/EN moderation provides identical keys and meaningful status/action text", () => {
  const de = JSON.parse(readFileSync(new URL("../../../../messages/de/moderation.json", import.meta.url), "utf8"));
  const en = JSON.parse(readFileSync(new URL("../../../../messages/en/moderation.json", import.meta.url), "utf8"));
  const keys = (obj: Record<string, unknown>, prefix = ""): string[] => Object.entries(obj).flatMap(([key, value]) => typeof value === "object" ? keys(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]).sort();
  assert.deepEqual(keys(de), keys(en));
  assert.equal(de.actions.reviewed, "Als geprüft markieren"); assert.equal(en.actions.closed, "Close");
});
