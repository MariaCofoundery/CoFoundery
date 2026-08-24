import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COMMITMENT_LAB_CONCEPTS,
  COMMITMENT_LAB_SCENARIOS,
  emptyScenarioAnswers,
  groupCommitmentLabDiscussion,
  isCommitmentLabFounderReady,
  normalizeScenarioAnswers,
  type CommitmentLabFounderEntry,
} from "@/features/commitmentLab/commitmentLabModel";

const completeEntry = (): CommitmentLabFounderEntry => ({
  relationshipId: "relationship-1",
  userId: "founder-a",
  currentHours: 24,
  difficultWeekHours: 8,
  obligationCategories: ["employment"],
  changeNote: "A project milestone may change my availability.",
  realityFit: "partly",
  commitmentMeaning: "I communicate changes early and renegotiate openly.",
  priorityReflection: "The venture is one of my two current priorities.",
  reliabilityReflection: "I keep ownership visible during slower phases.",
  transparencyReflection: "I raise likely changes as soon as I notice them.",
  responsibilityReflection: "I hand over accepted tasks deliberately.",
  renegotiationReflection: "Changes are legitimate when discussed together.",
  scenarioAnswers: Object.fromEntries(
    COMMITMENT_LAB_SCENARIOS.map((key) => [
      key,
      { action: `Action for ${key}`, expectation: `Expectation for ${key}` },
    ])
  ) as CommitmentLabFounderEntry["scenarioAnswers"],
  updatedAt: "2026-08-25T09:00:00.000Z",
});

test("V1 represents six product concepts without a score", () => {
  assert.deepEqual(COMMITMENT_LAB_CONCEPTS, [
    "capacity",
    "priority",
    "reliability",
    "transparency",
    "responsibility",
    "renegotiation",
  ]);
  assert.equal(isCommitmentLabFounderReady(completeEntry()), true);
  assert.equal(isCommitmentLabFounderReady({ ...completeEntry(), currentHours: null }), false);
  assert.equal(isCommitmentLabFounderReady({
    ...completeEntry(),
    scenarioAnswers: emptyScenarioAnswers(),
  }), false);
});

test("scenario input is limited to the four V1 situations", () => {
  const normalized = normalizeScenarioAnswers({
    motivation_progress: { action: "Pause", expectation: "Talk" },
    fabricated_score: { action: "High risk", expectation: "Exclude" },
  });
  assert.equal(Object.keys(normalized).length, 4);
  assert.equal(normalized.motivation_progress.action, "Pause");
  assert.equal("fabricated_score" in normalized, false);
});

test("discussion grouping keeps a single accessible reply level", () => {
  const grouped = groupCommitmentLabDiscussion([
    { id: "root", authorUserId: "founder-a", parentEntryId: null, body: "Root", createdAt: "1" },
    { id: "reply", authorUserId: "founder-b", parentEntryId: "root", body: "Reply", createdAt: "2" },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].replies[0].id, "reply");
});

test("DE and EN copy describe reflection, four scenarios, and no evaluation", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8")).commitmentLab;
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8")).commitmentLab;
  for (const messages of [de, en]) {
    assert.equal(Object.keys(messages.scenarios).filter((key) => !["title", "help", "action", "expectation"].includes(key)).length, 4);
    assert.equal(Object.keys(messages.discussion.prompts).length, 5);
    assert.match(messages.reflection.help, /keine bestätigte Vereinbarung|not yet a confirmed agreement/i);
    const serialized = JSON.stringify(messages);
    assert.doesNotMatch(serialized, /Grit Score|Exit Prediction|Commitment-Risiko|compatibility percentage|\d+\s*%/i);
  }
});

test("the route is standalone, pairwise, and does not expose advisor access", () => {
  const page = readFileSync(
    "src/app/(product)/teams/[teamId]/commitment-lab/[relationshipId]/page.tsx",
    "utf8"
  );
  const data = readFileSync("src/features/commitmentLab/commitmentLabData.ts", "utf8");
  assert.match(page, /commitment-lab/);
  assert.match(page, /FounderTeamNavigation/);
  assert.doesNotMatch(page, /FounderAlignmentWorkbookClient|workbookPayload/);
  assert.match(data, /alignment\.find\(\(entry\) => entry\.relationshipId === relationshipId\)/);
  assert.doesNotMatch(data, /relationship_advisors|advisor_user_id|service_role/);
});

test("handoff offers only explicit Setup targets and never confirms an agreement", () => {
  const action = readFileSync("src/features/commitmentLab/commitmentLabActions.ts", "utf8");
  assert.match(action, /time_commitment/);
  assert.match(action, /changing_commitment/);
  assert.match(action, /memberRows\.length !== 2/);
  assert.match(action, /working_note/);
  assert.match(action, /handoff_commitment_lab_reflection_if_empty/);
  assert.doesNotMatch(action, /propose_founder_team_setup_revision/);
  assert.doesNotMatch(action, /confirm_founder_team_setup_revision/);
  assert.doesNotMatch(action, /founder_team_setup_confirmations/);
});

test("homebase places Commitment Lab between Alignment and Founder Setup", () => {
  const page = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  const alignment = page.indexOf('id="team-alignment"');
  const lab = page.indexOf('id="commitment-lab-title"');
  const setup = page.indexOf('id="team-setup-title"');
  assert.ok(alignment >= 0 && lab > alignment && setup > lab);
  assert.match(page, /startedLabRelationships\.has\(entry\.relationshipId\)/);
  assert.match(page, /commitmentT\(started \? "continue" : "start"\)/);
});
