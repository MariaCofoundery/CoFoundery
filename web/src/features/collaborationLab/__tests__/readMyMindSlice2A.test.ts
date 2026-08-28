import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import { buildReadMyMindRoundReadModel, isValidReadMyMindSelection, type ReadMyMindOwnResponseRow } from "@/features/collaborationLab/readMyMindModel";

const pack = getReadMyMindPack("easy_start", 1)!;
const team = { id: "team", name: "Atlas", members: [
  { userId: "a", displayName: "Anna", avatarId: null, avatarUrl: null },
  { userId: "b", displayName: "Ben", avatarId: null, avatarUrl: null },
] };
const round = { id: "round", founder_team_id: "team", pack_key: pack.key, pack_version: pack.version, created_by_user_id: "a", status: "active", created_at: "2026-08-28", completed_at: null, abandoned_at: null };
const participants = [
  { round_id: "round", founder_user_id: "a", position: 0, state: "joined", joined_at: "2026-08-28" },
  { round_id: "round", founder_user_id: "b", position: 1, state: "joined", joined_at: "2026-08-28" },
];
const roundPrompts = pack.prompts.map((prompt) => ({ id: `prompt-${prompt.position}`, round_id: "round", prompt_key: prompt.key, prompt_version: prompt.version, position: prompt.position }));
const assignments = pack.prompts.flatMap((prompt) => [
  { id: `assignment-a-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "a" },
  { id: `assignment-b-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "b" },
]);
const response = (respondent: string, assignment: string, responseType: string, choices: string[]): ReadMyMindOwnResponseRow => ({ id: `${respondent}-${assignment}-${responseType}`, round_id: "round", prompt_assignment_id: assignment, respondent_user_id: respondent, response_type: responseType, choice_keys: choices, locked_at: "2026-08-28" });

test("answer projection contains only own locked choices and resumes a partial prompt", () => {
  const model = buildReadMyMindRoundReadModel({ currentUserId: "a", team, round, participants, roundPrompts, assignments, ownResponses: [
    response("a", "assignment-a-0", "self", ["quiet_works_well"]),
    response("b", "assignment-b-0", "self", ["want_regular_contact"]),
  ], wholeRoundAnswerComplete: false });
  assert.ok(model);
  assert.deepEqual(model.prompts[0]?.self.lockedChoiceKeys, ["quiet_works_well"]);
  assert.equal(model.prompts[0]?.guess.lockedChoiceKeys, null);
  assert.equal(model.prompts[0]?.need, null);
  assert.deepEqual(model.prompts.flatMap((prompt) => [prompt.self, prompt.guess, ...(prompt.need ? [prompt.need] : [])]).flatMap((slot) => slot.lockedChoiceKeys ?? []), ["quiet_works_well"]);
  assert.equal(model.nextPromptPosition, 0);
});

test("single and multi-choice contracts enforce their published bounds", () => {
  const single = pack.prompts[0]!.selfGuess;
  const multi = pack.prompts[2]!.selfGuess;
  assert.equal(isValidReadMyMindSelection(single, []), false);
  assert.equal(isValidReadMyMindSelection(single, [single.choices[0]!.key]), true);
  assert.equal(isValidReadMyMindSelection(multi, []), false);
  assert.equal(isValidReadMyMindSelection(multi, [multi.choices[0]!.key]), true);
  assert.equal(isValidReadMyMindSelection(multi, [multi.choices[0]!.key, multi.choices[1]!.key]), true);
  assert.equal(isValidReadMyMindSelection(multi, [multi.choices[0]!.key, multi.choices[1]!.key, multi.choices[2]!.key]), false);
});

test("a pending founder can receive the forming invitation model without prompt rows", () => {
  const model = buildReadMyMindRoundReadModel({ currentUserId: "b", team, round: { ...round, status: "forming" }, participants: [{ ...participants[0]! }, { ...participants[1]!, state: "pending", joined_at: null }], roundPrompts: [], assignments: [], ownResponses: [], wholeRoundAnswerComplete: false });
  assert.equal(model?.ownParticipantState, "pending");
  assert.deepEqual(model?.prompts, []);
});

test("a founder who declines can still receive the ended state without answer data", () => {
  const model = buildReadMyMindRoundReadModel({ currentUserId: "b", team, round: { ...round, status: "abandoned", abandoned_at: "2026-08-28" }, participants: [{ ...participants[0]! }, { ...participants[1]!, state: "declined", joined_at: null }], roundPrompts: [], assignments: [], ownResponses: [], wholeRoundAnswerComplete: false });
  assert.equal(model?.status, "abandoned");
  assert.equal(model?.ownParticipantState, "declined");
  assert.deepEqual(model?.prompts, []);
});

test("Slice 2A source keeps the pre-reveal and 2-founder boundaries explicit", () => {
  const data = readFileSync(new URL("../readMyMindData.ts", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../readMyMindActions.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx", import.meta.url), "utf8");
  assert.match(data, /\.eq\("respondent_user_id", currentUserId\)/);
  assert.doesNotMatch(data.split("export async function getOpenedReadMyMindPromptReveal")[0] ?? data, /get_collaboration_prompt_reveal/);
  assert.match(actions, /team\.members\.length !== 2/);
  assert.match(actions, /lock_collaboration_response/);
  assert.doesNotMatch(page, /choice_keys/);
});

test("homebase placement, controls, and DE/EN copy follow the Slice 2A contract", () => {
  const homebase = readFileSync(new URL("../../../app/(product)/teams/[teamId]/page.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("../ReadMyMindHomebaseCard.tsx", import.meta.url), "utf8");
  const entry = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx", import.meta.url), "utf8");
  const roundPage = readFileSync(new URL("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../ReadMyMindPromptForm.tsx", import.meta.url), "utf8");
  const de = JSON.parse(readFileSync(new URL("../../../../messages/de/collaborationLab.json", import.meta.url), "utf8"));
  const en = JSON.parse(readFileSync(new URL("../../../../messages/en/collaborationLab.json", import.meta.url), "utf8"));
  const dashboardDe = JSON.parse(readFileSync(new URL("../../../../messages/de/dashboard.json", import.meta.url), "utf8"));
  const dashboardEn = JSON.parse(readFileSync(new URL("../../../../messages/en/dashboard.json", import.meta.url), "utf8"));
  const cardPosition = homebase.lastIndexOf("<ReadMyMindHomebaseCard");
  assert.ok(cardPosition > homebase.indexOf("commitment-lab-title"));
  assert.ok(cardPosition < homebase.indexOf("team-setup-title"));
  assert.match(form, /type=\{multi \? "checkbox" : "radio"\}/);
  assert.match(form, /disabled=\{!complete\}/);
  assert.match(form, /focus-visible:ring/);
  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.match(de.homebase.unsupported, /drei Foundern/);
  assert.match(en.homebase.unsupported, /three founders/);
  assert.match(card, /t\("betaLabel"\)/);
  assert.match(card, /t\("action\.handoff"\)/);
  assert.match(entry, /t\("betaNotice"\)/);
  assert.match(entry, /t\("handoffTitle"\)/);
  assert.match(entry, /t\("handoffText", \{ name: partnerName \}\)/);
  assert.match(roundPage, /joinReadMyMindRoundAction/);
  assert.match(roundPage, /declineReadMyMindRoundAction/);
  assert.equal(de.homebase.betaLabel, "Beta · In Entwicklung");
  assert.equal(en.homebase.betaLabel, "Beta · In development");
  assert.match(de.entry.betaNotice, /Testphase/);
  assert.match(en.entry.betaNotice, /currently in testing/);
  assert.equal(de.entry.handoffTitle, "Das macht ihr gemeinsam.");
  assert.match(de.entry.handoffText, /danach ist \{name\} dran/);
  assert.equal(en.entry.handoffTitle, "You do this together.");
  assert.match(en.entry.handoffText, /then it’s \{name\}’s turn/);
  assert.equal(de.round.creatorText, "Jetzt ist {name} dran.");
  assert.equal(en.round.creatorText, "Now it’s {name}’s turn.");
  assert.equal(de.round.join, "Ich bin dabei");
  assert.equal(en.round.join, "I’m in");
  assert.equal(de.round.decline, "Diesmal nicht");
  assert.equal(en.round.decline, "Not this time");
  assert.doesNotMatch(`${de.round.creatorText} ${de.round.creatorHint}`, /muss noch zustimmen|Genehmigung/);
  assert.doesNotMatch(`${en.round.creatorText} ${en.round.creatorHint}`, /approval|needs to join before/iu);
  assert.equal(dashboardDe.tasks.items.readMyMindInvitation.title, "Read My Mind: Du bist dran");
  assert.equal(dashboardEn.tasks.items.readMyMindInvitation.title, "Read My Mind: You’re up");
  assert.match(dashboardDe.tasks.items.readMyMindInvitation.textWithName, /mit dir gestartet/);
  assert.match(dashboardEn.tasks.items.readMyMindInvitation.textWithName, /with you/);
  for (const serialized of [JSON.stringify(de), JSON.stringify(en)]) {
    for (const forbidden of ["Compatibility", "kompatibel", "Readiness", "Persönlichkeitstyp", "Accuracy", "Score", "Match %"]) assert.equal(serialized.includes(forbidden), false);
  }
});
