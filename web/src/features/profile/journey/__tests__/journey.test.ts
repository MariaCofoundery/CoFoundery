import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  focusSkillFor,
  intentionFor,
  interestsFor,
  needsFounderRole,
  nextPathFor,
  parseJourneyPayload,
  startAreaFor,
} from "@/features/profile/journey/journeyModel";
import { isProfileJourneyEnabled } from "@/features/profile/journey/journeyFlag";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const payload = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ areas: ["connect"], name: "Mara", headline: "", bio: "", foci: [], expertise: [], where: "", alignPlan: "first", ...over });

test("die Antworten werden streng gelesen", () => {
  assert.equal(parseJourneyPayload("kein json"), null);
  assert.equal(parseJourneyPayload(undefined), null);
  assert.equal(parseJourneyPayload("x".repeat(30_000)), null);

  const parsed = parseJourneyPayload(payload({ areas: ["find", "gibtsnicht", "align"], foci: ["tech", "x"], where: "mars", alignPlan: "komisch", expertise: ["A", "A", "B,C", " ", "D"] }));
  assert.ok(parsed);
  // feste Reihenfolge, nur Bekanntes
  assert.deepEqual(parsed.areas, ["align", "find"]);
  assert.deepEqual(parsed.foci, ["tech"]);
  assert.equal(parsed.where, "");
  assert.equal(parsed.alignPlan, "first");
  // doppelt, leer und mit Komma (würde die Kommaliste zerlegen) fällt weg
  assert.deepEqual(parsed.expertise, ["A", "D"]);
});

test("die Längen werden begrenzt", () => {
  const parsed = parseJourneyPayload(payload({ name: "n".repeat(500), headline: "h".repeat(500), bio: "b".repeat(5000), expertise: Array.from({ length: 20 }, (_, i) => `E${i}`) }));
  assert.ok(parsed);
  assert.equal(parsed.name.length, 80);
  assert.equal(parsed.headline.length, 160);
  assert.equal(parsed.bio.length, 1200);
  assert.equal(parsed.expertise.length, 8);
});

test("Align und Find machen zur Founderin, Connect allein nicht", () => {
  assert.equal(needsFounderRole(["connect"]), false);
  assert.equal(needsFounderRole(["align"]), true);
  assert.equal(needsFounderRole(["find", "connect"]), true);
  assert.equal(needsFounderRole([]), false);
});

test("Schwerpunkt, Absicht und Interessen folgen dem bisherigen Einstieg", () => {
  assert.equal(focusSkillFor(["product", "tech"]), "Product");
  assert.equal(focusSkillFor([]), "Allrounder");
  assert.equal(startAreaFor(["connect", "find"]), "find");
  assert.equal(intentionFor(["find", "connect"]), "Suche");
  assert.equal(intentionFor(["align", "find"]), "Selbsttest");
  assert.deepEqual(interestsFor(["connect", "align"]), ["align", "connect"]);
});

test("der Abschluss führt in den ersten Bereich, der jetzt etwas zu tun hat", () => {
  assert.equal(nextPathFor({ areas: ["align", "find"], alignPlan: "first" }), "/research/workstyle-pretest?version=8.5a-v3");
  assert.equal(nextPathFor({ areas: ["align", "find"], alignPlan: "later" }), "/discovery/profile");
  assert.equal(nextPathFor({ areas: ["connect"], alignPlan: "first" }), "/connect/profile");
  assert.equal(nextPathFor({ areas: ["align"], alignPlan: "later" }), "/dashboard");
  assert.equal(nextPathFor({ areas: [], alignPlan: "first" }), "/dashboard");
});

test("die Reise ist ein Zusatzweg: ohne Schalter schickt /welcome niemanden dorthin", () => {
  assert.equal(isProfileJourneyEnabled({}), false);
  assert.equal(isProfileJourneyEnabled({ PROFILE_JOURNEY: "false" }), false);
  assert.equal(isProfileJourneyEnabled({ PROFILE_JOURNEY: " TRUE " }), true);
  const welcome = code("src/app/welcome/page.tsx");
  assert.match(welcome, /isProfileJourneyEnabled\(\) && params\.classic !== "1" && params\.intent !== "advisor"/);
});

test("der Abschluss veröffentlicht nichts und markiert zuletzt", () => {
  const action = code("src/features/profile/journey/journeyActions.ts");
  // keine Sichtbarkeit, kein Veröffentlichen, kein Foto
  assert.doesNotMatch(action, /status\s*[:=]\s*["']active|published|photo_visible|visibility|discovery|network_profiles/i);
  // Reihenfolge: Mitgliedschaft vor der Markierung
  assert.ok(action.indexOf("join_network_as_member") < action.indexOf("markOnboardingComplete(client"));
  // Nur Connect legt keine profiles-Zeile an
  assert.match(action, /if \(needsFounderRole\(payload\.areas\)\)/);
  // Rolle immer nur founder, nie advisor
  assert.match(action, /roles: \["founder"\]/);
  assert.doesNotMatch(action, /advisor/);
});

test("die Reise gibt dieselbe Pforte wie der Einstieg und speichert nichts auf dem Weg", () => {
  const page = code("src/app/welcome/reise/page.tsx");
  assert.match(page, /redirect\(`\/login\?next=/);
  assert.match(page, /onboarding_completed_at\) redirect\(next\)/);
  const ui = code("src/features/profile/journey/ProfileJourney.tsx");
  // Antworten liegen im Browser; abgeschickt wird erst am Ende.
  assert.doesNotMatch(ui, /fetch\(|localStorage|sessionStorage/);
  assert.match(ui, /action=\{completeJourneyAction\}/);
});

test("deutsch und englisch haben dieselben Schlüssel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
      : [prefix];
  const de = JSON.parse(readFileSync("messages/de/profile.json", "utf8")).journey;
  const en = JSON.parse(readFileSync("messages/en/profile.json", "utf8")).journey;
  assert.deepEqual(keys(de).sort(), keys(en).sort());
});
