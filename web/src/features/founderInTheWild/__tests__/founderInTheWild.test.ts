import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOUNDER_IN_THE_WILD_PACK, isFounderInTheWildChoice } from "@/features/founderInTheWild/founderInTheWildContent";

test("Under Pressure is a frozen five-scenario DE/EN structured pack", () => {
  assert.equal(FOUNDER_IN_THE_WILD_PACK.experienceKey, "founder_in_the_wild");
  assert.equal(FOUNDER_IN_THE_WILD_PACK.key, "under_pressure_v1");
  assert.equal(FOUNDER_IN_THE_WILD_PACK.version, 1);
  assert.deepEqual(FOUNDER_IN_THE_WILD_PACK.scenarios.map((scenario) => scenario.position), [0,1,2,3,4]);
  assert.deepEqual(FOUNDER_IN_THE_WILD_PACK.scenarios.map((scenario) => scenario.key), ["pitch_shifts","customer_by_friday","four_months_runway","commitment_missed","pivot_pull"]);
  for (const scenario of FOUNDER_IN_THE_WILD_PACK.scenarios) {
    for (const field of [scenario.title, scenario.situation, scenario.question]) { assert.ok(field.de); assert.ok(field.en); }
    assert.equal(scenario.moves.length, 4); assert.equal(scenario.matters.length, 5); assert.equal(scenario.needs.length, 5);
    assert.equal(new Set(scenario.moves.map((choice) => choice.key)).size, 4);
    assert.equal(new Set(scenario.matters.map((choice) => choice.key)).size, 5);
    assert.equal(new Set(scenario.needs.map((choice) => choice.key)).size, 5);
  }
});

test("response contract permits one move, one or two matters and one need only", () => {
  const scenario = FOUNDER_IN_THE_WILD_PACK.scenarios[0];
  assert.equal(isFounderInTheWildChoice("move", scenario, [scenario.moves[0].key]), true);
  assert.equal(isFounderInTheWildChoice("move", scenario, [scenario.moves[0].key, scenario.moves[1].key]), false);
  assert.equal(isFounderInTheWildChoice("matters", scenario, [scenario.matters[0].key, scenario.matters[1].key]), true);
  assert.equal(isFounderInTheWildChoice("matters", scenario, []), false);
  assert.equal(isFounderInTheWildChoice("matters", scenario, scenario.matters.slice(0,3).map((choice) => choice.key)), false);
  assert.equal(isFounderInTheWildChoice("need", scenario, ["fabricated"]), false);
});

test("pack contains no scoring, compatibility or prediction contract", () => {
  const serialized = JSON.stringify(FOUNDER_IN_THE_WILD_PACK).toLowerCase();
  for (const forbidden of ["score","compatibility","personality","prediction","right_answer","dimension"]) assert.equal(serialized.includes(forbidden), false);
});

test("the vertical slice keeps entry, privacy barrier, talk, marker and neutral DE/EN chrome", () => {
  const root = process.cwd();
  const de = JSON.parse(readFileSync(`${root}/messages/de/founderInTheWild.json`, "utf8"));
  const en = JSON.parse(readFileSync(`${root}/messages/en/founderInTheWild.json`, "utf8"));
  const migration = readFileSync(`${root}/../supabase/migrations/20260830200000_create_founder_in_the_wild_v1.sql`, "utf8");
  const homebase = readFileSync(`${root}/src/app/(product)/teams/[teamId]/page.tsx`, "utf8");
  const actions = readFileSync(`${root}/src/features/founderInTheWild/founderInTheWildActions.ts`, "utf8");
  const roundPage = readFileSync(`${root}/src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/[roundId]/page.tsx`, "utf8");
  const revealOverview = readFileSync(`${root}/src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/[roundId]/reveal/page.tsx`, "utf8");
  for (const messages of [de, en]) {
    assert.ok(messages.homebase.title); assert.ok(messages.entry.title); assert.ok(messages.round.waitingPrivacy);
    assert.ok(messages.reveal.same); assert.ok(messages.reveal.different); assert.ok(messages.reveal.talk1); assert.ok(messages.reveal.visible);
  }
  assert.match(homebase, /FounderInTheWildHomebaseCard/);
  assert.match(migration, /is_founder_in_the_wild_round_answer_complete/);
  assert.match(actions, /mark_collaboration_prompt_for_conversation/);
  assert.match(actions, /end_founder_in_the_wild_round/);
  assert.match(roundPage, /canDiscard[\s\S]*canDecline/);
  assert.match(migration, /collaboration_experience_one_open_round_per_team_pack_idx|status in \('forming', 'active'\)/);
  assert.match(migration, /p_action='discard'[\s\S]*p_action='decline'/);
  assert.match(migration, /count\(distinct response\.respondent_user_id\)=2/);
  assert.doesNotMatch(revealOverview, /new Map|const top|\[owner\]\.matters/);
  assert.doesNotMatch(`${JSON.stringify(de)}${JSON.stringify(en)}`.toLowerCase(), /compatibility|match %|personality score/);
});
