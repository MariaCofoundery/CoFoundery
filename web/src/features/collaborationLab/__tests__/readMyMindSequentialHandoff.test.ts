import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/collaborationLab.json" with { type: "json" };
import en from "../../../../messages/en/collaborationLab.json" with { type: "json" };

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../../../../supabase/migrations/20260828220000_add_read_my_mind_sequential_handoff.sql");
const actions = source("../readMyMindActions.ts");
const data = source("../readMyMindData.ts");
const model = source("../readMyMindModel.ts");
const roundPage = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
const entryPage = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx");

test("forming is a narrow two-founder creator turn and handoff readiness is DB-derived", () => {
  assert.match(migration, /v_forming_creator_turn := v_round\.status = 'forming'/);
  assert.match(migration, /created_by_user_id = v_user_id/);
  assert.match(migration, /count\(\*\)[\s\S]*= 2/);
  assert.match(migration, /trg_collaboration_responses_mark_handoff_ready/);
  assert.match(migration, /is_collaboration_participant_answer_complete/);
  assert.match(migration, /handoff_ready_at = coalesce/);
  assert.match(model, /status === "forming" && ownState !== "joined"/);
  assert.match(actions, /!\["forming", "active"\]\.includes\(round\.status\)/);
});

test("recipient cannot join or receive an actionable invitation before creator handoff", () => {
  assert.match(migration, /v_handoff_ready_at is null/);
  assert.match(migration, /not public\.is_collaboration_participant_answer_complete\(p_round_id, v_creator_user_id\)/);
  assert.match(data, /round\.handoffReadyAt \? "forming_invitation" : "forming_partner_waiting"/);
  assert.match(roundPage, /ownParticipantState === "pending" && !round\.handoffReadyAt/);
  assert.match(roundPage, /partnerWaitingTitle/);
});

test("mail stays out of create and answer locking and uses the manual batch claim", () => {
  const startAction = actions.slice(actions.indexOf("export async function startReadMyMindRoundAction"), actions.indexOf("async function mutateRound"));
  const lockAction = actions.slice(actions.indexOf("export async function lockReadMyMindPromptAction"), actions.indexOf("export async function openReadMyMindRevealAction"));
  assert.doesNotMatch(startAction, /sendTeamHandoffNotification|sendReadMyMindStartedEmail/);
  assert.doesNotMatch(lockAction, /claim_collaboration|sendReadMyMindStartedEmail/);
  assert.match(actions, /claim_collaboration_team_handoff_emails/);
  assert.match(migration, /handoff_email_claimed_at is null/);
  assert.match(migration, /set handoff_email_claimed_at = pg_catalog\.now\(\)/);
});

test("pre-join decline and creator abandon purge response content without client delete rights", () => {
  assert.match(migration, /purge_collaboration_prejoin_content/);
  assert.match(migration, /activated_at is null/);
  assert.match(migration, /delete from public\.collaboration_experience_responses/);
  assert.match(migration, /revoke all on function public\.purge_collaboration_prejoin_content/);
  assert.doesNotMatch(migration, /grant delete on public\.collaboration_experience_responses/);
});

test("DE and EN explain the sequential, hidden, purge-safe handoff", () => {
  assert.equal(de.entry.handoffTitle, "Das macht ihr nacheinander.");
  assert.equal(en.entry.handoffTitle, "You take turns.");
  assert.match(de.entry.transparency.declinePurge, /gelöscht/);
  assert.match(en.entry.transparency.declinePurge, /deleted/);
  assert.equal(de.round.creatorCompleteTitle, "Dein Teil ist fertig");
  assert.equal(en.round.creatorCompleteTitle, "Your part is complete");
  assert.match(de.round.inviteText, /bereits abgeschlossen/);
  assert.match(en.round.inviteText, /already completed/);
  assert.match(entryPage, /declinePurge/);
});
