import assert from "node:assert/strict";
import { test } from "node:test";
import * as nodeModule from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { resolveFounderWorkProfileState, founderWorkProfileHref } from "@/features/dashboard/founderWorkProfileState";

// Run the actual reader and Server Component; no network or assessment writes.
type Resolved = { url: string; shortCircuit?: boolean };
type Loaded = { format: string; source: string; shortCircuit?: boolean };
const registerHooks = (nodeModule as unknown as { registerHooks(hooks: {
  resolve(s: string, c: unknown, next: (s: string, c: unknown) => Resolved): Resolved;
  load(s: string, c: unknown, next: (s: string, c: unknown) => Loaded): Loaded;
}): { deregister(): void } }).registerHooks;
const dictionaries = Object.fromEntries(["de", "en"].map(locale => [locale, JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8"))]));
type Row = Record<string, string | null>;
const fixture = { locale: "de", assessments: [] as Row[], answers: [] as Row[], fail: "" };
const calls: Array<{ table: string; order: string | null }> = [];
const client = { from(table: string) {
  let rows = table === "assessments" ? [...fixture.assessments] : table === "alignment_answers" ? [...fixture.answers] : [];
  const call = { table, order: null as string | null }; calls.push(call);
  const query = {
    select() { return query; },
    eq(key: string, value: unknown) { rows = rows.filter(row => row[key] === value); return query; },
    in(key: string, values: unknown[]) { rows = rows.filter(row => values.includes(row[key])); return query; },
    order(key: string) { call.order = key; rows.sort((a,b) => String(b[key]).localeCompare(String(a[key]))); return query; },
    maybeSingle() { return Promise.resolve({ data: rows[0] ?? null, error: null }); },
    then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: rows, error: fixture.fail === table ? {message:"read failed"} : null }).then(resolve); },
  }; return query;
} };
(globalThis as typeof globalThis & { __workProfileTest?: unknown }).__workProfileTest = { client,
  translate: () => createTranslator({ locale: fixture.locale, messages: dictionaries[fixture.locale], namespace: "workProfile" }),
  link: ({href, children, ...rest}: {href: string; children: React.ReactNode}) => createElement("a", { href, ...rest }, children),
};
const mocks: Record<string, string> = {
  "next-intl/server": "export const getTranslations = async () => globalThis.__workProfileTest.translate();",
  "next/link": "export default globalThis.__workProfileTest.link;",
  "@/lib/supabase/server": "export const createClient = async () => globalThis.__workProfileTest.client;",
  "@/features/instruments/align/ventureResolution": "export const findVentures = async () => [];",
  "@/features/instruments/connectedPartners": "export const connectedPartners = async () => [];",
};
const hooks = registerHooks({
  resolve(s,c,next) { return mocks[s] ? {url: `data:text/javascript,${encodeURIComponent(mocks[s])}`, shortCircuit:true} : next(s,c); },
  load(s,c,next) { return s.endsWith("/AlignCard.tsx") ? { format: "module", shortCircuit:true, source: ts.transpileModule(readFileSync(fileURLToPath(s),"utf8"), {compilerOptions: {module:ts.ModuleKind.ESNext, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022}}).outputText } : next(s,c); },
});
const { AlignCard } = await import("@/features/instruments/align/AlignCard");
const { getAlignDashboardState } = await import("@/features/instruments/align/dashboardData");
hooks.deregister();
function assessment(id: string, instrument = "founder-workstyle-pretest-8-5a-v3", submitted: string | null = null, created = "2026-10-01"): Row {
  return { id, user_id: "own", instrument_id: instrument, module: instrument === "founder-workstyle-pretest-8-5a-v3" ? "founder_profile" : "base", submitted_at: submitted, created_at: created };
}
for (const locale of ["de", "en"]) for (const state of ["new", "legacy", "started", "completed"] as const) {
  test(`${locale}: actual dashboard reader and card render ${state}`, async () => {
    Object.assign(fixture, { locale, fail: "", assessments: [], answers: [] }); calls.length = 0;
    if (state !== "new") fixture.assessments.push(assessment("old", "founder-compatibility-v1", "2026-09-01"));
    if (state === "started" || state === "completed") {
      fixture.assessments.push(assessment("current", undefined, state === "completed" ? "2026-10-01" : null));
      fixture.answers.push({assessment_id:"current", block_id:"P01"});
    }
    const data = await getAlignDashboardState("own"); assert.equal(data.show,true);
    const html = renderToStaticMarkup(await AlignCard({state:data}));
    assert.ok(html.includes(dictionaries[locale].workProfile.actions[state]));
    assert.ok(html.includes(`href="${founderWorkProfileHref(state)}"`));
    assert.equal(html.includes(dictionaries[locale].workProfile.migrationTitle), state === "legacy");
    assert.doesNotMatch(html, /Persönlichkeitstest|psychologischer Test|validierter Test|wissenschaftlicher Test|Testergebnis|neue Fassung des Tests|Werteprofil|values profile/);
    assert.equal(data.profile.started, state === "started" || state === "completed");
    assert.equal(data.hasPrevious, state !== "new");
    assert.ok(calls.some(call => call.table === "assessments" && call.order === "created_at"));
  });
}
test("empty current draft counts as begun; unfinished legacy is not completed", async () => {
  Object.assign(fixture, {fail:"", assessments:[assessment("empty"), assessment("old", "founder-compatibility-v1")], answers:[]});
  const data = await getAlignDashboardState("own");
  assert.equal(resolveFounderWorkProfileState({...data.profile, legacyBaseSubmitted:data.hasPrevious}),"started"); assert.equal(data.announce,false);
});
test("latest current assessment wins; completed legacy base is found beyond first row", async () => {
  fixture.assessments = [assessment("earlier", undefined,"2026-09-01","2026-09-01"), assessment("current"), assessment("draft", "founder-compatibility-v1"), assessment("old", "founder-compatibility-v1","2026-08-01")];
  fixture.answers = [{assessment_id:"current",block_id:"P01"}];
  const data = await getAlignDashboardState("own");
  assert.equal(data.hasPrevious,true); assert.equal(data.profile.submitted,false); assert.equal(data.profile.answered,1); assert.equal(data.announce,false);
});
test("values-only legacy submission and another user's base do not trigger migration", async () => {
  fixture.assessments = [{...assessment("values","founder-compatibility-v1","2026-09-01"),module:"values"}, {...assessment("other","founder-compatibility-v1","2026-09-01"),user_id:"other"}]; fixture.answers=[];
  const data = await getAlignDashboardState("own"); assert.equal(data.hasPrevious,false); assert.equal(data.announce,false);
});
for (const table of ["assessments", "alignment_answers"]) test(`failed ${table} read does not invent new-user state`, async () => {
  fixture.fail=table; fixture.assessments=[assessment("current")]; fixture.answers=[];
  const data = await getAlignDashboardState("own"); assert.equal(data.show,false);
  const html=renderToStaticMarkup(await AlignCard({state:data}));
  assert.ok(html.includes(dictionaries[fixture.locale].workProfile.unavailable)); assert.doesNotMatch(html, /href=/); fixture.fail="";
});
test("completion has precedence over answer count", () => {
  assert.equal(resolveFounderWorkProfileState({answered:0,submitted:true,legacyBaseSubmitted:true}),"completed");
});
test("dashboard preserves historical report and values context without generic legacy tasks", () => {
  const source=readFileSync("src/app/(product)/dashboard/page.tsx","utf8");
  assert.match(source,/hasSubmittedBase && <Link href="\/me\/report"/);
  assert.match(source,/hasSubmittedBase && hasSubmittedValues/);
  assert.match(source,/task.id !== "personal:founder-alignment" && task.id !== "personal:values"/);
  assert.doesNotMatch(source,/<AlignAnnounce|<TransitionAnnounce|href="\/me\/base"|href="\/me\/values"/);
});
