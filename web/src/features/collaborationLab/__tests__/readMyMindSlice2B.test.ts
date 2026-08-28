import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import { buildReadMyMindPromptReveal, buildReadMyMindRoundReadModel, haveExactChoiceSet, type ReadMyMindRevealResponseRow } from "@/features/collaborationLab/readMyMindModel";

const pack = getReadMyMindPack("easy_start", 1)!;
const team = { id: "team", name: "Atlas", members: [
  { userId: "a", displayName: "Anna", avatarId: null, avatarUrl: null },
  { userId: "b", displayName: "Ben", avatarId: null, avatarUrl: null },
] };
const prompts = pack.prompts.map((prompt) => ({ id: `prompt-${prompt.position}`, round_id: "round", prompt_key: prompt.key, prompt_version: prompt.version, position: prompt.position }));
const assignments = pack.prompts.flatMap((prompt) => [
  { id: `assignment-a-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "a" },
  { id: `assignment-b-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "b" },
]);
const round = buildReadMyMindRoundReadModel({
  currentUserId: "a",
  team,
  round: { id: "round", founder_team_id: "team", pack_key: "easy_start", pack_version: 1, created_by_user_id: "a", status: "active", created_at: "2026-08-28", completed_at: null, abandoned_at: null },
  participants: [
    { round_id: "round", founder_user_id: "a", position: 0, state: "joined", joined_at: "2026-08-28" },
    { round_id: "round", founder_user_id: "b", position: 1, state: "joined", joined_at: "2026-08-28" },
  ],
  roundPrompts: prompts,
  assignments,
  ownResponses: [],
  wholeRoundAnswerComplete: true,
  ownReceipts: [{ round_id: "round", round_prompt_id: "prompt-0", participant_user_id: "a", opened_at: "2026-08-28" }],
})!;

function row(target: string, respondent: string, type: string, choices: string[]): ReadMyMindRevealResponseRow {
  return { round_prompt_id: "prompt-0", prompt_assignment_id: `assignment-${target}-0`, target_user_id: target, respondent_user_id: respondent, response_type: type, choice_keys: choices, locked_at: "2026-08-28" };
}

function rowAt(position: number, target: string, respondent: string, type: string, choices: string[]): ReadMyMindRevealResponseRow {
  return { ...row(target, respondent, type, choices), round_prompt_id: `prompt-${position}`, prompt_assignment_id: `assignment-${target}-${position}` };
}

test("round metadata derives prompt-wide receipt resume without foreign answers", () => {
  assert.deepEqual(round.openedPromptPositions, [0]);
  assert.equal(round.nextRevealPosition, 1);
  assert.equal(round.ownRevealComplete, false);
  assert.equal(JSON.stringify(round).includes("respondent_user_id"), false);
});

test("completed two-founder history is authorized by current membership plus the round participant snapshot", () => {
  const completedRow = {
    id: "round",
    founder_team_id: "team",
    pack_key: "easy_start",
    pack_version: 1,
    created_by_user_id: "a",
    status: "completed",
    created_at: "2026-08-28",
    completed_at: "2026-08-28",
    abandoned_at: null,
  };
  const participants = [
    { round_id: "round", founder_user_id: "a", position: 0, state: "joined", joined_at: "2026-08-28" },
    { round_id: "round", founder_user_id: "b", position: 1, state: "joined", joined_at: "2026-08-28" },
  ];
  const withThirdFounder = {
    ...team,
    members: [...team.members, { userId: "c", displayName: "Cara", avatarId: null, avatarUrl: null }],
  };
  const forA = buildReadMyMindRoundReadModel({ currentUserId: "a", team: withThirdFounder, round: completedRow, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  const forB = buildReadMyMindRoundReadModel({ currentUserId: "b", team: withThirdFounder, round: completedRow, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  const forNewMember = buildReadMyMindRoundReadModel({ currentUserId: "c", team: withThirdFounder, round: completedRow, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  assert.equal(forA?.partner.userId, "b");
  assert.equal(forB?.partner.userId, "a");
  assert.equal(forNewMember, null);

  const afterBLeft = { ...team, members: [team.members[0]!] };
  const remainingFounder = buildReadMyMindRoundReadModel({ currentUserId: "a", team: afterBLeft, round: completedRow, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  const removedFounder = buildReadMyMindRoundReadModel({ currentUserId: "b", team: afterBLeft, round: completedRow, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  assert.equal(remainingFounder?.partner.userId, "b");
  assert.equal(remainingFounder?.partner.displayName, null);
  assert.equal(removedFounder, null);

  const activeAfterMembershipChange = buildReadMyMindRoundReadModel({ currentUserId: "a", team: withThirdFounder, round: { ...completedRow, status: "active", completed_at: null }, participants, roundPrompts: prompts, assignments, ownResponses: [], wholeRoundAnswerComplete: true });
  assert.equal(activeAfterMembershipChange, null);
});

test("single reveal maps both perspectives and uses descriptive exact/different equality", () => {
  const reveal = buildReadMyMindPromptReveal({ round, currentUserId: "a", position: 0, rows: [
    row("a", "a", "self", ["quiet_works_well"]),
    row("a", "b", "guess", ["quiet_works_well"]),
    row("b", "b", "self", ["want_regular_contact"]),
    row("b", "a", "guess", ["check_in_once"]),
  ] });
  assert.ok(reveal);
  assert.equal(reveal.ownPerspective.exact, true);
  assert.equal(reveal.partnerPerspective.exact, false);
  assert.equal(reveal.needs, null);
});

test("multi-choice exact comparison is set-based and never calculates partial accuracy", () => {
  assert.equal(haveExactChoiceSet(["a", "b"], ["b", "a"]), true);
  assert.equal(haveExactChoiceSet(["a", "b"], ["a"]), false);
  assert.equal(haveExactChoiceSet(["a", "b"], ["a", "c"]), false);
});

test("required Need is mapped in both directions without behavior-fit interpretation", () => {
  const withNeed = { ...round, openedPromptPositions: [0, 1] };
  const reveal = buildReadMyMindPromptReveal({ round: withNeed, currentUserId: "a", position: 1, rows: [
    rowAt(1, "a", "a", "self", ["only_when_needed"]),
    rowAt(1, "a", "b", "guess", ["one_or_two_fixed"]),
    rowAt(1, "a", "b", "need", ["connection"]),
    rowAt(1, "b", "b", "self", ["short_daily"]),
    rowAt(1, "b", "a", "guess", ["short_daily"]),
    rowAt(1, "b", "a", "need", ["space"]),
  ] });
  assert.deepEqual(reveal?.needs, { own: ["space"], partner: ["connection"] });
});

test("explicit-open architecture gates the only reveal RPC and disables navigation prefetch", () => {
  const data = readFileSync(new URL("../readMyMindData.ts", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../readMyMindActions.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx", import.meta.url), "utf8");
  assert.match(data, /openedPromptPositions\.includes\(params\.position\)[\s\S]*return null/);
  assert.match(actions, /openReadMyMindRevealAction/);
  assert.match(actions, /get_collaboration_prompt_reveal/);
  assert.match(actions, /complete_collaboration_experience_round/);
  assert.match(page, /!opened \?/);
  assert.match(page, /openReadMyMindRevealAction\.bind/);
  assert.match(page, /opened \? await getOpenedReadMyMindPromptReveal/);
  assert.match(page, /prefetch=\{false\}/);
});

test("historical review routes keep the two-founder start guard while removing the current-size review guard", () => {
  const data = readFileSync(new URL("../readMyMindData.ts", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../readMyMindActions.ts", import.meta.url), "utf8");
  const homebase = readFileSync(new URL("../ReadMyMindHomebaseCard.tsx", import.meta.url), "utf8");
  const roundPage = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx", import.meta.url), "utf8");
  const revealEntry = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/page.tsx", import.meta.url), "utf8");
  const revealPrompt = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx", import.meta.url), "utf8");
  const foundation = readFileSync(new URL("../../../../../supabase/migrations/20260828160000_create_read_my_mind_foundation.sql", import.meta.url), "utf8");
  const startAction = actions.slice(actions.indexOf("export async function startReadMyMindRoundAction"), actions.indexOf("async function mutateRound"));
  const revealActions = actions.slice(actions.indexOf("export async function openReadMyMindRevealAction"));
  assert.match(startAction, /team\.members\.length !== 2/);
  assert.doesNotMatch(revealActions, /team\.members\.length !== 2/);
  assert.doesNotMatch(roundPage, /team\.members\.length !== 2/);
  assert.doesNotMatch(revealEntry, /team\.members\.length !== 2/);
  assert.doesNotMatch(revealPrompt, /team\.members\.length !== 2/);
  assert.match(roundPage, /team\.members\.length === 2[\s\S]*newRoundAction/);
  assert.match(revealEntry, /team\.members\.length === 2[\s\S]*newRound/);
  assert.match(data, /kind: "unsupported"; completedRound/);
  assert.match(homebase, /reviewCompleted/);
  assert.match(foundation, /round_row\.status in \('active','completed'\)/);
  assert.match(foundation, /is_current_user_collaboration_round_participant\(v_round_id, true\)/);
});

test("DE/EN reveal copy is parallel and contains no scoring language", () => {
  const de = JSON.parse(readFileSync(new URL("../../../../messages/de/collaborationLab.json", import.meta.url), "utf8"));
  const en = JSON.parse(readFileSync(new URL("../../../../messages/en/collaborationLab.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(de.reveal), Object.keys(en.reveal));
  assert.equal(de.reveal.exact, "Genau so eingeschätzt");
  assert.equal(de.reveal.different, "Anders als erwartet");
  assert.equal(de.reveal.historicalPartnerFallback, "Dein damaliger Co-Founder");
  assert.equal(en.reveal.historicalPartnerFallback, "Your co-founder at the time");
  for (const text of [JSON.stringify(de.reveal), JSON.stringify(en.reveal)]) {
    for (const forbidden of ["Score", "Accuracy", "Trefferquote", "Compatibility", "kompatibel", "Readiness", "Persönlichkeitstyp", "Risiko", "Prozent"]) assert.equal(text.includes(forbidden), false);
  }
});
