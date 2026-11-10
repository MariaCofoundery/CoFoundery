import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALL_DOOR_TYPES, DOOR_GROUPS, DOOR_SECTORS, MAX_DOORS, groupOfType, isDoorType, parseDoorFilters, typesForFilter } from "@/features/connect/doors/doorCatalog";

const read = (path: string) => readFileSync(path, "utf8");

test("Katalog: 12 Gruppen, 33 Startarten, jede Art genau einmal, Branche getrennt", () => {
  assert.equal(DOOR_GROUPS.length, 12);
  assert.equal(ALL_DOOR_TYPES.length, 33);
  assert.equal(new Set(ALL_DOOR_TYPES).size, 33);
  assert.equal(MAX_DOORS, 5);
  assert.ok(isDoorType("angel") && !isDoorType("health") && !isDoorType("other"));
  assert.equal(groupOfType("tax"), "legal");
  assert.ok(DOOR_SECTORS.includes("health"));
});

test("Texte: jede Gruppe, Art und Branche hat Namen in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const doors = JSON.parse(read(`messages/${locale}/connect.json`)).doors;
    for (const group of DOOR_GROUPS) assert.ok(doors.groups[group.key], `${locale} group ${group.key}`);
    for (const type of [...ALL_DOOR_TYPES, "other"]) assert.ok(doors.types[type], `${locale} type ${type}`);
    for (const sector of DOOR_SECTORS) assert.ok(doors.sectors[sector], `${locale} sector ${sector}`);
    for (const key of ["personal", "introduce", "via"]) assert.ok(doors.closeness[key].label, `${locale} closeness ${key}`);
  }
});

test("Suchfilter: Unsinn faellt weg, eine Gruppe meint alle ihre Arten, einzelne Arten gehen vor", () => {
  assert.equal(parseDoorFilters({}), null);
  assert.equal(parseDoorFilters({ tuer_gruppe: "gibtesnicht", tuer_art: "auch-nicht" }), null);
  const group = parseDoorFilters({ tuer_gruppe: "legal", tuer_branche: "health", tuer_region: " Leipzig " });
  assert.deepEqual(group && typesForFilter(group), ["lawyer", "tax", "privacy"]);
  assert.equal(group?.region, "Leipzig");
  const single = parseDoorFilters({ tuer_gruppe: "legal", tuer_art: ["angel", "angel", "nope"] });
  assert.deepEqual(single && typesForFilter(single), ["angel"]);
});

test("Seiten: Profil mit Tueren statt Freitext, Suche in Menschen, Vorstellung ueber die Kontaktanfrage mit vorbelegtem Text", () => {
  const profile = read("src/app/(product)/connect/profile/page.tsx");
  assert.match(profile, /<DoorsSection/);
  assert.doesNotMatch(profile, /name="network_reach"/);
  assert.match(read("src/app/(product)/connect/people/page.tsx"), /<DoorSearch/);
  const contact = read("src/app/(product)/connect/people/[userId]/contact/page.tsx");
  assert.match(contact, /defaultValue=\{prefill\}/);
  // Die Vorstellung ist die vorhandene Kontaktanfrage, kein eigenes System.
  assert.match(read("src/features/connect/connectActions.ts"), /request_network_person_contact/);
  const search = read("src/features/connect/doors/DoorSearch.tsx").replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(search, /score|ranking|percent|Sterne|passung/i);
  const sql = read("../supabase/migrations/20270417120000_connect_doors.sql");
  assert.match(sql, /connect_owner_visible\(d\.user_id\) and not public\.is_network_interaction_blocked/);
  assert.match(sql, /order by d\.updated_at desc/);
});

test("Schaltflaeche mit Serverfunktion trägt keinen eigenen name/value (React ueberschreibt ihn)", () => {
  for (const file of ["src/features/connect/doors/DoorsSection.tsx", "src/features/connect/doors/DoorSearch.tsx", "src/features/connect/doors/PersonDoors.tsx"]) {
    for (const line of read(file).split("\n")) if (/<button[^>]*formAction=\{/.test(line)) assert.doesNotMatch(line, /\bname="/, file);
  }
});

test("Vorstellungen (Stufe 2): Kontaktanfrage mit Seitentabelle, Limit zwei, Spaeter, Rueckfrage nach 14 Tagen, stilles Schliessen im Tageslauf", () => {
  const sql = read("../supabase/migrations/20270418120000_connect_introductions.sql");
  assert.match(sql, /request_network_person_contact\(v_door\.user_id, p_message\)/);
  assert.match(sql, /if v_count >= 2 then/);
  assert.match(sql, /interval '14 days'/);
  assert.match(sql, /grant execute on function public\.close_stale_introductions\(\) to service_role;/);
  assert.match(sql, /create policy network_introduction_outcomes_own_read[\s\S]*user_id = auth\.uid\(\)/);
  const actions = read("src/features/connect/connectActions.ts");
  assert.match(actions, /rpc\("request_network_introduction"/);
  assert.match(actions, /rpc\("snooze_network_introduction"/);
  assert.match(actions, /rpc\("answer_network_introduction_outcome"/);
  assert.match(read("src/app/api/cron/connect-suggestions/route.ts"), /closeStaleIntroductions\(\)/);
  const page = read("src/app/(product)/connect/contacts/page.tsx");
  assert.match(page, /<IntroductionActions/);
  assert.match(page, /<IntroductionOutcomeCard/);
  // Die Antwort auf "Hat es geklappt?" geht in keine Liste und keinen Wert.
  const bits = read("src/features/connect/introductions/IntroductionBits.tsx");
  assert.doesNotMatch(bits.replace(/\/\*\*[\s\S]*?\*\//g, ""), /score|ranking|percent/i);
  for (const locale of ["de", "en"]) {
    const m = JSON.parse(read(`messages/${locale}/connect.json`));
    for (const key of ["yes", "later", "no", "outcomeTitle", "outcomeNote"]) assert.ok(m.introductions[key], `${locale} ${key}`);
    assert.ok(m.errors.intro_limit && m.errors.intro_paused, locale);
  }
});

test("Hat es geklappt: erst 14 Tage nach der Annahme, nur einmal je Person", async () => {
  const { outcomeDue } = await import("@/features/connect/introductions/introductionsData");
  const base = { requestId: "r", role: "sender" as const, typeKey: "angel", otherLabel: null, sectorKey: null, region: null, snoozedAt: null, status: "accepted", createdAt: "2026-11-01T00:00:00Z", respondedAt: "2026-11-02T00:00:00Z", answered: false };
  const now = Date.parse("2026-11-20T00:00:00Z");
  assert.equal(outcomeDue(base, now), true);
  assert.equal(outcomeDue({ ...base, respondedAt: "2026-11-10T00:00:00Z" }, now), false);
  assert.equal(outcomeDue({ ...base, answered: true }, now), false);
  assert.equal(outcomeDue({ ...base, status: "pending", respondedAt: null }, now), false);
});
