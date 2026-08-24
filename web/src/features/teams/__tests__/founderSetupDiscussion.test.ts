import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/teams.json" with { type: "json" };
import en from "../../../../messages/en/teams.json" with { type: "json" };
import { groupFounderSetupDiscussionEntries } from "@/features/teams/founderSetupDiscussion";

test("setup discussion groups one reply level without changing working or confirmed state", () => {
  const threads = groupFounderSetupDiscussionEntries([
    { id: "root", teamId: "team", itemKey: "decision_rights", authorUserId: "a", parentEntryId: null, body: "Thought", createdAt: "2026-01-01" },
    { id: "reply", teamId: "team", itemKey: "decision_rights", authorUserId: "b", parentEntryId: "root", body: "Reply", createdAt: "2026-01-02" },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].root.body, "Thought");
  assert.equal(threads[0].replies[0].body, "Reply");
  assert.equal("workingNote" in threads[0], false);
  assert.equal("revision" in threads[0], false);
});

test("discussion copy is structurally parallel in DE and EN", () => {
  assert.deepEqual(Object.keys(de.setup.discussion), Object.keys(en.setup.discussion));
  assert.equal(de.setup.discussion.title, "Gespräch & Notizen");
  assert.equal(en.setup.discussion.title, "Discussion & notes");
  assert.match(de.setup.discussion.visibility, /alle aktuellen Founder/u);
  assert.match(en.setup.discussion.visibility, /all current founders/u);
});

test("the item page keeps confirmed, discussion, working note, and proposal semantics separate", () => {
  const page = readFileSync("src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx", "utf8");
  const confirmed = page.indexOf('revisionCard("current")');
  const discussion = page.indexOf('aria-labelledby="discussion-title"');
  const working = page.indexOf('aria-labelledby="working-note-title"');
  const pending = page.indexOf('revisionCard("pending")');
  const proposal = page.indexOf('aria-labelledby="proposal-title"');
  assert.ok(confirmed < discussion && discussion < working && working < pending && pending < proposal);
  assert.match(page, /FounderSetupDiscussionComposer/u);
  assert.doesNotMatch(page, /advisor/i);
});

test("the discussion data path is narrow and does not expose email or advisor access", () => {
  const data = readFileSync("src/features/teams/founderSetupData.ts", "utf8");
  const action = readFileSync("src/features/teams/founderSetupActions.ts", "utf8");
  const advisorRead = readFileSync("src/features/teams/founderSetupAdvisorAccessData.ts", "utf8");
  assert.match(data, /founder_team_setup_discussion_entries/u);
  assert.match(data, /author_user_id/u);
  assert.doesNotMatch(data.slice(data.indexOf("getFounderSetupDiscussion")), /email/u);
  assert.match(action, /create_founder_team_setup_discussion_entry/u);
  assert.doesNotMatch(advisorRead, /founder_team_setup_discussion_entries/u);
});
