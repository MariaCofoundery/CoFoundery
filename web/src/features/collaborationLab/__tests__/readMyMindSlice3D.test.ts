import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/collaborationLab.json" with { type: "json" };
import en from "../../../../messages/en/collaborationLab.json" with { type: "json" };
import { READ_MY_MIND_PACKS } from "@/features/collaborationLab/readMyMindContent";
import type { ReadMyMindRoundReadModel } from "@/features/collaborationLab/readMyMindModel";
import { buildReadMyMindPackNavigation } from "@/features/collaborationLab/readMyMindPackNavigation";
import { buildFounderDashboardTasks, type FounderDashboardTaskSignals } from "@/features/dashboard/founderDashboardTasks";
import { buildReadMyMindStartedEmailPayload } from "@/lib/email/sendReadMyMindStartedEmail";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

function round(packIndex: number, handoffReady: boolean): ReadMyMindRoundReadModel {
  return {
    id: `round-${packIndex}`,
    team: { id: "team", name: "Atlas", members: [] },
    status: "forming",
    pack: READ_MY_MIND_PACKS[packIndex]!,
    createdByUserId: "a",
    createdAt: `2026-08-29T0${packIndex}:00:00Z`,
    handoffReadyAt: handoffReady ? "2026-08-29T10:00:00Z" : null,
    handoffEmailClaimedAt: null,
    completedAt: null,
    abandonedAt: null,
    ownParticipantState: "joined",
    partner: { userId: "b", displayName: "Bea", avatarId: null, avatarUrl: null },
    prompts: [],
    nextPromptPosition: handoffReady ? null : 0,
    ownAnswerComplete: handoffReady,
    wholeRoundAnswerComplete: false,
    openedPromptPositions: [],
    nextRevealPosition: null,
    ownRevealComplete: false,
    conversationMarkers: [],
  };
}

function dashboardSignals(rounds: FounderDashboardTaskSignals["readMyMindRounds"]): FounderDashboardTaskSignals {
  return {
    currentUserId: "b", now: "2026-08-29T12:00:00Z", invitations: [],
    personal: { founderAlignmentStarted: false, founderAlignmentSubmitted: false, valuesStarted: false, valuesSubmitted: false },
    discoveryIntros: [], relationships: [], relationshipAdvisors: [], setupAdvisorAccess: [],
    setupItems: [], setupConfirmations: [], commitmentLabs: [], readMyMindRounds: rounds,
  };
}

test("pack navigation permits the next pack after handoff but never duplicates an open pack", () => {
  const afterEasy = buildReadMyMindPackNavigation(READ_MY_MIND_PACKS, [round(0, true)]);
  assert.equal(afterEasy[0]?.currentRound?.pack.key, "easy_start");
  assert.equal(afterEasy[0]?.canStart, false);
  assert.equal(afterEasy[1]?.canStart, true);
  assert.equal(afterEasy[2]?.canStart, true);

  const whileAnswering = buildReadMyMindPackNavigation(READ_MY_MIND_PACKS, [round(0, true), round(1, false)]);
  assert.equal(whileAnswering.every((item) => !item.canStart), true);
});

test("waiting UX uses status, pack overview navigation, and an explicit discard dialog", () => {
  const entry = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx");
  const roundPage = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
  const endControl = source("../ReadMyMindEndControl.tsx");
  assert.match(entry, /canContinue \? t\("continueRound"\) : t\("viewStatus"\)/);
  assert.match(roundPage, /backToReadMyMind/);
  assert.match(roundPage, /chooseAnotherPack/);
  assert.match(roundPage, /label=\{t\("discard"\)\}/);
  assert.match(roundPage, /discardEmailNote/);
  assert.match(endControl, /role="dialog"/);
  assert.match(endControl, /aria-modal="true"/);
  assert.doesNotMatch(endControl, /window\.confirm/);
});

test("three recipient handoffs become one dashboard task pointing to the pack overview", () => {
  const base = { teamId: "team", teamLabel: "Atlas", creatorLabel: "Anna", handoffReady: true, status: "forming", ownParticipantState: "pending", ownAnswerComplete: false, wholeAnswerComplete: false, ownRevealComplete: false, nextRevealPosition: null, supportedTwoFounderTeam: true, createdAt: "2026-08-29T10:00:00Z" };
  const tasks = buildFounderDashboardTasks(dashboardSignals([0, 1, 2].map((index) => ({ ...base, id: `round-${index}` }))));
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.type, "read_my_mind_invitation");
  assert.equal(tasks[0]?.packCount, 3);
  assert.equal(tasks[0]?.href, "/teams/team/collaboration-lab/read-my-mind");

  const creatorWaiting = buildFounderDashboardTasks({ ...dashboardSignals([]), currentUserId: "a", readMyMindRounds: [0, 1, 2].map((index) => ({ ...base, id: `round-${index}`, ownParticipantState: "joined", ownAnswerComplete: true })) });
  assert.equal(creatorWaiting.length, 0);

  const creatorWithOwnTurn = buildFounderDashboardTasks({
    ...dashboardSignals([]),
    currentUserId: "a",
    readMyMindRounds: [
      ...[0, 1].map((index) => ({ ...base, id: `waiting-${index}`, ownParticipantState: "joined", ownAnswerComplete: true })),
      { ...base, id: "own-turn", handoffReady: false, ownParticipantState: "joined", ownAnswerComplete: false },
    ],
  });
  assert.equal(creatorWithOwnTurn.length, 1);
  assert.equal(creatorWithOwnTurn[0]?.type, "read_my_mind_continue");
});

test("manual notification sends one private overview email for all claimed packs", () => {
  const payload = buildReadMyMindStartedEmailPayload({
    recipientEmail: "bea@example.com",
    roundUrl: "https://cofoundery.de/teams/team/collaboration-lab/read-my-mind",
    creatorName: "Anna",
    packTitles: ["Easy Start", "So arbeiten wir", "Wenn es schwierig wird"],
    locale: "de",
  });
  assert.match(payload.subject, /3 Read-My-Mind-Packs/);
  for (const title of ["Easy Start", "So arbeiten wir", "Wenn es schwierig wird"]) assert.match(payload.text, new RegExp(title));
  assert.match(payload.text, /teams\/team\/collaboration-lab\/read-my-mind/);
  assert.doesNotMatch(payload.text, /choice_|Self Answer|Guess Answer|Need Answer/i);

  const actions = source("../readMyMindActions.ts");
  const lockAction = actions.slice(actions.indexOf("export async function lockReadMyMindPromptAction"), actions.indexOf("export async function openReadMyMindRevealAction"));
  assert.doesNotMatch(lockAction, /claim_collaboration|sendReadMyMindStartedEmail/);
  assert.match(actions, /claim_collaboration_team_handoff_emails/);
  assert.match(actions, /toPublicAppUrl\(entryHref\(params\.teamId\)\)/);
});

test("DE and EN multi-pack, notification, navigation, and discard copy stay parallel", () => {
  assert.deepEqual(Object.keys(de.entry), Object.keys(en.entry));
  assert.deepEqual(Object.keys(de.round), Object.keys(en.round));
  assert.deepEqual(Object.keys(de.homebase.status), Object.keys(en.homebase.status));
  for (const key of ["viewStatus", "notification"] as const) assert.equal(typeof de.entry[key], typeof en.entry[key]);
  for (const key of ["backToReadMyMind", "chooseAnotherPack", "discard", "discardTitle", "discardConfirm"] as const) assert.equal(typeof de.round[key], "string");
});
