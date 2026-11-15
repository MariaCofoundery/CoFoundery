import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseThanksForm, THANKS_BODY_MAX } from "@/features/connect/thanks/thanksModel";

const read = (path: string) => readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");
function form(entries: [string, string][]) { const f = new FormData(); for (const [k, v] of entries) f.append(k, v); return f; }

test("a thanks needs at least one kind of help", () => {
  assert.equal(parseThanksForm(form([["request_id", "r1"]])), null);
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "nonsense"]])), null);
});

test("kinds, outcome and words are read; unknown values are dropped", () => {
  const parsed = parseThanksForm(form([["request_id", "r1"], ["help_type", "knowledge"], ["help_type", "knowledge"], ["help_type", "contact"], ["outcome", "meeting"], ["body", "  Danke!  "]]));
  assert.deepEqual(parsed, { requestId: "r1", helpTypes: ["knowledge", "contact"], outcome: "meeting", body: "Danke!", show: false });
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "time"], ["outcome", "x"]]))?.outcome, null);
});

test("showing on the profile needs words and the thanker's own yes", () => {
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "time"], ["show", "on"]]))?.show, false);
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "time"], ["body", "Danke"], ["show", "on"]]))?.show, true);
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "time"], ["body", "Danke"]]))?.show, false);
});

test("words are limited to 280 characters", () => {
  assert.equal(parseThanksForm(form([["request_id", "r1"], ["help_type", "time"], ["body", "x".repeat(THANKS_BODY_MAX + 1)]])), null);
});

test("the heart is a sign, never a number: no counting, ranking or sorting by thanks", () => {
  const sql = read("../supabase/migrations/20270423120000_connect_thanks.sql");
  assert.match(sql, /function public\.has_network_heart[\s\S]*returns boolean/);
  const fns = sql.split(/create or replace function/).slice(1);
  for (const fn of fns) {
    const name = /public\.(\w+)/.exec(fn)?.[1] ?? "";
    if (name === "has_network_heart" || name === "list_profile_thanks" || name === "list_my_network_thanks") assert.doesNotMatch(fn, /\bcount\s*\(\s*\*?\s*\)\s*(as|over)|\brank\s*\(|row_number|group by/i, `${name} must not count or rank`);
  }
  assert.doesNotMatch(sql, /order by[^;]*(count|thanks_count)/i);
});

test("the profile and the contacts page show the heart without a number", () => {
  const profile = read("src/app/(product)/connect/people/[userId]/page.tsx");
  assert.match(profile, /hasHeart\(client, userId\)/);
  assert.match(profile, /HeartBadge/);
  const bits = read("src/features/connect/thanks/ThanksBits.tsx");
  assert.doesNotMatch(bits, /thanks\.length|count\(/);
});

test("words reach the profile only if shared and not hidden (SQL)", () => {
  const sql = read("../supabase/migrations/20270423120000_connect_thanks.sql");
  assert.match(sql, /t\.show_on_profile and not t\.helper_hidden/);
  assert.match(sql, /network_thanks_show_needs_body/);
  assert.match(sql, /revoke all on public\.network_thanks from anon, authenticated/);
});
