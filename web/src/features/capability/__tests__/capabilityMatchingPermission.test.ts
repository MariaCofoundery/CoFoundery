import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import {
  CAPABILITY_MATCHING_DENIED,
  capabilityMatchingPermissionFromRow,
  getCapabilityMatchingPermission,
  getCapabilityMatchingPermissions,
} from "@/features/capability/capabilityMatchingPermission";
import { parseIdentityReturnPath } from "@/features/profile/identityReadiness";
import { findPersonFromDiscovery } from "@/lib/matching/v01/adapters";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";

/**
 * Capability-Matching-Freigabe: Server-Vertrag, Matching-Adapter, Trennung von
 * der Sichtbarkeit, vorbereitete Oberfläche und Rücksprung aus dem Editor.
 * Das Datenbank-Verhalten prüft supabase/tests/capability_matching_permission.sql.
 */

const read = (path: string) => readFileSync(path, "utf8");

type Result = { data: unknown; error: unknown };
function fakeClient(result: Result | "throw") {
  const calls: { table: string; select?: string; eq?: [string, unknown]; in?: [string, unknown] }[] = [];
  const finish = () => (result === "throw" ? Promise.reject(new Error("netz")) : Promise.resolve(result));
  const client = {
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
        in(column: string, values: unknown) {
          call.in = [column, values];
          return finish();
        },
        maybeSingle: finish,
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}

// ---------------------------------------------------------------------------
// Server-Vertrag: fail closed
// ---------------------------------------------------------------------------
test("nur ein ausdrückliches true ist eine Freigabe", () => {
  assert.equal(capabilityMatchingPermissionFromRow(null).allowed, false);
  assert.equal(capabilityMatchingPermissionFromRow({}).allowed, false);
  assert.equal(capabilityMatchingPermissionFromRow({ capability_matching_allowed: "true" }).allowed, false);
  assert.equal(capabilityMatchingPermissionFromRow({ capability_matching_allowed: 1 }).allowed, false);
  assert.equal(capabilityMatchingPermissionFromRow({ capability_matching_allowed: false }).allowed, false);
  assert.equal(capabilityMatchingPermissionFromRow({ capability_matching_allowed: true }).allowed, true);
  assert.equal(CAPABILITY_MATCHING_DENIED.allowed, false);
});

test("Loader: kein Zustand, Fehler, Ausnahme -> false; Zeile true -> true", async () => {
  assert.equal((await getCapabilityMatchingPermission(fakeClient({ data: null, error: null }).client, "u1")).allowed, false, "keine Zeile");
  assert.equal((await getCapabilityMatchingPermission(fakeClient({ data: { capability_matching_allowed: true }, error: { code: "x" } }).client, "u1")).allowed, false, "Ladefehler");
  assert.equal((await getCapabilityMatchingPermission(fakeClient("throw").client, "u1")).allowed, false, "Ausnahme");
  assert.equal((await getCapabilityMatchingPermission(fakeClient({ data: { capability_matching_allowed: true }, error: null }).client, "")).allowed, false, "ohne user_id");
  const ok = fakeClient({ data: { capability_matching_allowed: true }, error: null });
  assert.equal((await getCapabilityMatchingPermission(ok.client, "u1")).allowed, true);
  assert.deepEqual(ok.calls[0], { table: "person_core", select: "capability_matching_allowed", eq: ["user_id", "u1"] });
  assert.equal((await getCapabilityMatchingPermission(fakeClient({ data: { capability_matching_allowed: false }, error: null }).client, "u1")).allowed, false);
});

test("Loader für mehrere Personen: fehlende und fehlerhafte gelten als nicht freigegeben", async () => {
  const rows = { data: [{ user_id: "a", capability_matching_allowed: true }, { user_id: "b", capability_matching_allowed: false }], error: null };
  const map = await getCapabilityMatchingPermissions(fakeClient(rows).client, ["a", "b", "c"]);
  assert.deepEqual([...map].map(([id, p]) => [id, p.allowed]), [["a", true], ["b", false], ["c", false]]);
  const failed = await getCapabilityMatchingPermissions(fakeClient({ data: null, error: { code: "x" } }).client, ["a"]);
  assert.equal(failed.get("a")?.allowed, false);
  const thrown = await getCapabilityMatchingPermissions(fakeClient("throw").client, ["a"]);
  assert.equal(thrown.get("a")?.allowed, false);
});

test("Schreibpfad: nur eigene Person, nur diese eine Spalte, true und false ausdrücklich", () => {
  const action = read("src/features/capability/capabilityMatchingPermissionActions.ts");
  assert.match(action, /^"use server";/);
  assert.match(action, /export async function setCapabilityMatchingPermissionAction\(allowed: boolean\)/, "keine user_id vom Client");
  assert.match(action, /if \(typeof allowed !== "boolean"\)/);
  assert.match(action, /\.update\(\{ capability_matching_allowed: allowed \}\)\s*\.eq\("user_id", user\.id\)/);
  assert.equal((action.match(/\.from\(/g) ?? []).length, 1, "nur person_core");
  assert.equal((action.match(/\.update\(/g) ?? []).length, 1);
  assert.doesNotMatch(action.slice(action.indexOf(".update(")), /capability_disclosure|person_capability_entries/, "Freigabe ändert weder Sichtbarkeit noch Fähigkeiten");
  const loader = read("src/features/capability/capabilityMatchingPermission.ts");
  assert.match(loader, /^import "server-only";/);
});

// ---------------------------------------------------------------------------
// Matching-Adapter
// ---------------------------------------------------------------------------
function profile(userId: string, own: string[], seeking: string[]): FounderDiscoveryProfile {
  return {
    id: `fdp-${userId}`, userId, status: "active", displayName: userId, headline: "", bio: "", ownRoles: own, seekingRoles: seeking,
    ownRoleOther: null, seekingRoleOther: null, expertise: [], industries: [], locationRegion: "Berlin", remoteMode: "hybrid",
    availabilityHoursPerWeek: 20, availabilityFlexibility: null, availabilityCondition: null, recentStep: null,
    commitmentLevel: "part_time", ventureStage: "idea_validating", ventureGoal: "venture_scale", searchIntent: null,
    startHorizon: null, publishedAt: null, createdAt: "2026-10-01", updatedAt: "2026-10-01",
  } as FounderDiscoveryProfile;
}
const row = (area_id: string, application_level: number, ownership_wish: "own" | "grow_into" | "prefer_other") => ({
  area_id, application_level, ownership_wish,
});
const ctx = { familyOfArea: {}, idfCorpusVersion: "test", blocked: false, computedAt: null };

function pair(permissionB: ReturnType<typeof capabilityMatchingPermissionFromRow> | undefined, disclosureB: "private" | "areas_depth_on_contact", wish: "own" | "grow_into" = "own") {
  const a = findPersonFromDiscovery({
    profile: profile("a", ["sales"], ["tech"]), mustHaves: null, isFounder: true,
    capabilityRows: [row("b2b_sales", 2, "prefer_other")], capabilityDisclosure: "private",
    capabilityMatchingPermission: capabilityMatchingPermissionFromRow({ capability_matching_allowed: true }),
  });
  const b = findPersonFromDiscovery({
    profile: profile("b", ["tech"], ["sales"]), mustHaves: null, isFounder: true,
    capabilityRows: [row("b2b_sales", 5, wish)], capabilityDisclosure: disclosureB, hasContact: true,
    capabilityMatchingPermission: permissionB,
  });
  return matchFindPair(a, b, ctx);
}

test("Adapter: keine Freigabe / false -> Capability unavailable; true -> verwendet", () => {
  assert.equal(pair(undefined, "areas_depth_on_contact").relevance.components.aToB.capCover, null, "keine Freigabe");
  assert.equal(pair(CAPABILITY_MATCHING_DENIED, "areas_depth_on_contact").relevance.components.aToB.capCover, null, "false");
  assert.equal(pair(capabilityMatchingPermissionFromRow({ capability_matching_allowed: true }), "private").relevance.components.aToB.capCover, 1, "true");
});

test("Sichtbarkeit steuert die Matching-Freigabe nicht - in keine Richtung", () => {
  // areas_depth_on_contact (sichtbar) ohne Freigabe: nicht verwendet
  assert.equal(pair(CAPABILITY_MATCHING_DENIED, "areas_depth_on_contact").relevance.components.aToB.capCover, null);
  // private (unsichtbar) mit Freigabe: verwendet
  assert.equal(pair(capabilityMatchingPermissionFromRow({ capability_matching_allowed: true }), "private").relevance.components.aToB.capCover, 1);
});

test("grow_into ist auch mit Freigabe keine Ownership", () => {
  assert.equal(pair(capabilityMatchingPermissionFromRow({ capability_matching_allowed: true }), "private", "grow_into").relevance.components.aToB.capCover, 0);
});

test("der Adapter nimmt keinen frei übergebenen Boolean mehr an", () => {
  const adapters = read("src/lib/matching/v01/adapters.ts");
  assert.doesNotMatch(adapters, /capabilityMatchingAllowed\?: boolean/);
  assert.match(adapters, /capabilityMatchingPermission\?: CapabilityMatchingPermission/);
  assert.match(adapters, /matchingAllowed: input\.capabilityMatchingPermission\?\.allowed === true/);
});

// ---------------------------------------------------------------------------
// Oberfläche: Copy, Zustände, eingebunden nur hinter dem FIND-v0.1-Flag (E3c)
// ---------------------------------------------------------------------------
test("Copy DE/EN wie vorgesehen", () => {
  const de = JSON.parse(read("messages/de/capability.json")).matchingPermission;
  const en = JSON.parse(read("messages/en/capability.json")).matchingPermission;
  assert.equal(de.title, "Fähigkeiten für Vorschläge verwenden");
  assert.equal(de.body, "Made2Found darf deine Angaben zu Fähigkeiten, Erfahrung und gewünschter Verantwortung nutzen, um relevantere Founder vorzuschlagen. Das ändert nicht, wer deine Fähigkeiten sehen kann.");
  assert.equal(de.revocable, "Du kannst diese Freigabe jederzeit wieder ausschalten.");
  assert.equal(de.emptyNotice, "Vorschläge nutzen bisher deine FIND-Angaben. Du kannst Fähigkeiten ergänzen – freiwillig.");
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  assert.match(en.body, /does not change who can see your capabilities/);
  for (const text of [...Object.values(de), ...Object.values(en)] as string[]) {
    assert.doesNotMatch(text, /%|Score|Passung|kompatib|compatib/i);
  }
});

test("Komponente: ohne Fähigkeiten Hinweis ohne Umschalter, mit Fähigkeiten Umschalter", () => {
  const ui = read("src/features/capability/CapabilityMatchingPermissionSection.tsx");
  const early = ui.slice(ui.indexOf("if (!hasCapabilities)"), ui.indexOf("const toggle"));
  assert.match(early, /t\("emptyNotice"\)/);
  assert.match(early, /href=\{editHref\}/);
  assert.doesNotMatch(early, /type="checkbox"/, "ohne Fähigkeiten kein Umschalter");
  const withCaps = ui.slice(ui.indexOf("const toggle"));
  assert.match(withCaps, /type="checkbox"/);
  assert.match(withCaps, /t\("body"\)/);
  assert.match(withCaps, /t\("revocable"\)/);
  assert.match(ui, /useState\(initialAllowed === true\)/, "Ausgangswert nur bei ausdrücklichem true an");
});

test("die Komponente steht nur im FIND-Profil und im Schritt Sichtbarkeit, jeweils hinter dem Flag", () => {
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (
        /\.(ts|tsx)$/.test(entry) &&
        !path.endsWith("CapabilityMatchingPermissionSection.tsx") &&
        !path.endsWith("capabilityMatchingPermissionActions.ts")
      ) {
        if (/CapabilityMatchingPermissionSection|setCapabilityMatchingPermissionAction/.test(read(path))) users.push(path);
      }
    }
  };
  walk("src");
  const findProfile = join("src", "app", "(product)", "discovery", "profile", "page.tsx");
  const editor = join("src", "app", "(product)", "profile", "page.tsx");
  assert.deepEqual(users.sort(), [findProfile, editor].sort());
  // Ohne Flag: keine Abfrage, kein Abschnitt.
  const find = read(findProfile);
  assert.match(find, /const matchingPermission = isFindV01RankingEnabled\(\)\s*\? await/);
  assert.match(find, /\{matchingPermission \? \(\s*<CapabilityMatchingPermissionSection/);
  const profile = read(editor);
  assert.match(profile, /step === "sichtbarkeit" && hasDiscovery && isFindV01RankingEnabled\(\)/);
  assert.match(profile, /\{step === "sichtbarkeit" && matchingAllowed !== null \? \(\s*<CapabilityMatchingPermissionSection/);
  // Ohne Fähigkeiten der Hinweis (Komponente), mit Fähigkeiten der Umschalter - aus echten Einträgen.
  assert.match(find, /hasCapabilities: entries\.length > 0, allowed: permission\.allowed/);
  assert.match(profile, /hasCapabilities=\{entries\.length > 0\}/);
  // Das Flag kommt aus dem Server-Modul, nie aus einer öffentlichen Variable.
  for (const source of [find, profile]) {
    assert.match(source, /from "@\/features\/discovery\/findV01RankingFlag"/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z_]*MATCHING/);
  }
});

// ---------------------------------------------------------------------------
// Rücksprung aus dem Capability-Editor
// ---------------------------------------------------------------------------
test("next: nur die erlaubten Rückwege", () => {
  assert.equal(parseIdentityReturnPath("/discovery/profile"), "/discovery/profile");
  assert.equal(parseIdentityReturnPath("/connect/profile"), "/connect/profile");
  assert.equal(parseIdentityReturnPath("https://evil.example/discovery/profile"), null);
  assert.equal(parseIdentityReturnPath("//evil.example"), null);
  assert.equal(parseIdentityReturnPath("/admin"), null);
});

test("next reist durch Bereiche, Verantwortung und Sichtbarkeit und führt zurück", () => {
  const page = read("src/app/(product)/profile/page.tsx");
  for (const action of ["saveCapabilityAreasAction", "saveCapabilityOwnershipAction", "saveCapabilityDisclosureAction"]) {
    const form = page.slice(page.indexOf(`<form action={${action}}`), page.indexOf(`<form action={${action}}`) + 400);
    assert.match(form, /returnPath \? <input type="hidden" name="next" value=\{returnPath\} \/> : null/, `${action}: next fehlt im Formular`);
  }
  assert.match(page, /href=\{returnPath \? `\/profile\?step=areas&next=\$\{encodeURIComponent\(returnPath\)\}` : "\/profile\?step=areas"\}/, "Zurück zu Bereichen behält next");

  const actions = read("src/features/capability/capabilityActions.ts");
  assert.equal((actions.match(/const returnPath = parseIdentityReturnPath\(formData\.get\("next"\)\);/g) ?? []).length, 3);
  assert.match(actions, /returnPath \? `next=\$\{encodeURIComponent\(returnPath\)\}` : null/, "Zwischenschritte behalten next");
  assert.match(actions, /back\("ownership", undefined, undefined, returnPath\);/, "Bereiche -> Verantwortung mit next");
  const ownership = actions.slice(actions.indexOf("export async function saveCapabilityOwnershipAction"), actions.indexOf("export async function deleteCapabilityEvidenceAction"));
  assert.match(ownership, /if \(returnPath\) redirect\(returnPath\);/, "Verantwortung führt zurück nach FIND");
  const disclosure = actions.slice(actions.indexOf("export async function saveCapabilityDisclosureAction"));
  assert.match(disclosure, /if \(returnPath\) redirect\(returnPath\);/, "Sichtbarkeit führt zurück nach FIND");
});

// ---------------------------------------------------------------------------
// FIND sortiert unverändert nach Veröffentlichung
// ---------------------------------------------------------------------------
test("die neuen Migrationen berühren die FIND-Suche nicht; sie sortiert weiter nach published_at", () => {
  const dir = "../supabase/migrations";
  const files = readdirSync(dir).sort();
  for (const file of ["20261128120000_capability_matching_permission.sql", "20261128130000_disclosed_capability_viewer_access.sql"]) {
    assert.doesNotMatch(read(join(dir, file)), /search_founder_discovery_profiles|order by profile\.published_at/);
  }
  const latest = files.filter((f) => /function public\.search_founder_discovery_profiles_v2/.test(read(join(dir, f)))).at(-1) as string;
  assert.match(read(join(dir, latest)), /order by profile\.published_at desc nulls last, profile\.id/);
});
