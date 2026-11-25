import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  cleanSceneThemes,
  discoverPhase,
  SCENE_IDS,
  SCENE_THEME_SUGGESTIONS,
  sceneThemed,
  THEMES_PER_SCENE_MAX,
} from "@/features/strengths/strengthsDiscoverGuide";
import { isStrengthTheme } from "@/features/strengths/strengthThemes";

const actions = readFileSync("src/features/strengths/strengthsDiscoverActions.ts", "utf8");

test("every scene has four suggested themes, all of them real ones", () => {
  for (const id of SCENE_IDS) {
    const list = SCENE_THEME_SUGGESTIONS[id];
    assert.equal(list.length, 4, id);
    assert.equal(new Set(list).size, 4, id);
    for (const theme of list) assert.equal(isStrengthTheme(theme), true, `${id}: ${theme}`);
  }
});

test("chosen themes: only known ones, no duplicates, at most two", () => {
  assert.equal(THEMES_PER_SCENE_MAX, 2);
  assert.deepEqual(cleanSceneThemes(["decide", "nope", "decide", "listen", "convince"]), ["decide", "listen"]);
  assert.deepEqual(cleanSceneThemes([]), []);
});

test("a written scene without chosen themes is not finished; older scenes and round 3 are", () => {
  assert.equal(sceneThemed({ parts: { story: "Text" }, themes: null }), false);
  assert.equal(sceneThemed({ parts: { story: "Text" }, themes: [] }), true, "choosing none is allowed");
  assert.equal(sceneThemed({ parts: { situation: "Alt" }, themes: null }), true);

  const turn = (questionId: string, themed?: boolean) => ({ questionId, answered: true, skipped: false, themed });
  const scenes = ["sc_unsure", "sc_nobody", "sc_convinced"];
  assert.deepEqual(discoverPhase([turn(scenes[0], true), turn(scenes[1], false), turn(scenes[2], false)]), { phase: "scene", index: 1 });
  assert.deepEqual(discoverPhase(scenes.map((id) => turn(id, true))), { phase: "interim" });
});

test("the server works out how well a theme is backed from the scenes, not from the form", () => {
  const confirm = actions.slice(actions.indexOf("export async function confirmThemeStrengthAction"));
  const body = confirm.slice(0, confirm.indexOf("\n}\n") + 3);
  assert.match(body, /evidenceLevelFor\(scenes\.length\)/);
  assert.doesNotMatch(body, /formData\.get\("(level|evidence)/);
  assert.match(body, /state\.phase\.phase !== "interim"/);
  assert.match(body, /\.eq\("user_id", userId\)\.eq\("theme", theme\)/, "no second row for the same theme");
});
