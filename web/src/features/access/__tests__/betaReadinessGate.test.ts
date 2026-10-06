import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Beta-Readiness-Gate 06.10.2026: die behobenen Blocker ausserhalb von ALIGN.
 */

const read = (path: string) => readFileSync(path, "utf8");

test("Einladungs-Einstieg bietet nur Plaene mit Founder-Rolle an", () => {
  const form = read("src/features/profile/ProfileBasicsForm.tsx");
  // Optionale Liste; ohne Angabe bleiben alle vier Plaene (freie Registrierung).
  assert.match(form, /plans\?: readonly OnboardingPlan\[\];/);
  assert.match(form, /plans = ONBOARDING_PLANS,/);
  assert.match(form, /\{plans\.map\(\(planOption\) =>/);
  assert.match(form, /const ONBOARDING_PLANS: OnboardingPlan\[\] = \["founder", "advisor", "both", "connect"\];/);

  const join = read("src/app/join/welcome/page.tsx");
  assert.match(join, /const INVITEE_PLANS: readonly OnboardingPlan\[\] = \["founder", "both"\];/);
  assert.match(join, /plans=\{INVITEE_PLANS\}/);
  // Der freie Einstieg bekommt keine Einschraenkung.
  assert.doesNotMatch(read("src/app/welcome/page.tsx"), /plans=\{/);
});

test("CONNECT-Kontaktanfrage: Antwort steht im Formular, nicht am Knopf", () => {
  const actions = read("src/features/connect/ConnectContactActions.tsx");
  assert.match(actions, /<input type="hidden" name="response" value="accepted" \/>/);
  assert.match(actions, /<input type="hidden" name="response" value="declined" \/>/);
  assert.equal((actions.match(/<form action=\{respondConnectContactAction\}>/g) ?? []).length, 2);
  // Der Antwortwert haengt nicht mehr am gedrueckten Knopf.
  assert.doesNotMatch(actions, /fieldName="response"/);
  // Die Serveraktion prueft weiterhin selbst.
  assert.match(read("src/features/connect/connectActions.ts"), /response !== "accepted" && response !== "declined"/);
});
