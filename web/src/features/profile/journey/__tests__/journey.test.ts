import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  focusSkillFor,
  intentionFor,
  interestsFor,
  needsFounderRole,
  nextPathFor,
  openSetupSteps,
  parseJourneyPayload,
  parseSetupPayload,
  SETUP_STEPS,
  rolesFor,
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
  assert.equal(nextPathFor({ areas: ["align", "find"], alignPlan: "first" }), "/research/workstyle-pretest?version=8.5a-v5");
  assert.equal(nextPathFor({ areas: ["align", "find"], alignPlan: "later" }), "/discovery/profile");
  assert.equal(nextPathFor({ areas: ["connect"], alignPlan: "first" }), "/connect/profile");
  assert.equal(nextPathFor({ areas: ["align"], alignPlan: "later" }), "/dashboard");
  assert.equal(nextPathFor({ areas: [], alignPlan: "first" }), "/dashboard");
});

test("Advisor ist ein eigener Bereich: Rolle, Absicht, Interesse und Ziel", () => {
  assert.deepEqual(rolesFor(["connect"]), []);
  assert.deepEqual(rolesFor(["advise"]), ["advisor"]);
  assert.deepEqual(rolesFor(["find", "advise"]), ["founder", "advisor"]);
  assert.equal(intentionFor(["advise"]), "Begleiten");
  assert.equal(intentionFor(["find", "advise"], "advise"), "Begleiten");
  assert.equal(intentionFor(["find", "advise"], "find"), "Suche");
  assert.deepEqual(interestsFor(["advise", "connect"]), ["connect", "advise"]);
  assert.equal(nextPathFor({ areas: ["advise"], alignPlan: "first" }), "/advisor/dashboard");
});

test("womit man anfängt, bestimmt der Abschluss; nicht Gewähltes zählt nicht", () => {
  const both = { areas: ["find", "advise"] as ("find" | "advise")[], alignPlan: "first" as const };
  assert.equal(nextPathFor({ ...both, start: "advise" }), "/advisor/dashboard");
  assert.equal(nextPathFor({ ...both, start: "find" }), "/discovery/profile");
  assert.equal(nextPathFor({ ...both, start: "connect" as never }), "/discovery/profile");
  assert.equal(startAreaFor(["find", "advise"], "advise"), "advise");
  const parsed = parseJourneyPayload(payload({ areas: ["find", "advise"], start: "align" }));
  assert.equal(parsed?.start, "");
  assert.equal(parseJourneyPayload(payload({ areas: ["find", "advise"], start: "advise" }))?.start, "advise");
});

test("die Reise ist der Einstieg: nur ein ausdrückliches false stellt den langen Einstieg wieder her", () => {
  assert.equal(isProfileJourneyEnabled({}), true);
  assert.equal(isProfileJourneyEnabled({ PROFILE_JOURNEY: "true" }), true);
  assert.equal(isProfileJourneyEnabled({ PROFILE_JOURNEY: " FALSE " }), false);
  const welcome = code("src/app/welcome/page.tsx");
  assert.match(welcome, /isProfileJourneyEnabled\(\) && params\.classic !== "1"/);
  // Ein Advisor-Link geht mit und belegt in der Reise "Advisor" vor.
  assert.match(welcome, /params\.intent === "advisor"\) query\.set\("intent", "advisor"\)/);
});

test("der Abschluss veröffentlicht nichts und markiert zuletzt", () => {
  const action = code("src/features/profile/journey/journeyActions.ts");
  // keine Sichtbarkeit, kein Veröffentlichen, kein Foto
  assert.doesNotMatch(action, /status\s*[:=]\s*["']active|published|photo_visible|visibility|discovery|network_profiles/i);
  // Reihenfolge: Mitgliedschaft vor der Markierung
  assert.ok(action.indexOf("join_network_as_member") < action.indexOf("markOnboardingComplete(client"));
  // Nur Connect legt keine profiles-Zeile an (rolesFor ist dann leer)
  // Die Rollen kommen aus dem Modell, nie aus dem Browser
  assert.match(action, /const roles = rolesFor\(payload\.areas\)/);
  assert.match(action, /if \(roles\.length > 0\)/);
  assert.doesNotMatch(action, /formData\.get\("roles"\)/);
});

test("die Reise gibt dieselbe Pforte wie der Einstieg; der Start ist eine Willkommensseite mit Name und Bereichen", () => {
  const page = code("src/app/welcome/reise/page.tsx");
  assert.match(page, /redirect\(`\/login\?next=/);
  assert.match(page, /onboarding_completed_at\) redirect\(next\)/);
  const ui = code("src/features/profile/journey/ProfileJourney.tsx");
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
  assert.match(ui, /action=\{isSetup \? finishSetupAction : completeJourneyAction\}/);
  // Zwei Karten und der Abschluss - Profilfragen und Align-Plan gibt es erst danach.
  assert.match(ui, /isSetup \? setupSteps : \["welcome"\]/);
});

test("das Setup speichert jeden Schritt sofort, nur Gefülltes, und veröffentlicht nichts", () => {
  const ui = code("src/features/profile/journey/ProfileJourney.tsx");
  // Beim Weitergehen, nicht erst am Ende.
  assert.match(ui, /if \(isSetup && to > index\) void saveSetupProgressAction\(payload\)/);
  const action = code("src/features/profile/journey/journeyActions.ts");
  const save = action.slice(action.indexOf("export async function saveSetupProgressAction"));
  assert.match(save, /if \(payload\.headline\) core\.headline/);
  assert.match(save, /if \(Object\.keys\(core\)\.length === 0\) return \{ ok: true \}/);
  assert.doesNotMatch(save, /status\s*[:=]\s*["']active|published|photo_visible|visibility|discovery|network_profiles|markOnboardingComplete|roles/i);
  // Die Rolle kommt nie aus dem Setup, und der Abschluss des Starts bleibt davon getrennt.
  assert.doesNotMatch(save, /upsertProfileBasicsRow|join_network_as_member/);
});

test("das Setup kennt vier Schritte und zeigt nur, was noch offen ist", () => {
  assert.deepEqual(SETUP_STEPS, ["headline", "about", "can", "where"]);
  assert.deepEqual(openSetupSteps({}), ["headline", "about", "can", "where"]);
  assert.deepEqual(openSetupSteps({ headline: "Gründerin", bio: " ", expertise: [], remote_mode: null }), ["about", "can", "where"]);
  assert.deepEqual(openSetupSteps({ headline: "x", bio: "y", expertise: ["Vertrieb"], remote_mode: "remote" }), []);
  // Streng gelesen, begrenzt.
  assert.equal(parseSetupPayload("kein json"), null);
  assert.equal(parseSetupPayload("[]"), null);
  const parsed = parseSetupPayload(JSON.stringify({ headline: "h".repeat(500), bio: "b", expertise: ["a", "a", "b,c", "d"], where: "unfug", extra: 1 }));
  assert.equal(parsed?.headline.length, 160);
  assert.deepEqual(parsed?.expertise, ["a", "d"]);
  assert.equal(parsed?.where, "");
  const page = code("src/app/welcome/profil/page.tsx");
  assert.match(page, /onboarding_completed_at\) redirect\("\/welcome"\)/);
  assert.match(page, /openSteps\.length === 0\) redirect\("\/dashboard"\)/);
  assert.match(code("src/features/dashboard/DashboardAside.tsx"), /href="\/welcome\/profil"/);
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
