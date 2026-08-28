import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import { buildReadMyMindRoundReadModel } from "@/features/collaborationLab/readMyMindModel";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");
const pack = getReadMyMindPack("easy_start", 1)!;
const prompts = pack.prompts.map((prompt) => ({
  id: `prompt-${prompt.position}`,
  round_id: "round",
  prompt_key: prompt.key,
  prompt_version: prompt.version,
  position: prompt.position,
}));
const assignments = pack.prompts.flatMap((prompt) => [
  { id: `assignment-a-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "a" },
  { id: `assignment-b-${prompt.position}`, round_id: "round", round_prompt_id: `prompt-${prompt.position}`, target_user_id: "b" },
]);

test("conversation marker projection is shared, narrow, and limited to round participants and prompts", () => {
  const model = buildReadMyMindRoundReadModel({
    currentUserId: "a",
    team: { id: "team", name: "Atlas", members: [
      { userId: "a", displayName: "Anna", avatarId: null, avatarUrl: null },
      { userId: "b", displayName: "Ben", avatarId: null, avatarUrl: null },
    ] },
    round: { id: "round", founder_team_id: "team", pack_key: "easy_start", pack_version: 1, created_by_user_id: "a", status: "completed", created_at: "2026-08-28", completed_at: "2026-08-28", abandoned_at: null },
    participants: [
      { round_id: "round", founder_user_id: "a", position: 0, state: "joined", joined_at: "2026-08-28" },
      { round_id: "round", founder_user_id: "b", position: 1, state: "joined", joined_at: "2026-08-28" },
    ],
    roundPrompts: prompts,
    assignments,
    ownResponses: [],
    wholeRoundAnswerComplete: true,
    ownReceipts: prompts.map((prompt) => ({ round_id: "round", round_prompt_id: prompt.id, participant_user_id: "a", opened_at: "2026-08-28" })),
    conversationMarkers: [
      { round_id: "round", round_prompt_id: "prompt-1", participant_user_id: "a", created_at: "2026-08-28" },
      { round_id: "round", round_prompt_id: "prompt-1", participant_user_id: "b", created_at: "2026-08-28" },
      { round_id: "other", round_prompt_id: "prompt-2", participant_user_id: "a", created_at: "2026-08-28" },
      { round_id: "round", round_prompt_id: "unknown", participant_user_id: "a", created_at: "2026-08-28" },
      { round_id: "round", round_prompt_id: "prompt-3", participant_user_id: "c", created_at: "2026-08-28" },
    ],
  });
  assert.deepEqual(model?.conversationMarkers, [{ roundPromptId: "prompt-1", participantUserIds: ["a", "b"] }]);
  assert.deepEqual(Object.keys(model!.conversationMarkers[0]!).sort(), ["participantUserIds", "roundPromptId"]);
});

test("all Read My Mind contexts return to the stable collaboration section anchor", () => {
  const pages = [
    source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx"),
    source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx"),
    source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/page.tsx"),
    source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx"),
  ];
  for (const page of pages) {
    assert.match(page, /#collaboration-lab/);
    assert.match(page, /backToCollaboration/);
  }
  assert.match(source("../ReadMyMindHomebaseCard.tsx"), /id="collaboration-lab"/);
});

test("marker actions use authenticated server-derived identity and an opened prompt", () => {
  const actions = source("../readMyMindActions.ts");
  const data = source("../readMyMindData.ts");
  assert.match(actions, /mark_collaboration_prompt_for_conversation/);
  assert.match(actions, /unmark_collaboration_prompt_for_conversation/);
  assert.match(actions, /round\.openedPromptPositions\.includes\(position\)/);
  assert.doesNotMatch(actions.slice(actions.indexOf("async function mutateConversationMarker")), /participantUserId/);
  assert.match(data, /collaboration_experience_conversation_markers/);
  const markerQuery = data.slice(
    data.indexOf('from("collaboration_experience_conversation_markers")'),
    data.indexOf('supabase.rpc("get_collaboration_round_state"')
  );
  assert.match(markerQuery, /round_id, round_prompt_id, participant_user_id, created_at/);
  assert.doesNotMatch(markerQuery, /choice_keys|response_type/);
});

test("reveal marker and compact summary stay secondary, accessible, and free of workflow pressure", () => {
  const reveal = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx");
  const summary = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/page.tsx");
  assert.match(reveal, /id="conversation-marker"/);
  assert.match(reveal, /aria-pressed=\{ownMarked\}/);
  assert.match(reveal, /markedConversation/);
  assert.match(reveal, /sharedVisibility/);
  assert.match(summary, /conversationPrompts\.length > 0/);
  assert.match(summary, /conversationQuestion1/);
  assert.match(summary, /conversationQuestion2/);
  assert.match(summary, /conversationQuestion3/);
  assert.match(summary, /reviewConversationReveal/);
  const dashboardTasks = source("../../dashboard/founderDashboardTaskData.ts");
  assert.doesNotMatch(dashboardTasks, /conversationMarkers|conversation marker|Gesprächspunkt/);
});

test("DE and EN conversation copy remain parallel, neutral, and use frozen prompt content only", () => {
  const de = JSON.parse(source("../../../../messages/de/collaborationLab.json"));
  const en = JSON.parse(source("../../../../messages/en/collaborationLab.json"));
  assert.deepEqual(Object.keys(de.reveal), Object.keys(en.reveal));
  for (const key of [
    "backToCollaboration", "markConversation", "unmarkConversation", "sharedVisibility",
    "markerStatusOwn", "markerStatusPartner", "markerStatusBoth", "conversationSummaryTitle",
    "conversationQuestion1", "conversationQuestion2", "conversationQuestion3", "reviewConversationReveal",
  ]) {
    assert.equal(typeof de.reveal[key], "string");
    assert.equal(typeof en.reveal[key], "string");
  }
  const newCopy = JSON.stringify({ de: de.reveal, en: en.reveal });
  for (const forbidden of ["Red Flag", "Compatibility", "Score", "Priorität", "critical point"]) {
    assert.equal(newCopy.includes(forbidden), false);
  }
});
