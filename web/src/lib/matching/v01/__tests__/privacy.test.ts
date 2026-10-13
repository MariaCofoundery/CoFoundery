import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { CapabilityEntry } from "@/features/capability/capabilityTypes";
import type { DiscoveryMustHaves, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { findPersonFromDiscovery } from "@/lib/matching/v01/adapters";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";
import { attachWorkstyleContext } from "@/lib/matching/v01/workstyle";
import { FIND_CTX, cap, person } from "@/lib/matching/v01/__tests__/helpers/builders";

const SECRET_EVIDENCE = "GEHEIME-EVIDENCE-ERZAEHLUNG";
const SECRET_RESEARCH = "RESEARCH-ITEM-DEC-07";

function discoveryProfile(userId: string, extra: Record<string, unknown> = {}): FounderDiscoveryProfile {
  return {
    id: `fdp-${userId}`,
    userId,
    status: "active",
    displayName: "Testperson",
    headline: "Headline",
    bio: "Bio",
    ownRoles: ["tech"],
    seekingRoles: ["sales"],
    ownRoleOther: null,
    seekingRoleOther: null,
    expertise: ["Backend"],
    industries: ["SaaS"],
    locationRegion: "Berlin",
    remoteMode: "hybrid",
    availabilityHoursPerWeek: 20,
    availabilityFlexibility: "fixed",
    availabilityCondition: null,
    recentStep: null,
    commitmentLevel: "part_time",
    ventureStage: "idea_validating",
    ventureGoal: "venture_scale",
    searchIntent: "ready_now",
    startHorizon: "now",
    publishedAt: "2026-10-01",
    createdAt: "2026-09-01",
    updatedAt: "2026-10-02",
    ...extra,
  } as FounderDiscoveryProfile;
}

const entry = (area: string, level: 1 | 2 | 3 | 4 | 5, wish: CapabilityEntry["ownership_wish"]): CapabilityEntry => ({
  id: `e-${area}`,
  area_id: area,
  application_level: level,
  ownership_wish: wish,
  evidence: [{ id: "ev1", narrative: SECRET_EVIDENCE }],
});

test("Adapter: ohne ausdrückliche Freigabe ist capabilityMatchingAllowed false – auch bei Sichtbarkeit areas_depth_on_contact", () => {
  const p = findPersonFromDiscovery({
    profile: discoveryProfile("u1"),
    mustHaves: null,
    isFounder: true,
    capabilityRows: [entry("b2b_sales", 5, "own")],
    capabilityDisclosure: "areas_depth_on_contact",
    hasContact: true,
  });
  assert.equal(p.capabilities.matchingAllowed, false);
  assert.equal(p.capabilities.visibleToCounterpart, "areas_and_depth", "Sichtbarkeit bleibt getrennt erhalten");
});

test("versteckte Capability-Daten gelangen ohne Freigabe nicht ins Matching", () => {
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")], seekingRoles: ["tech"] });
  const withHidden = person("b", { ownRoles: ["tech"], caps: [cap("b2b_sales", 5, "own")], capabilityMatchingAllowed: false });
  const without = person("b", { ownRoles: ["tech"], caps: [], capabilityMatchingAllowed: false });
  const r1 = matchFindPair(a, withHidden, FIND_CTX);
  const r2 = matchFindPair(a, without, FIND_CTX);
  assert.deepEqual(r1.relevance, r2.relevance);
  assert.deepEqual(r1.confidence, r2.confidence);
  assert.deepEqual(r1.explanations, r2.explanations);
});

test("Capability-Reason nur bei Freigabe UND Tiefen-Sichtbarkeit; sonst gar keiner (kein Ersatz)", () => {
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] });
  const areasOnly = matchFindPair(a, person("b", { caps: [cap("b2b_sales", 5, "own")], capabilityVisibility: "areas" }), FIND_CTX);
  assert.equal(areasOnly.relevance.components.aToB.capCover, 1, "Matching darf die Angabe verwenden");
  assert.ok(!areasOnly.explanations.some((e) => e.code.startsWith("FIND_AREA")), "Anzeige ist nicht freigegeben");
});

test("private Evidence-Narrative und Research-Daten erreichen weder Eingabe noch Ergebnis", () => {
  const mustHaves = { requiredIndustriesAny: ["Geheimbranche"], acceptedVentureGoals: ["exit_oriented"] } as Partial<DiscoveryMustHaves>;
  const a = findPersonFromDiscovery({
    profile: discoveryProfile("u1", { researchAnswers: { dec: SECRET_RESEARCH }, workstyleResearch: SECRET_RESEARCH, personResources: ["privat"] }),
    mustHaves,
    isFounder: true,
    capabilityRows: [entry("b2b_sales", 5, "own")],
    capabilityDisclosure: "areas_depth_on_contact",
    hasContact: true,
    capabilityMatchingAllowed: true,
  });
  const b = findPersonFromDiscovery({
    profile: discoveryProfile("u2", { ownRoles: ["sales"], seekingRoles: ["tech"] }),
    mustHaves: null,
    isFounder: true,
    capabilityRows: [entry("b2b_sales", 2, "prefer_other")],
    capabilityDisclosure: "areas_depth_on_contact",
    hasContact: true,
    capabilityMatchingAllowed: true,
  });
  const inputs = JSON.stringify([a, b]);
  for (const secret of [SECRET_EVIDENCE, SECRET_RESEARCH, "privat", "Geheimbranche", "Bio", "Headline"]) {
    assert.ok(!inputs.includes(secret), `Eingabe enthält ${secret}`);
  }
  const r = matchFindPair(a, b, FIND_CTX);
  assert.ok(r.explanations.some((e) => e.code === "FIND_AREA_OWN_COVERED"), "die freigegebene Angabe wirkt");
  const out = JSON.stringify(r);
  for (const secret of [SECRET_EVIDENCE, SECRET_RESEARCH, "Geheimbranche"]) assert.ok(!out.includes(secret), `Ergebnis enthält ${secret}`);
  assert.deepEqual(Object.keys(a).sort(), [
    "availabilityFlexibility", "availabilityHoursPerWeek", "capabilities", "commitmentLevel", "expertise", "findProfileStatus",
    "industries", "inputVersion", "isFounder", "locationRegion", "mustHaves", "ownRoles", "personId", "publishedAt", "remoteMode",
    "searchIntent", "seekingRoles", "startHorizon", "ventureGoal", "ventureStage",
  ]);
  assert.deepEqual(Object.keys(a.mustHaves).sort(), [
    "acceptedRemoteModes", "acceptedSearchIntents", "acceptedStartHorizons", "desiredLocationRegion",
    "minimumAvailabilityHoursPerWeek", "requiredCapabilityAreasAny", "requiredExpertiseAny", "requiredRolesAny",
  ], "nur die acht Gate-Kriterien von v0.1");
});

test("Workstyle: nur bei beidseitiger Zustimmung angehängt, ohne Einfluss auf Gate, Relevanz, Confidence", () => {
  const r = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"] }), FIND_CTX);
  const points = [{ area: "EVI", pattern: "DISCUSSION_POINT" as const }];
  const both = attachWorkstyleContext(r, { a: true, b: true }, points);
  const one = attachWorkstyleContext(r, { a: true, b: false }, points);
  assert.deepEqual(both.workstyleContext, { points });
  assert.equal(one.workstyleContext, null);
  assert.deepEqual({ ...both, workstyleContext: null }, r);
});

test("Code-Review-Wächter: Laufzeitcode liest keine Research-, Silver- oder Holdout-Daten und keinen Workstyle", () => {
  const dir = path.join(import.meta.dirname, "..");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 12);
  for (const f of files) {
    // Nur Code prüfen: Kommentare dürfen die Grenzen beschreiben.
    const src = readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(src, /silver|holdout|reference_pairs|reference_class|docs\/research|__tests__|fixtures/i, `${f}`);
    assert.doesNotMatch(src, /from "@\/lib\/supabase|createClient|\.from\(|\.rpc\(|fetch\(/, `${f}: keine DB, kein Netz`);
    if (!["workstyle.ts", "types.ts", "index.ts"].includes(f)) {
      assert.doesNotMatch(src.replace(/workstyleContext: null/g, ""), /workstyle/i, `${f}: Workstyle nur im Kontext-Anhang`);
    }
  }
});
