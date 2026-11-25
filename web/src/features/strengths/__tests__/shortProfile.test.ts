import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("../supabase/migrations/20270511120000_person_short_profiles.sql", "utf8");
const actions = readFileSync("src/features/strengths/shortProfileActions.ts", "utf8");
const card = readFileSync("src/features/strengths/ShortProfileCard.tsx", "utf8");
const page = readFileSync("src/app/(product)/profile/kurzprofil/page.tsx", "utf8");
const people = readFileSync("src/app/(product)/connect/people/[userId]/page.tsx", "utf8");

test("short profile: sharing is its own consent, off by default, readable only inside the network", () => {
  assert.match(migration, /shared_in_network boolean not null default false/);
  assert.match(migration, /shared_in_network\s+and public\.is_network_member\(\)/);
  assert.match(migration, /profile\.status = 'active'/);
  assert.doesNotMatch(migration, /to anon|grant [^;]*anon/i, "no anonymous or public reading");
  assert.match(migration, /revoke all on public\.person_short_profiles from anon, authenticated/);
  assert.match(migration, /jsonb_array_length\(strengths\) <= 5/);
});

test("short profile: the share switch comes from this form only, strengths come from the person's own table", () => {
  assert.match(actions, /shared_in_network: formData\.get\("shared"\) === "yes"/);
  assert.doesNotMatch(actions, /team_|advisor|discovery|research|consent/i, "no other share is touched");
  assert.match(actions, /from\("person_strengths"\)\.select\("id, label, statement, theme"\)\.in\("id", ids\)/);
  assert.match(actions, /slice\(0, STRENGTHS_MAX\)/);
});

test("short profile: no outside sharing, no download, no score", () => {
  for (const source of [card, page]) {
    assert.doesNotMatch(source, /navigator\.share|download|href=\{?[`"']https?:|og:image|clipboard/i);
    assert.doesNotMatch(source, /score|rank|prozent|percent/i);
  }
});

test("short profile: shown on the member page through row security, not a separate public route", () => {
  assert.match(people, /getShortProfile\(client, userId\)/);
  assert.match(people, /<ShortProfileCard/);
});
