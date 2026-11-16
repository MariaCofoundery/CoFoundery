import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseThanksForm, THANKS_BODY_MAX } from "@/features/connect/thanks/thanksModel";

const read = (path: string) => readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");
function form(entries: [string, string][]) { const f = new FormData(); for (const [k, v] of entries) f.append(k, v); return f; }

test("a thanks needs at least one kind of help", () => {
  assert.equal(parseThanksForm(form([["conversation_id", "r1"]])), null);
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "nonsense"]])), null);
});

test("kinds, outcome and words are read; unknown values are dropped", () => {
  const parsed = parseThanksForm(form([["conversation_id", "r1"], ["help_type", "knowledge"], ["help_type", "knowledge"], ["help_type", "contact"], ["outcome", "meeting"], ["body", "  Danke!  "]]));
  assert.deepEqual(parsed, { conversationId: "r1", helpTypes: ["knowledge", "contact"], outcome: "meeting", body: "Danke!", show: false });
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "time"], ["outcome", "x"]]))?.outcome, null);
});

test("showing on the profile needs words and the thanker's own yes", () => {
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "time"], ["show", "on"]]))?.show, false);
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "time"], ["body", "Danke"], ["show", "on"]]))?.show, true);
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "time"], ["body", "Danke"]]))?.show, false);
});

test("words are limited to 280 characters", () => {
  assert.equal(parseThanksForm(form([["conversation_id", "r1"], ["help_type", "time"], ["body", "x".repeat(THANKS_BODY_MAX + 1)]])), null);
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

test("after answering a request the page thanks warmly, without points or a promised heart", () => {
  const page = read("src/app/(product)/connect/problems/[problemId]/page.tsx");
  assert.match(page, /data-connect-answer-thanks/);
  for (const lang of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${lang}/connect.json`));
    const copy = JSON.stringify(messages.problems.answerThanks);
    assert.doesNotMatch(copy, /Herz|heart/i);
    assert.ok(messages.problems.answerThanks.title);
  }
  const notice = JSON.parse(read("messages/de/notices.json"));
  assert.ok(notice.kinds?.connect_thanks ?? JSON.stringify(notice).includes("connect_thanks"));
});

test("thanks hang on the conversation, so requests and answered problems both work", () => {
  const sql = read("../supabase/migrations/20270425120000_connect_thanks_conversation.sql");
  assert.match(sql, /unique \(conversation_id, thanker_user_id\)/);
  assert.match(sql, /participant_a_user_id, v_conv\.participant_b_user_id/);
  const contacts = read("src/app/(product)/connect/contacts/page.tsx");
  assert.match(contacts, /\/connect\/danke\/\$\{conversation\.conversation_id\}/);
  assert.doesNotMatch(contacts, /danke\/\$\{conversation\.contact_request_id\}/);
});

import { parseDirectThanksForm, thanksHref } from "@/features/connect/thanks/thanksModel";

test("a direct thanks needs a member, a known origin and one kind of help", () => {
  assert.equal(parseDirectThanksForm(form([["helper_user_id", "u1"], ["via", "person"]])), null);
  assert.equal(parseDirectThanksForm(form([["helper_user_id", "u1"], ["via", "hack"], ["help_type", "time"]])), null);
  assert.equal(parseDirectThanksForm(form([["helper_user_id", "u1"], ["via", "venture"], ["help_type", "time"]])), null);
  assert.deepEqual(parseDirectThanksForm(form([["helper_user_id", "u1"], ["via", "venture"], ["via_id", "v9"], ["help_type", "time"]])), { helperUserId: "u1", via: "venture", viaId: "v9", helpTypes: ["time"], outcome: null, body: null, show: false });
  assert.equal(parseDirectThanksForm(form([["helper_user_id", "u1"], ["help_type", "time"]]))?.via, "person");
});

test("the heart link points at the direct thanks page", () => {
  assert.equal(thanksHref("u1"), "/connect/danke/an/u1");
  assert.equal(thanksHref("u1", "listing", "l1"), "/connect/danke/an/u1?via=listing&id=l1");
});

test("the heart sits on people, requests, problems and ventures - and never on your own card", () => {
  for (const [path, needle] of [
    ["src/app/(product)/connect/people/[userId]/page.tsx", /<ThanksHeart/],
    ["src/app/(product)/connect/people/page.tsx", /person\.user_id !== user\.id \? <ThanksHeart/],
    ["src/app/(product)/connect/ventures/page.tsx", /venture\.owner_user_id !== user\.id \? <ThanksHeart/],
    ["src/app/(product)/connect/ventures/[ventureId]/page.tsx", /<ThanksHeart/],
    ["src/app/(product)/connect/listings/[listingId]/page.tsx", /<ThanksHeart/],
    ["src/app/(product)/connect/problems/[problemId]/page.tsx", /!isAuthor && problem\.author_user_id \? <span className="ml-auto"><ThanksHeart/],
  ] as const) assert.match(read(path), needle, path);
});

test("direct thanks have limits in the database: once per person per 90 days, five a day, no blocked, no self", () => {
  const sql = read("../supabase/migrations/20270426120000_connect_thanks_direct.sql");
  assert.match(sql, /interval '90 days'/);
  assert.match(sql, />= 5/);
  assert.match(sql, /is_network_interaction_blocked/);
  assert.match(sql, /p_helper_user_id = v_me/);
});
