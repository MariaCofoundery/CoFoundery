import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getItemsV22 } from "@/features/instruments/align/registries";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { alignmentDisplayEntry, alignmentOptionText } from "@/features/instruments/align/display";

/**
 * English quality guard for the current product surface (reports, Capability,
 * ALIGN/Venture, Founder Setup/teams, profile, advisor, auth).
 *
 * Not a snapshot: it only rejects wording that the English quality pass
 * removed on purpose - literal translations from German, British spelling,
 * German punctuation - and keeps answer scales consistent across views.
 */
const FILES = [
  "messages/en/report.json", "messages/en/capability.json", "messages/en/alignment.json",
  "messages/en/workstyleFlow.json", "messages/en/teams.json", "messages/en/profile.json",
  "messages/en/advisor.json", "messages/en/auth.json",
  "src/features/instruments/align/display.en.json", "src/features/instruments/align/displayOptions.en.json",
  "src/features/instruments/align/cards.en.json", "src/features/instruments/align/cardsLegacy.en.json",
  "src/features/instruments/align/screens.profile.en.json", "src/features/instruments/align/screens.venture.en.json",
  "src/features/instruments/workstyle/display.en.json",
];

function entries(file: string) {
  const out: [string, string][] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") out.push([path, value]);
    else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key);
  };
  walk(JSON.parse(readFileSync(file, "utf8")), "");
  return out;
}

const all = FILES.flatMap((file) => entries(file).map(([path, value]) => ({ file, path, value })));

test("the English product copy avoids the literal translations removed in the quality pass", () => {
  const banned: [string, RegExp][] = [
    ["impulse (use: discussion prompt / advisor prompt)", /\bimpulses?\b/i],
    ["accompany/accompaniment (use: support)", /\baccompan/i],
    ["constellation", /constellation/i],
    ["readout (use: summary / your responses)", /\breadouts?\b/i],
    ["how you stand towards", /stands? towards/i],
    ["concretize", /concreti[sz]e/i],
    ["in the following", /\bin the following\b/i],
    ["gives orientation", /gives? orientation/i],
    ["counterpart", /\bcounterparts?\b/i],
    ["Rather likely/unlikely (use: Somewhat …)", /\bRather (un)?likely\b/],
    ["British spelling", /\b(organisation|analys(e|ed|ing)|prioritis|behaviour|colour|recognis|monetis|neighbour|defence|labour)\w*/i],
    ["German quotation marks", /[„‚]/],
  ];
  const problems = all.flatMap(({ file, path, value }) =>
    banned.filter(([, pattern]) => pattern.test(value)).map(([name]) => `${file} ${path}: ${name}: ${value.slice(0, 90)}`));
  assert.deepEqual(problems, []);
});

test("no German characters in English copy, except proper names", () => {
  const allowed = /Günter Faltin/g;
  const problems = all.filter(({ value }) => /[äöüßÄÖÜ]/.test(value.replace(allowed, "")))
    .map(({ file, path, value }) => `${file} ${path}: ${value.slice(0, 90)}`);
  assert.deepEqual(problems, []);
});

test("scores, fit and types only ever appear as what Made2Found is not", () => {
  const risky = /compatibility score|founder[- ]fit|success prediction|personality type|ideal co-?founder/i;
  const negated = /\b(no|not|without|isn't|is not|never|nor|neither)\b[^.]{0,80}$/i;
  const problems = all.flatMap(({ file, path, value }) => {
    const match = value.match(risky);
    if (!match || match.index === undefined) return [];
    return negated.test(value.slice(0, match.index)) ? [] : [`${file} ${path}: ${value.slice(0, 120)}`];
  });
  assert.deepEqual(problems, []);
});

test("the likelihood scale reads the same in both instruments", () => {
  const workstyle = readFileSync("src/features/instruments/workstyle/display.en.json", "utf8");
  const align = readFileSync("src/features/instruments/align/displayOptions.en.json", "utf8") + readFileSync("src/features/instruments/align/display.en.json", "utf8");
  for (const source of [workstyle, align]) {
    assert.match(source, /Somewhat likely/);
    assert.match(source, /Somewhat unlikely/);
  }
});

test("an answer option reads the same in readouts, maps and discussion prompts", () => {
  // I01-I03 ask how much weight something carries: "mittel" must not turn
  // into "Moderately important" in one view and "Moderately" in another.
  const items = getItemsV22("founder_profile");
  for (const id of ["I01", "I02", "I03"]) {
    const item = items.find((candidate) => candidate.itemId === id);
    assert.ok(item, id);
    for (const option of item.options) {
      const entry = readAnswer({ blockId: id, value: { optionId: option.optionId } }, [], item);
      assert.ok(entry?.value && "label" in entry.value, id);
      const readout = alignmentDisplayEntry(entry, "en").value as { label: string };
      assert.equal(alignmentOptionText(item.prompt, option.label, "en"), readout.label, `${id} ${option.label}`);
    }
    assert.equal(alignmentOptionText(item.prompt, "mittel", "en"), "Moderately", id);
  }
  // Maps and both card libraries use the prompt-aware mapping.
  for (const file of ["src/features/instruments/align/AlignMaps.tsx", "src/features/instruments/align/conversationCards.ts", "src/features/instruments/v21/conversationCardsV21.ts"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /alignmentOptionText\(/, file);
    assert.doesNotMatch(source, /alignmentDisplayText\((value\.label|v|label|row\.(ordinal|a|b)\.label)\b/, file);
  }
});
