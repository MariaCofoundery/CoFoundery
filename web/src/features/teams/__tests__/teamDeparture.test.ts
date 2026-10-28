import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isTeamDepartureChoice, TEAM_DEPARTURE_CHOICES } from "@/features/teams/teamDepartureData";

const source = (path: string) => readFileSync(path, "utf8");
const sql = source("../supabase/migrations/20270107120000_team_departures.sql")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*--.*$/gm, "");

test("Austritt: drei Wahlen, alles andere wird abgelehnt", () => {
  assert.deepEqual([...TEAM_DEPARTURE_CHOICES], ["continue", "dissolve", "later"]);
  assert.equal(isTeamDepartureChoice("dissolve"), true);
  assert.equal(isTeamDepartureChoice("delete"), false);
  assert.equal(isTeamDepartureChoice(undefined), false);
});

test("Austritt: die Datenbank entscheidet, nur einstimmig, und loescht nichts", () => {
  assert.match(sql, /v_continue = v_members/);
  assert.match(sql, /v_dissolve = v_members/);
  // Aufloesen archiviert (dieselbe Mechanik wie bei der letzten Person), es loescht kein Team und keine Inhalte.
  assert.match(sql, /set archived_at = coalesce\(archived_at, pg_catalog\.now\(\)\)/);
  const chooseFn = sql.slice(sql.indexOf("create function public.choose_team_departure"));
  assert.doesNotMatch(chooseFn, /\bdelete from\b/);
  // Der Eintrag traegt keinen Namen der gehenden Person.
  const table = sql.slice(sql.indexOf("create table public.team_departures ("), sql.indexOf("create table public.team_departure_choices"));
  assert.doesNotMatch(table, /name|user_id/i);
  assert.match(sql, /remaining > 0/);
});

test("Austritt: die Karte steht auf der Team-Uebersicht, die Aktion ruft nur die Datenbankfunktion", () => {
  const page = source("src/app/(product)/teams/[teamId]/page.tsx");
  assert.match(page, /<TeamDepartureCard/);
  assert.match(page, /getOpenTeamDepartures\(team\.id, supabase\)\.catch\(\(\) => \[\]\)/);
  const actions = source("src/features/teams/teamDepartureActions.ts");
  assert.match(actions, /rpc\("choose_team_departure"/);
  assert.doesNotMatch(actions, /\.from\("team_departures"\)|\.delete\(/);
  const card = source("src/features/teams/TeamDepartureCard.tsx");
  assert.match(card, /aria-pressed/);
  assert.doesNotMatch(card, /score|prozent|percent/i);
});
