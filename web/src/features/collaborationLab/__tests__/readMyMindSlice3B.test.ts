import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("answer experience uses semantic progressive phases and decision cards without changing submission", () => {
  const form = source("../ReadMyMindPromptForm.tsx");
  const round = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
  assert.match(form, /<fieldset/);
  assert.match(form, /<legend/);
  assert.match(form, /type=\{multi \? "checkbox" : "radio"\}/);
  assert.match(form, /enabled=\{selfComplete\}/);
  assert.match(form, /enabled=\{selfComplete && guessComplete\}/);
  assert.match(form, /aria-describedby=\{multi/);
  assert.match(form, /useFormStatus/);
  assert.match(form, /allLocked/);
  assert.match(round, /ReadMyMindProgress/);
  assert.match(round, /rmm-stage/);
  assert.match(round, /lockReadMyMindPromptAction\.bind/);
});

test("waiting and reveal stages add presentation without new lifecycle behavior", () => {
  const round = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/page.tsx");
  const revealEntry = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/page.tsx");
  const revealPrompt = source("../../../app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx");
  assert.match(round, /ReadMyMindHandoffVisual/);
  assert.match(revealEntry, /rmm-enter/);
  assert.match(revealPrompt, /!opened \?/);
  assert.match(revealPrompt, /rmm-sealed/);
  assert.match(revealPrompt, /openReadMyMindRevealAction\.bind/);
  assert.match(revealPrompt, /rmm-reveal-panel/);
  assert.match(revealPrompt, /md:grid-cols-2/);
  assert.match(revealPrompt, /aria-pressed=\{ownMarked\}/);
  assert.doesNotMatch(`${round}${revealEntry}${revealPrompt}`, /framer-motion|from "framer-motion"/);
});

test("motion is transform/opacity based and fully optional under reduced motion", () => {
  const css = source("../../../app/globals.css");
  assert.match(css, /@keyframes rmm-enter/);
  assert.match(css, /@keyframes rmm-seal-sweep/);
  assert.match(css, /@keyframes rmm-reveal-panel/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.rmm-enter,[\s\S]*animation: none !important/);
  const rmmCss = css.slice(css.indexOf("/* Read My Mind"), css.indexOf("@media print"));
  assert.doesNotMatch(rmmCss, /width:\s*[^;]*animation|height:\s*[^;]*animation/);
});

test("new DE and EN motion chrome stays parallel and avoids quiz language", () => {
  const de = JSON.parse(source("../../../../messages/de/collaborationLab.json"));
  const en = JSON.parse(source("../../../../messages/en/collaborationLab.json"));
  assert.deepEqual(Object.keys(de.round), Object.keys(en.round));
  for (const key of ["locking", "perspectiveShift", "perspectiveShiftText"]) {
    assert.equal(typeof de.round[key], "string");
    assert.equal(typeof en.round[key], "string");
  }
  const chrome = [de.round.locking, de.round.perspectiveShift, de.round.perspectiveShiftText, en.round.locking, en.round.perspectiveShift, en.round.perspectiveShiftText].join(" ");
  for (const forbidden of ["Score", "Treffer", "Accuracy", "richtig", "falsch", "Level", "Streak", "Gewinner", "Match %"]) {
    assert.equal(chrome.includes(forbidden), false);
  }
});
