import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { DiscoveryMustHaves, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import {
  getCandidateMatchingV01Constraints,
  getFounderPrivateSearchPreferences,
  privateSearchConstraintsFromStored,
  PrivateSearchConstraintsError,
} from "@/features/discovery/privateSearchConstraints";
import { EMPTY_MUST_HAVES, findPersonFromDiscovery } from "@/lib/matching/v01/adapters";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";
import type { FindMustHavesInput } from "@/lib/matching/v01/types";

/**
 * Private FIND-Suchkriterien als Matching-Eingabe: Loader, Trennung von
 * öffentlichen Kandidatendaten, eingefrorener v0.1-Vertrag, Reason-Privacy.
 * RLS prüft supabase/tests/founder_search_preferences_privacy.sql.
 */

const read = (path: string) => readFileSync(path, "utf8");

const STORED: DiscoveryMustHaves = {
  requiredRolesAny: ["tech"],
  minimumAvailabilityHoursPerWeek: 20,
  acceptedRemoteModes: ["remote", "hybrid"],
  desiredLocationRegion: "Leipzig",
  acceptedSearchIntents: ["ready_now"],
  acceptedStartHorizons: ["now", "next_3_months"],
  requiredCapabilityAreasAny: ["b2b_sales"],
  requiredExpertiseAny: ["Vertrieb"],
  requiredIndustriesAny: ["Geheimbranche"],
  acceptedCommitmentLevels: ["full_time"],
  acceptedVentureStages: ["already_building"],
  acceptedVentureGoals: ["exit_oriented"],
} as DiscoveryMustHaves;

type Result = { data: unknown; error: unknown };
function ownClient(sessionUserId: string | null, result: Result | "throw") {
  const calls: { table: string; select?: string; eq?: [string, unknown]; in?: [string, unknown] }[] = [];
  const finish = () => (result === "throw" ? Promise.reject(new Error("netz")) : Promise.resolve(result));
  const client = {
    auth: { getUser: async () => ({ data: { user: sessionUserId ? { id: sessionUserId } : null }, error: null }) },
    from(table: string) {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const chain = {
        select(columns: string) {
          call.select = columns;
          return chain;
        },
        eq(column: string, value: unknown) {
          call.eq = [column, value];
          return chain;
        },
        in(column: string, value: unknown) {
          call.in = [column, value];
          return finish();
        },
        maybeSingle: finish,
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}
const isCode = (code: string) => (error: unknown) => error instanceof PrivateSearchConstraintsError && error.code === code;

// ---------------------------------------------------------------------------
// Loader: eigene Kriterien
// ---------------------------------------------------------------------------
test("vollständig: acht v0.1-Kriterien und vier Produktfelder getrennt", async () => {
  const fake = ownClient("me", { data: { must_haves: STORED }, error: null });
  const c = await getFounderPrivateSearchPreferences(fake.client, "me");
  assert.equal(c.visibility, "owner_only");
  assert.equal(c.stored, true);
  assert.deepEqual(Object.keys(c.matchingV01).sort(), Object.keys(EMPTY_MUST_HAVES).sort());
  assert.deepEqual(c.matchingV01.requiredRolesAny, ["tech"]);
  assert.equal(c.matchingV01.desiredLocationRegion, "Leipzig");
  assert.deepEqual(c.productConstraintsNotInMatchingV01, {
    requiredIndustriesAny: ["Geheimbranche"],
    acceptedCommitmentLevels: ["full_time"],
    acceptedVentureStages: ["already_building"],
    acceptedVentureGoals: ["exit_oriented"],
  });
  assert.ok(!("requiredIndustriesAny" in c.matchingV01) && !("acceptedVentureGoals" in c.matchingV01));
  assert.deepEqual(fake.calls[0], { table: "founder_search_preferences", select: "must_haves", eq: ["user_id", "me"] });
});

test("teilweise: nur Gesetztes, Rest leer; unbekannte Werte fallen weg", async () => {
  const fake = ownClient("me", {
    data: { must_haves: { requiredRolesAny: ["tech", "erfunden"], acceptedCommitmentLevels: ["immer"] } },
    error: null,
  });
  const c = await getFounderPrivateSearchPreferences(fake.client, "me");
  assert.deepEqual(c.matchingV01, { ...EMPTY_MUST_HAVES, requiredRolesAny: ["tech"] });
  assert.deepEqual(c.productConstraintsNotInMatchingV01.acceptedCommitmentLevels, []);
});

test("keine Zeile: keine Kriterien, keine erfundenen Defaults", async () => {
  const c = await getFounderPrivateSearchPreferences(ownClient("me", { data: null, error: null }).client, "me");
  assert.equal(c.stored, false);
  assert.deepEqual(c.matchingV01, EMPTY_MUST_HAVES);
  assert.equal(c.matchingV01.minimumAvailabilityHoursPerWeek, null);
  assert.deepEqual(Object.values(c.productConstraintsNotInMatchingV01), [[], [], [], []]);
});

test("Ladefehler und Ausnahme: fail closed (Fehler, keine leeren Kriterien)", async () => {
  await assert.rejects(getFounderPrivateSearchPreferences(ownClient("me", { data: null, error: { code: "x" } }).client, "me"), isCode("load_failed"));
  await assert.rejects(getFounderPrivateSearchPreferences(ownClient("me", "throw").client, "me"), isCode("load_failed"));
});

test("fremde oder fehlende Identität: Fehler, ohne die Tabelle zu fragen", async () => {
  const foreign = ownClient("me", { data: { must_haves: STORED }, error: null });
  await assert.rejects(getFounderPrivateSearchPreferences(foreign.client, "someone-else"), isCode("forbidden"));
  assert.equal(foreign.calls.length, 0);
  const anon = ownClient(null, { data: { must_haves: STORED }, error: null });
  await assert.rejects(getFounderPrivateSearchPreferences(anon.client, "me"), isCode("forbidden"));
  assert.equal(anon.calls.length, 0);
});

// ---------------------------------------------------------------------------
// Loader: Gegenrichtung (Kandidaten), nur serverseitig
// ---------------------------------------------------------------------------
test("Kandidaten: nur die acht v0.1-Kriterien, fehlende leer, Fehler werfen", async () => {
  const fake = ownClient(null, { data: [{ user_id: "c1", must_haves: STORED }], error: null });
  const map = await getCandidateMatchingV01Constraints(fake.client, ["c1", "c2", "c1"]);
  assert.deepEqual(fake.calls[0], { table: "founder_search_preferences", select: "user_id, must_haves", in: ["user_id", ["c1", "c2"]] });
  assert.deepEqual(Object.keys(map.get("c1") as FindMustHavesInput).sort(), Object.keys(EMPTY_MUST_HAVES).sort());
  assert.ok(!JSON.stringify([...map]).includes("Geheimbranche"), "Produktfelder verlassen den Loader nicht");
  assert.deepEqual(map.get("c2"), EMPTY_MUST_HAVES);
  await assert.rejects(getCandidateMatchingV01Constraints(ownClient(null, { data: null, error: { code: "x" } }).client, ["c1"]), isCode("load_failed"));
  await assert.rejects(getCandidateMatchingV01Constraints(ownClient(null, "throw").client, ["c1"]), isCode("load_failed"));
  assert.equal((await getCandidateMatchingV01Constraints(ownClient(null, "throw").client, [])).size, 0);
});

// ---------------------------------------------------------------------------
// Eingefrorener v0.1-Vertrag
// ---------------------------------------------------------------------------
function profile(userId: string, o: Partial<FounderDiscoveryProfile> = {}): FounderDiscoveryProfile {
  return {
    id: `fdp-${userId}`, userId, status: "active", displayName: userId, headline: "", bio: "", ownRoles: ["sales"], seekingRoles: ["tech"],
    ownRoleOther: null, seekingRoleOther: null, expertise: ["Vertrieb"], industries: ["Software"], locationRegion: "Berlin", remoteMode: "remote",
    availabilityHoursPerWeek: 30, availabilityFlexibility: null, availabilityCondition: null, recentStep: null,
    commitmentLevel: "part_time", ventureStage: "idea_validating", ventureGoal: "profitable_business", searchIntent: "ready_now",
    startHorizon: "now", publishedAt: null, createdAt: "2026-10-01", updatedAt: "2026-10-01", ...o,
  } as FounderDiscoveryProfile;
}
const CTX = { familyOfArea: {}, idfCorpusVersion: "test", blocked: false, computedAt: null };
const pair = (aMustHaves: Partial<DiscoveryMustHaves> | FindMustHavesInput | null, b: Partial<FounderDiscoveryProfile> = {}) =>
  matchFindPair(
    findPersonFromDiscovery({ profile: profile("a"), mustHaves: aMustHaves, isFounder: true, capabilityRows: [], capabilityDisclosure: null }),
    findPersonFromDiscovery({ profile: profile("b", { ownRoles: ["tech"], seekingRoles: ["sales"], ...b }), mustHaves: null, isFounder: true, capabilityRows: [], capabilityDisclosure: null }),
    CTX,
  );

test("die vier Produktfelder verändern weder Gate noch Score noch Reasons", () => {
  const product = { requiredIndustriesAny: ["Geheimbranche"], acceptedCommitmentLevels: ["full_time"], acceptedVentureStages: ["already_building"], acceptedVentureGoals: ["exit_oriented"] } as Partial<DiscoveryMustHaves>;
  // b verletzt alle vier: andere Branche, Teilzeit, Idee, profitabel
  const without = pair(null);
  const withProduct = pair(product);
  assert.deepEqual(withProduct, without);
  assert.equal(withProduct.eligibility.status, "eligible", "kein neuer Ausschluss wegen Branche/Commitment/Phase/Ziel");
  const loaded = privateSearchConstraintsFromStored("a", { ...product, requiredRolesAny: [] }, true);
  assert.deepEqual(pair(loaded.matchingV01), without, "über den Loader genauso");
});

test("die v0.1-Must-haves wirken unverändert (Konflikt, UNKNOWN, erfüllt)", () => {
  assert.equal(pair({ requiredRolesAny: ["design"] }).eligibility.status, "ineligible");
  assert.equal(pair({ requiredRolesAny: ["tech"] }).eligibility.status, "eligible");
  assert.equal(pair({ requiredRolesAny: ["tech"] }, { ownRoles: [] }).eligibility.status, "uncertain");
  assert.equal(pair({ minimumAvailabilityHoursPerWeek: 40 }).eligibility.status, "ineligible");
  assert.equal(pair({ minimumAvailabilityHoursPerWeek: 40 }, { availabilityHoursPerWeek: null }).eligibility.status, "uncertain");
  const loaded = privateSearchConstraintsFromStored("a", STORED, true).matchingV01;
  assert.deepEqual(pair(loaded), pair(STORED), "Loader-Ausgabe = bisheriger Adapterweg");
});

// ---------------------------------------------------------------------------
// Reasons: ein privates Kriterium erfährt die Gegenseite nie
// ---------------------------------------------------------------------------
test("Gate-Grund aus einem privaten Kriterium ist nur für die setzende Person sichtbar", () => {
  const r = pair({ requiredRolesAny: ["tech"], desiredLocationRegion: "Leipzig" }, { ownRoles: [], locationRegion: null });
  assert.equal(r.eligibility.status, "uncertain");
  assert.ok(r.eligibility.reasons.length > 0);
  for (const reason of r.eligibility.reasons) {
    assert.equal(reason.conditionOwner, "a");
    assert.deepEqual(reason.visibleTo, ["a"], `${reason.code} darf b nicht sehen`);
  }
  const forB = r.explanations.filter((e) => e.audience === "b");
  assert.ok(!forB.some((e) => e.code === "FIND_UNKNOWN_LOCATION"), "b erfährt nicht, dass a einen Ort verlangt");
  assert.ok(!JSON.stringify(forB).includes("Leipzig") && !JSON.stringify(forB).includes("tech\""), "keine Werte aus a's Kriterien");
  assert.ok(r.explanations.some((e) => e.audience === "a" && e.code === "FIND_UNKNOWN_LOCATION"), "a sieht den eigenen offenen Punkt");
});

test("ausgeschlossen wegen eines privaten Kriteriums: gar keine Reasons, auch nicht für die Gegenseite", () => {
  const r = pair({ requiredRolesAny: ["design"] });
  assert.equal(r.eligibility.status, "ineligible");
  assert.deepEqual(r.explanations, []);
  assert.ok(r.eligibility.reasons.every((x) => !x.visibleTo.includes("b")));
});

test("Reason-Parameter enthalten nie Werte aus Must-haves", () => {
  const r = pair({ ...STORED, requiredRolesAny: [], minimumAvailabilityHoursPerWeek: null, acceptedRemoteModes: [], desiredLocationRegion: null, acceptedSearchIntents: [], acceptedStartHorizons: [], requiredCapabilityAreasAny: [], requiredExpertiseAny: [] });
  const params = JSON.stringify(r.explanations.map((e) => e.params));
  for (const secret of ["Geheimbranche", "exit_oriented", "already_building"]) assert.ok(!params.includes(secret), secret);
});

// ---------------------------------------------------------------------------
// Trennung öffentlich / privat, kein Client
// ---------------------------------------------------------------------------
test("öffentliche Kandidatendaten kennen keine privaten Kriterien", () => {
  const types = read("src/features/discovery/discoveryTypes.ts");
  const publicProfile = types.slice(types.indexOf("export type FounderDiscoveryProfile"), types.indexOf("export type FounderSearchPreferences"));
  assert.doesNotMatch(publicProfile, /mustHaves|must_haves|Constraints/);
  const data = read("src/features/discovery/discoveryData.ts");
  const mapping = data.slice(data.indexOf("const candidateProfiles: FounderDiscoveryProfile[]"), data.indexOf("const alignmentSignals"));
  assert.doesNotMatch(mapping, /mustHaves|must_haves/, "Suchtreffer werden nur aus RPC-Spalten des Kandidaten gebaut");
});

test("der private Loader ist serverseitig und noch von keinem Produktpfad eingebunden", () => {
  assert.match(read("src/features/discovery/privateSearchConstraints.ts"), /^import "server-only";/);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && !path.endsWith("privateSearchConstraints.ts")) {
        const source = read(path);
        if (/from "@\/features\/discovery\/privateSearchConstraints"/.test(source)) users.push(path);
        if (/^["']use client["']/.test(source)) assert.doesNotMatch(source, /must_haves|getOwnSearchPreferences/, `${path}: Client lädt Kriterien`);
      }
    }
  };
  walk("src");
  assert.deepEqual(users, []);
});

// ---------------------------------------------------------------------------
// Produktive FIND-Suche unverändert
// ---------------------------------------------------------------------------
test("heutige Suche: acht Kriterien als RPC-Filter, die vier Produktfelder nicht; Sortierung published_at", () => {
  const data = read("src/features/discovery/discoveryData.ts");
  const call = data.slice(data.indexOf('rpc("search_founder_discovery_profiles_v2"'), data.indexOf("if (error) {", data.indexOf('rpc("search_founder_discovery_profiles_v2"')));
  const params = [...call.matchAll(/(p_\w+): mustHaves\.(\w+)/g)].map((m) => m[2]).sort();
  assert.deepEqual(params, [
    "acceptedRemoteModes", "acceptedSearchIntents", "acceptedStartHorizons", "desiredLocationRegion",
    "minimumAvailabilityHoursPerWeek", "requiredCapabilityAreasAny", "requiredExpertiseAny", "requiredRolesAny",
  ]);
  assert.doesNotMatch(call, /requiredIndustriesAny|acceptedCommitmentLevels|acceptedVentureStages|acceptedVentureGoals/);
  const dir = "../supabase/migrations";
  const latest = readdirSync(dir).sort().filter((f) => /function public\.search_founder_discovery_profiles_v2/.test(read(join(dir, f)))).at(-1) as string;
  assert.equal(latest, "20261091120000_search_by_frame.sql");
  assert.match(read(join(dir, latest)), /order by profile\.published_at desc nulls last, profile\.id/);
});
