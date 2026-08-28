import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { READ_MY_MIND_PACKS, getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";

test("Read My Mind V1 publishes three immutable five-prompt packs in DE and EN", () => {
  assert.equal(READ_MY_MIND_PACKS.length, 3);
  assert.deepEqual(READ_MY_MIND_PACKS.map((pack) => pack.prompts.length), [5, 5, 5]);
  assert.deepEqual(READ_MY_MIND_PACKS.map((pack) => pack.version), [1, 1, 1]);

  for (const pack of READ_MY_MIND_PACKS) {
    assert.equal(pack.experienceKey, "read_my_mind");
    assert.ok(pack.title.de);
    assert.ok(pack.title.en);
    assert.deepEqual(pack.prompts.map((prompt) => prompt.position), [0, 1, 2, 3, 4]);
    assert.equal(new Set(pack.prompts.map((prompt) => prompt.key)).size, 5);

    for (const prompt of pack.prompts) {
      assert.equal(prompt.version, 1);
      assert.ok(prompt.title.de);
      assert.ok(prompt.title.en);
      assert.ok(prompt.selfQuestion.de);
      assert.ok(prompt.selfQuestion.en);
      assert.ok(prompt.guessQuestion.de.includes("{target}"));
      assert.ok(prompt.guessQuestion.en.includes("{target}"));
      assert.equal(new Set(prompt.selfGuess.choices.map((item) => item.key)).size, prompt.selfGuess.choices.length);
      assert.ok(prompt.selfGuess.minSelections > 0);
      assert.ok(prompt.selfGuess.maxSelections >= prompt.selfGuess.minSelections);
      if (prompt.selfGuess.format === "single_choice") {
        assert.equal(prompt.selfGuess.minSelections, 1);
        assert.equal(prompt.selfGuess.maxSelections, 1);
      }
      if (prompt.needMode === "required") {
        assert.ok(prompt.need);
        assert.ok(prompt.needQuestion?.de.includes("{target}"));
        assert.ok(prompt.needQuestion?.en.includes("{target}"));
        assert.equal(prompt.need?.format, "single_choice");
        assert.equal(new Set(prompt.need?.choices.map((item) => item.key)).size, prompt.need?.choices.length);
      } else {
        assert.equal(prompt.need, undefined);
        assert.equal(prompt.needQuestion, undefined);
      }

      const serialized = JSON.stringify(prompt).toLowerCase();
      for (const forbidden of ["accuracy", "similarity", "compatibility", "readiness", "score", "percentage"]) {
        assert.equal(serialized.includes(`\"${forbidden}\"`), false);
      }
    }
  }
});

test("published versions remain addressable by stable pack key and version", () => {
  assert.equal(getReadMyMindPack("easy_start", 1)?.prompts[0]?.key, "silent_day");
  assert.equal(getReadMyMindPack("easy_start", 2), null);
  assert.equal(getReadMyMindPack("missing", 1), null);
});

test("the published V1 DE/EN content remains frozen under version 1", () => {
  const contentHash = createHash("sha256").update(JSON.stringify(READ_MY_MIND_PACKS)).digest("hex");
  assert.equal(contentHash, "01cfd27543ba1e3f0897ec629a0ec4925aa830e01041e8b744e8abafb1354931");
});

test("the frozen V1 TypeScript contract keeps every DB-relevant field exact", () => {
  const actual = READ_MY_MIND_PACKS.map((pack) => ({
    key: pack.key,
    version: pack.version,
    prompts: pack.prompts.map((prompt) => ({
      key: prompt.key,
      version: prompt.version,
      position: prompt.position,
      format: prompt.selfGuess.format,
      min: prompt.selfGuess.minSelections,
      max: prompt.selfGuess.maxSelections,
      choices: prompt.selfGuess.choices.map((item) => item.key),
      needMode: prompt.needMode,
      needChoices: prompt.need?.choices.map((item) => item.key) ?? [],
      needMin: prompt.need?.minSelections ?? null,
      needMax: prompt.need?.maxSelections ?? null,
    })),
  }));

  assert.deepEqual(actual, [
    { key: "easy_start", version: 1, prompts: [
      { key: "silent_day", version: 1, position: 0, format: "single_choice", min: 1, max: 1, choices: ["quiet_works_well", "check_in_once", "want_regular_contact"], needMode: "none", needChoices: [], needMin: null, needMax: null },
      { key: "update_frequency", version: 1, position: 1, format: "single_choice", min: 1, max: 1, choices: ["only_when_needed", "one_or_two_fixed", "short_daily"], needMode: "required", needChoices: ["space", "predictability", "connection"], needMin: 1, needMax: 1 },
      { key: "please_do_not_ask", version: 1, position: 2, format: "multi_choice", min: 1, max: 2, choices: ["early_draft", "focus_time", "personal_context", "every_small_decision"], needMode: "none", needChoices: [], needMin: null, needMax: null },
      { key: "brief_focus_break", version: 1, position: 3, format: "single_choice", min: 1, max: 1, choices: ["no_message_needed", "short_signal", "agree_return_time"], needMode: "required", needChoices: ["autonomy", "short_notice", "clear_return"], needMin: 1, needMax: 1 },
      { key: "really_bad_workday", version: 1, position: 4, format: "single_choice", min: 1, max: 1, choices: ["reduce_coordination", "sort_priorities", "take_concrete_task"], needMode: "required", needChoices: ["capacity", "clarity", "practical_support"], needMin: 1, needMax: 1 },
    ] },
    { key: "how_we_work", version: 1, prompts: [
      { key: "just_do_it", version: 1, position: 0, format: "single_choice", min: 1, max: 1, choices: ["act_independently", "quick_alignment", "decide_together"], needMode: "none", needChoices: [], needMin: null, needMax: null },
      { key: "when_to_involve_you", version: 1, position: 1, format: "single_choice", min: 1, max: 1, choices: ["at_impact", "before_commitment", "from_the_start"], needMode: "required", needChoices: ["autonomy", "early_context", "shared_decision"], needMin: 1, needMax: 1 },
      { key: "good_enough", version: 1, position: 2, format: "single_choice", min: 1, max: 1, choices: ["usable_now", "agreed_criteria_met", "highly_polished"], needMode: "none", needChoices: [], needMin: null, needMax: null },
      { key: "slower_than_expected", version: 1, position: 3, format: "single_choice", min: 1, max: 1, choices: ["name_expectation", "ask_about_blockers", "adjust_plan"], needMode: "required", needChoices: ["trust", "transparency", "support"], needMin: 1, needMax: 1 },
      { key: "reopen_decision", version: 1, position: 4, format: "single_choice", min: 1, max: 1, choices: ["new_facts_only", "important_concern", "always_possible"], needMode: "none", needChoices: [], needMin: null, needMax: null },
    ] },
    { key: "when_things_get_tricky", version: 1, prompts: [
      { key: "shaky_deadline", version: 1, position: 0, format: "single_choice", min: 1, max: 1, choices: ["reduce_scope", "move_date", "ask_for_help"], needMode: "required", needChoices: ["early_signal", "shared_tradeoff", "realistic_plan"], needMin: 1, needMax: 1 },
      { key: "tell_me_it_is_not_good", version: 1, position: 1, format: "single_choice", min: 1, max: 1, choices: ["directly", "with_context", "privately", "with_alternative"], needMode: "required", needChoices: ["clarity", "respect", "privacy", "next_step"], needMin: 1, needMax: 1 },
      { key: "after_the_argument", version: 1, position: 2, format: "single_choice", min: 1, max: 1, choices: ["pause_then_talk", "talk_soon", "write_first"], needMode: "required", needChoices: ["space", "repair", "structure"], needMin: 1, needMax: 1 },
      { key: "not_now", version: 1, position: 3, format: "single_choice", min: 1, max: 1, choices: ["respect_boundary", "ask_when_later", "briefly_name_issue"], needMode: "required", needChoices: ["space", "time_commitment", "brief_context"], needMin: 1, needMax: 1 },
      { key: "disagreeing_before_customer", version: 1, position: 4, format: "single_choice", min: 1, max: 1, choices: ["one_leads", "brief_internal_pause", "present_shared_minimum"], needMode: "none", needChoices: [], needMin: null, needMax: null },
    ] },
  ]);
});
