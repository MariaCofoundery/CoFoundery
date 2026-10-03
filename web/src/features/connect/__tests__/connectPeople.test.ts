import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectPeople } from "@/features/connect/connectPeopleData";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PEOPLE_PAGE = "src/app/(product)/connect/people/page.tsx";
const LISTINGS_PAGE = "src/app/(product)/connect/page.tsx";
const PROBLEMS_PAGE = "src/app/(product)/connect/problems/page.tsx";
const TABS = "src/features/connect/ConnectTabs.tsx";

const ME = "11111111-1111-4111-8111-111111111111";

test("person search passes all criteria and offset to authorized DB search without post-limit filtering", async () => {
  let received: unknown; const row = { user_id: "person", display_name: "Older matching profile" };
  const client = { rpc: async (name: string, args: unknown) => { assert.equal(name, "search_connect_people"); received = args; return { data: [row], error: null }; },
    from: () => { const q = { select: () => q, eq: () => q, in: () => Promise.resolve({ data: [] }) }; return q; }
  } as unknown as SupabaseClient;
  const result = await getConnectPeople(client, ME, { q: "100%_literal", role: "founder", industry: "IT", expertise: "Design", region: "EU", remote_mode: "remote", open_to: "coffee", page: "3" });
  assert.deepEqual(received, { p_q: "100%_literal", p_role: "founder", p_industry: "IT", p_expertise: "Design", p_region: "EU", p_remote: "remote", p_open_to: "coffee", p_offset: 48 });
  assert.equal(result[0].display_name, row.display_name); assert.equal(result[0].ventureCount, 0);
});
test("search load failure is not disguised as an empty network", async () => {
  const client = { rpc: async () => ({ error: { message: "unavailable" }, data: null }) } as unknown as SupabaseClient;
  await assert.rejects(getConnectPeople(client, ME, {}), /network_people_load_failed/);
});

test("alle drei Connect-Seiten tragen dieselbe Leiste", () => {
  const expected: [string, string][] = [
    [PEOPLE_PAGE, "people"],
    [LISTINGS_PAGE, "listings"],
    [PROBLEMS_PAGE, "problems"],
  ];

  for (const [page, active] of expected) {
    const code = source(page);
    assert.match(code, /<ConnectTabs\s+active="([a-z]+)"/, `${page}: keine Leiste`);
    assert.match(
      code,
      new RegExp(`<ConnectTabs\\s+active="${active}"`),
      `${page}: die Leiste zeigt den falschen Reiter als aktiv`
    );
  }
});

test("die Leiste fuehrt zu allen drei Bereichen", () => {
  const code = source(TABS);
  for (const href of ["/connect/people", "/connect", "/connect/problems"]) {
    assert.ok(code.includes(`href: "${href}"`), `${href} fehlt in der Leiste`);
  }
  assert.match(code, /aria-current=\{isActive \? "page"/, "wo man ist, muss auch vorgelesen werden");
});

// ---------------------------------------------------------------------------
// Die Texte
// ---------------------------------------------------------------------------
test("die Texte der Personensuche stehen in beiden Sprachen", () => {
  const used = new Set(
    [...source(PEOPLE_PAGE).matchAll(/t\("people\.([a-zA-Z]+)"/g)].map((match) => match[1])
  );
  used.add("count");
  used.add("ventureCount");
  assert.ok(used.size > 10, "der Abgleich hat die Aufrufe nicht gefunden");

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const people = (messages.people ?? {}) as Record<string, unknown>;
    const tabs = (messages.tabs ?? {}) as Record<string, unknown>;

    for (const key of used) {
      assert.ok(people[key], `${locale}: people.${key} fehlt`);
    }
    for (const key of ["label", "people", "listings", "problems"]) {
      assert.ok(tabs[key], `${locale}: tabs.${key} fehlt`);
    }
  }
});
