import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * FIND: Founder-Rolle und Blockierung (Migration 20261130120000).
 * Das Datenbankverhalten prüft supabase/tests/find_access_integrity.sql; hier die
 * App-Lesewege und die Regeln der Migration (Quelltext - discoveryData & Co. sind im
 * Node-Testlauf nicht importierbar).
 */

const read = (path: string) => readFileSync(path, "utf8");
const MIGRATION = "../supabase/migrations/20261130120000_find_access_integrity.sql";
const sql = () => read(MIGRATION).replace(/--.*$/gm, "");

/** Lesen den Anzeigenamen der Gegenseite in bestehenden Beziehungen. */
const RELATIONSHIP_NAME_READERS = [
  "src/features/dashboard/founderDashboardConnectionData.ts",
  "src/features/dashboard/founderDashboardTaskData.ts",
  "src/features/capability/capabilityComparisonData.ts",
  "src/features/matchingCore/matchingCoreReportData.ts",
];

test("Select-Policy: fremdes FIND-Profil nur bei Founder-Rolle und ohne Blockierung - auch für direkte API-Reads", () => {
  const s = sql();
  const visible = s.slice(s.indexOf("create or replace function public.discovery_profile_visible_to_current_user"), s.indexOf("drop policy if exists founder_discovery_profiles_select_founders"));
  assert.match(visible, /public\.discovery_profile_owner_is_founder\(p_owner_user_id\)\s*and not public\.is_network_interaction_blocked\(p_owner_user_id, auth\.uid\(\)\)/);
  const policy = s.slice(s.indexOf("create policy founder_discovery_profiles_select_founders"), s.indexOf("create or replace function public.get_relationship_display_names"));
  assert.match(policy, /user_id = auth\.uid\(\)\s*or \(status = 'active' and public\.discovery_profile_visible_to_current_user\(user_id\)\)/);
});

test("Beziehungsansichten lesen den Namen nicht mehr aus founder_discovery_profiles", () => {
  for (const file of RELATIONSHIP_NAME_READERS) {
    const source = read(file);
    assert.doesNotMatch(source, /from\("founder_discovery_profiles"\)/, file);
    assert.match(source, /loadRelationshipDisplayNames\([^)]*\{ discoveryActiveOnly: true \}\)/, `${file}: bisherige Regel „nur bei aktivem FIND-Profil“ bleibt`);
  }
  const helper = read("src/features/discovery/relationshipDisplayNames.ts");
  assert.match(helper, /rpc\("get_relationship_display_names", \{ p_user_ids: ids \}\)/);
  assert.match(helper, /\.map\(\(row\) => \(\{ user_id: row\.user_id, display_name: row\.display_name \}\)\)/, "nur Name nach außen");
});

test("Intro-Liste und Verbindungen behalten den Namen, ohne zu verraten warum das Profil fehlt", () => {
  const intro = read("src/features/discovery/discoveryIntroData.ts");
  assert.equal((intro.match(/counterpartDisplayName: namesByUserId\.get\(/g) ?? []).length, 2, "erhaltene und gesendete Intros");
  assert.match(intro, /loadRelationshipDisplayNames\(client, userIds, \{ discoveryActiveOnly: false \}\)/);
  const page = read("src/app/(product)/discovery/intros/page.tsx");
  assert.match(page, /\{counterpartName \|\| t\("intros\.profileHiddenTitle"\)\}/);
  assert.equal((page.match(/counterpartName=\{request\.counterpartDisplayName\}/g) ?? []).length, 2);
  const model = read("src/features/connections/founderConnectionsModel.ts");
  assert.match(model, /counterpartName: request\.profile\?\.displayName \?\? request\.counterpartDisplayName \?\? null/);
  const de = JSON.parse(read("messages/de/discovery.json")).intros;
  const en = JSON.parse(read("messages/en/discovery.json")).intros;
  for (const text of [de.profileHiddenTitle, de.profileHiddenText, en.profileHiddenTitle, en.profileHiddenText]) {
    assert.doesNotMatch(text, /blockier|block/i, "kein Hinweis auf eine Blockierung");
  }
  for (const source of [intro, page, model]) assert.doesNotMatch(source, /blocked_by_current_user|hat dich blockiert|blocked you/i);
});

test("Team-Homebase: Namen weiter aus get_founder_team_member_presentations (profiles), FIND nur Rückfall", () => {
  const homebase = read("src/features/teams/founderTeamHomebaseData.ts");
  assert.match(homebase, /client\.rpc\("get_founder_team_member_presentations", \{ p_team_id: teamId \}\)/);
});

test("Namensfunktion: nur Name und Aktiv-Status, nur für bestehende Beziehungen", () => {
  const s = sql();
  const fn = s.slice(s.indexOf("create or replace function public.get_relationship_display_names"), s.indexOf("comment on function public.get_relationship_display_names"));
  assert.match(fn, /returns table \(user_id uuid, display_name text, discovery_active boolean\)/);
  for (const source of ["public.relationships", "public.founder_team_members", "public.discovery_intro_requests", "public.discovery_matching_starts", "public.matching_session_participants"]) {
    assert.ok(fn.includes(source), source);
  }
  assert.doesNotMatch(fn, /headline|bio|own_roles|expertise|location_region|must_haves|network_blocks|blocked/, "keine weiteren Daten, keine Blockierung");
  assert.match(s, /grant execute on function public\.get_relationship_display_names\(uuid\[\]\) to authenticated;/);
  assert.match(s, /revoke all on function public\.get_relationship_display_names\(uuid\[\]\) from public, anon;/);
});

test("Migration: nur das Entfernen von founder pausiert, nichts wird gelöscht oder reaktiviert", () => {
  const s = sql();
  assert.match(s, /after update of roles on public\.profiles/);
  assert.match(s, /'founder' = any\(coalesce\(old\.roles, '\{\}'::text\[\]\)\)\s*and not \('founder' = any\(coalesce\(new\.roles, '\{\}'::text\[\]\)\)\)/);
  assert.match(s, /set status = 'paused'\s*where user_id = new\.user_id\s*and status = 'active'/);
  assert.doesNotMatch(s, /set status = 'active'/, "keine automatische Reaktivierung");
  assert.doesNotMatch(s, /\bdelete from\b|\btruncate\b|\binsert into\b/i, "keine Löschung, keine neuen Daten");
  assert.doesNotMatch(s, /update public\.(founder_search_preferences|discovery_intro_requests|network_contact_requests|founder_team)/, "Kriterien, Intros, Kontakte, Teams unberührt");
  assert.match(s, /update public\.founder_discovery_profiles discovery\s*set status = 'paused'\s*where discovery\.status = 'active'\s*and not public\.discovery_profile_owner_is_founder\(discovery\.user_id\)/, "einmalige Bereinigung");
});

test("Suche: Founder-Rolle und Blockierung, sonst unverändert gegenüber search_by_frame", () => {
  const before = read("../supabase/migrations/20261091120000_search_by_frame.sql");
  const original = before.slice(before.indexOf("create function public.search_founder_discovery_profiles_v2("), before.indexOf("commit;"));
  const now = read(MIGRATION);
  const updated = now.slice(now.indexOf("create or replace function public.search_founder_discovery_profiles_v2("), now.lastIndexOf("commit;"));
  assert.match(updated, /and public\.discovery_profile_owner_is_founder\(profile\.user_id\)\s*(--[^\n]*\n\s*)?and not public\.is_network_interaction_blocked\(profile\.user_id, auth\.uid\(\)\)/);
  const strip = (x: string) =>
    x
      .replace("create or replace function", "create function")
      .replace(/      -- NEU \(20261130120000\)[^\n]*\n      and public\.discovery_profile_owner_is_founder\(profile\.user_id\)\n      -- \.\.\. und ohne Blockierung[^\n]*\n      and not public\.is_network_interaction_blocked\(profile\.user_id, auth\.uid\(\)\)\n/, "")
      .trim();
  assert.equal(strip(updated), strip(original));
});

test("Capability-Follow-up ist verbindlich festgehalten", () => {
  assert.match(read(MIGRATION), /OFFEN NACH MERGE DES MATCHING-BRANCHES \(verbindlich\): get_disclosed_capability/);
  assert.match(read("../supabase/tests/find_access_integrity.sql"), /TODO NACH MERGE DES MATCHING-BRANCHES \(verbindlich\):/);
});

test("keine Matching-Abhängigkeit", () => {
  for (const file of [MIGRATION, "src/features/discovery/relationshipDisplayNames.ts", "src/features/discovery/discoveryIntroData.ts", ...RELATIONSHIP_NAME_READERS]) {
    assert.doesNotMatch(read(file), /lib\/matching|capability_matching_allowed|MATCHING_FIND|matching-v0\.1/, file);
  }
});
