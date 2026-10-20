import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/features/profile/ProfileBasicsForm.tsx", "utf8");
type Onboarding = {
  welcomePoints?: Record<string, string>;
  start?: { title?: string; hint?: string; lookAround?: string; options?: Record<string, string> };
};
const messages = (locale: string) =>
  (JSON.parse(readFileSync(`messages/${locale}/profile.json`, "utf8")) as { basicsForm: { onboarding: Onboarding } })
    .basicsForm.onboarding;

// 21.10.2026: Der Einstieg sagt zuerst, was Made2Found ist, und endet im ersten
// Schritt des Bereichs, mit dem man anfangen will.
test("der Einstieg bietet nur dort eine Startwahl an, wo er kein eigenes Ziel hat", () => {
  assert.match(form, /const canChooseStart = mode === "onboarding" && !isConnectPlan && openedAreas\.length > 1 && successRedirect === "\/dashboard"/);
  // Einladungen und andere Ziele bleiben unberuehrt.
  assert.match(form, /const effectiveRedirect = chosenStart \? startHrefFor\(chosenStart, plan\) : successRedirect;/);
  assert.match(form, /name="onSuccessRedirectTo" value=\{effectiveRedirect\}/);
  // Nichts ist vorausgewaehlt: „erst mal umsehen" ist der Standard.
  assert.match(form, /useState<ProductArea \| "">\(""\)/);
});

test("jede Startwahl fuehrt in den ersten Schritt des Bereichs", () => {
  assert.match(form, /if \(area === "align"\) return plan === "advisor" \? "\/advisor\/dashboard" : CURRENT_WORKSTYLE_HREF;/);
  assert.match(form, /if \(area === "find"\) return "\/discovery\/profile";/);
  assert.match(form, /return "\/connect\/profile";/);
});

test("das Versprechen steht auf der Begruessungsseite - in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const o = messages(locale);
    for (const point of ["areas", "consent", "noScore"]) {
      assert.ok(o.welcomePoints?.[point], `${locale}: welcomePoints.${point}`);
    }
    for (const key of ["title", "hint", "lookAround"]) assert.ok(o.start?.[key as "title" | "hint" | "lookAround"], `${locale}: start.${key}`);
    for (const key of ["align", "alignAdvisor", "find", "connect"]) assert.ok(o.start?.options?.[key], `${locale}: start.options.${key}`);
  }
  // Ohne Score steht ausdruecklich da.
  assert.match(messages("de").welcomePoints?.noScore ?? "", /kein Score/);
});
