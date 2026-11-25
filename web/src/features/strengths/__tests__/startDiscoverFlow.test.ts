import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const actions = read("src/features/strengths/strengthsDiscoverActions.ts");
const page = read("src/app/(product)/profile/strengths-interview/page.tsx");

/** Der Rumpf einer Funktion aus dem Quelltext, bis zur naechsten Funktion der obersten Ebene. */
function bodyOf(name: string): string {
  const start = actions.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const next = actions.slice(start + 1).search(/\n(?:export )?(?:async )?function /);
  const body = actions.slice(start, next < 0 ? undefined : start + 1 + next);
  // Kommentare zaehlen nicht: sie erklaeren den Fehler und nennen deshalb die falsche Funktion.
  return body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

test("after the intro, 'Weiter' starts the scenes on the first tap (25.11.2026: it used to land on the results page)", () => {
  const start = bodyOf("startDiscoverAction");
  // Ein offenes Gespraech der frueheren Fassung wird nur beendet. `complete` leitet zu den Ergebnissen weiter und
  // beendet damit die Handlung: das neue Gespraech wurde nie angelegt.
  assert.match(start, /closeSession\(client, open\.sessionId\)/);
  assert.doesNotMatch(start, /\bcomplete\(/);
  assert.match(start, /\.insert\(\{ user_id: userId, kind: STRENGTHS_INTERVIEW/);
  assert.ok(start.indexOf("closeSession(") < start.indexOf(".insert("), "close the old one first, then create the new one");
});

test("closing a conversation and sending the person to the results are separate steps", () => {
  assert.doesNotMatch(bodyOf("closeSession"), /redirect|onward\(|back\(/);
  const complete = bodyOf("complete");
  assert.match(complete, /closeSession\(client, sessionId\)/);
  assert.match(complete, /onward\("completed"\)/);
});

test("the way back is called what it is: 'Zurück zu Ich' leads to the Ich page", () => {
  assert.equal((page.match(/t\("backToMe"\)/g) ?? []).length, 2);
  assert.doesNotMatch(page, /backToStrengths/);
  assert.equal((page.match(/href="\/me\/profile"/g) ?? []).length >= 2, true);
  assert.equal(JSON.parse(read("messages/de/strengths.json")).backToMe, "Zurück zu Ich");
  assert.equal(JSON.parse(read("messages/en/strengths.json")).backToMe, "Back to Me");
});

test("the evaluation part only shows when the evaluation runs: no 'not reachable' notice without it", () => {
  assert.doesNotMatch(page, /done\.unavailable/);
  assert.match(page, /completed\.answers\.length > 0 && aiAvailable/);
});
