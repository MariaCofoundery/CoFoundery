import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/collaborationLab.json" with { type: "json" };
import en from "../../../../messages/en/collaborationLab.json" with { type: "json" };
import { READ_MY_MIND_PACKS } from "@/features/collaborationLab/readMyMindContent";
import type { ReadMyMindRoundReadModel } from "@/features/collaborationLab/readMyMindModel";
import {
  buildReadMyMindPackNavigation,
  shouldShowReadMyMindIntro,
} from "@/features/collaborationLab/readMyMindPackNavigation";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

function roundFor(packIndex = 0, lockedAt: string | null = null): ReadMyMindRoundReadModel {
  const pack = READ_MY_MIND_PACKS[packIndex]!;
  const contract = pack.prompts[0]!.selfGuess;
  const slot = (responseType: "self" | "guess") => ({
    responseType,
    assignmentId: responseType,
    contract,
    lockedChoiceKeys: lockedAt ? [contract.choices[0]!.key] : null,
    lockedAt,
  });
  return {
    id: "round",
    team: { id: "team", name: "Atlas", members: [] },
    status: "forming",
    pack,
    createdByUserId: "a",
    createdAt: "2026-08-29",
    handoffReadyAt: null,
    handoffEmailClaimedAt: null,
    completedAt: null,
    abandonedAt: null,
    ownParticipantState: "joined",
    partner: { userId: "b", displayName: "Bea", avatarId: null, avatarUrl: null },
    prompts: [{
      roundPromptId: "prompt",
      position: 0,
      content: pack.prompts[0]!,
      self: slot("self"),
      guess: slot("guess"),
      need: null,
      complete: false,
    }],
    nextPromptPosition: 0,
    ownAnswerComplete: false,
    wholeRoundAnswerComplete: false,
    openedPromptPositions: [],
    nextRevealPosition: null,
    ownRevealComplete: false,
    conversationMarkers: [],
  };
}

test("guidance appears before a first answer but does not interrupt a real resume", () => {
  assert.equal(shouldShowReadMyMindIntro(roundFor(), false), true);
  assert.equal(shouldShowReadMyMindIntro(roundFor(), true), false);
  assert.equal(shouldShowReadMyMindIntro(roundFor(0, "2026-08-29T08:00:00Z"), false), false);

  const page = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
  assert.match(page, /shouldShowReadMyMindIntro\(round, query\.intro === "done"\)/);
  assert.match(page, /href=\{`\$\{href\}\?intro=done`\}/);
  assert.doesNotMatch(page, /intro_completed_at|familiarity/i);
});

test("prediction stays required and the accessible helper is attached to Guess", () => {
  const form = source("../ReadMyMindPromptForm.tsx");
  const page = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
  assert.match(form, /tone === "guess" \? <p id="guess-guidance"/);
  assert.match(form, /aria-describedby=\{\[tone === "guess" \? "guess-guidance"/);
  assert.match(page, /current\.content\.guessQuestion/);
  assert.match(page, /guessHelper: t\("guessHelper"\)/);
  assert.doesNotMatch(`${form}${page}`, /skipGuess|familiarity|how long.*know/i);
});

test("all three packs remain visible while each existing pack stays singular", () => {
  const withoutOpenRound = buildReadMyMindPackNavigation(READ_MY_MIND_PACKS, []);
  assert.equal(withoutOpenRound.length, 3);
  assert.equal(withoutOpenRound.every((item) => item.canStart && item.currentRound === null), true);

  for (let index = 0; index < READ_MY_MIND_PACKS.length; index += 1) {
    const withOpenRound = buildReadMyMindPackNavigation(READ_MY_MIND_PACKS, [roundFor(index)]);
    assert.equal(withOpenRound.length, 3);
    assert.deepEqual(withOpenRound.map((item) => item.pack.key), READ_MY_MIND_PACKS.map((pack) => pack.key));
    assert.equal(withOpenRound.filter((item) => item.currentRound !== null).length, 1);
    assert.equal(withOpenRound[index]?.currentRound?.pack.key, READ_MY_MIND_PACKS[index]?.key);
    assert.equal(withOpenRound.every((item) => !item.canStart), true);
  }

  const entry = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx");
  assert.doesNotMatch(entry, /if \(openRoundId\) redirect/);
  assert.match(entry, /currentRound \?/);
  assert.match(entry, /canStart \? t\("availableNow"\)/);
});

test("DE and EN guidance and pack navigation chrome stay parallel", () => {
  assert.deepEqual(Object.keys(de.entry), Object.keys(en.entry));
  assert.deepEqual(Object.keys(de.round), Object.keys(en.round));
  assert.equal(de.round.introTitle, "Hier gibt es kein Richtig oder Falsch.");
  assert.equal(en.round.introTitle, "There is no right or wrong here.");
  assert.match(de.round.guessHelper, /beste Vermutung/);
  assert.match(en.round.guessHelper, /best guess/);
  assert.equal(de.entry.oneRoundTitle, "Ein eigener Teil nach dem anderen");
  assert.equal(en.entry.oneRoundTitle, "One personal turn at a time");
  assert.equal(de.entry.availableAfter, "Danach verfügbar");
  assert.equal(en.entry.availableAfter, "Available afterwards");
});

test("pack browsing and guidance add no side effects or schema contract", () => {
  const entry = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx");
  const navigation = source("../readMyMindPackNavigation.ts");
  assert.doesNotMatch(navigation, /sendReadMyMindStartedEmail|claim_collaboration/);
  assert.doesNotMatch(`${entry}${navigation}`, /insert\(|update\(|delete\(|\.rpc\(/);
});
