import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getTeamStrengthsOverview } from "@/features/teams/teamStrengthsData";

const source = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => source(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const client = (result: { data: unknown; error: unknown }) =>
  ({ rpc: async () => result }) as unknown as Parameters<typeof getTeamStrengthsOverview>[0];

test("kein Mitglied oder nicht lesbar: nichts ueber das Team", async () => {
  assert.equal(await getTeamStrengthsOverview(client({ data: null, error: null }), "t"), null);
  assert.equal(await getTeamStrengthsOverview(client({ data: null, error: { message: "x" } }), "t"), null);
});

test("die Antwort der Datenbank wird gelesen, nicht ergaenzt", async () => {
  const overview = await getTeamStrengthsOverview(
    client({
      error: null,
      data: {
        own_shared: true,
        people: [
          {
            person_id: "a",
            name: "Anna",
            is_viewer: true,
            strengths: [{ label: "Verbinden", statement: "Ich bringe Menschen an einen Tisch." }, { statement: "" }],
            direction: [{ facet: "meaningful_outcome", statement: "Es soll ankommen." }],
          },
        ],
      },
    }),
    "t"
  );
  assert.equal(overview?.ownShared, true);
  assert.equal(overview?.people.length, 1);
  assert.deepEqual(overview?.people[0].strengths, [{ label: "Verbinden", statement: "Ich bringe Menschen an einen Tisch." }]);
  assert.equal(overview?.people[0].direction[0].facet, "meaningful_outcome");
});

test("Freigabe nur ueber die RPC, ohne Zwischenfrage, ohne Zahl und ohne Wertung", () => {
  const action = code("src/features/teams/teamStrengthsActions.ts");
  assert.match(action, /rpc\("set_team_strengths_share"/);
  assert.doesNotMatch(action, /\.from\(/);
  const data = code("src/features/teams/teamStrengthsData.ts");
  assert.match(data, /rpc\("get_team_strengths_overview"/);
  assert.doesNotMatch(data, /\.from\(/);
  const view = code("src/features/teams/TeamStrengthsView.tsx");
  assert.match(view, /role="switch"/);
  assert.doesNotMatch(view, /<details/, "das Zuruecknehmen braucht keinen zweiten Schritt");
  assert.doesNotMatch(view, /%|percent|\bscore\b|\.length\s*\}\s*(von|of)/i);
  // Wer nicht geteilt hat, erscheint nicht - und es gibt keine Zaehlung der Fehlenden.
  assert.doesNotMatch(view, /missing|fehlen/i);
});

test("die Freigabe ist ein eigener Vertrag: eigene Tabelle, keine Aenderung an team_shares", () => {
  const sql = source("../supabase/migrations/20261227120000_team_strengths_direction_share.sql");
  assert.match(sql, /create table public\.team_profile_shares/);
  assert.doesNotMatch(sql, /alter table public\.team_shares|update public\.team_shares|insert into public\.team_shares/);
  assert.match(sql, /revoke all on public\.team_profile_shares from public, anon, authenticated/);
  assert.match(sql, /after delete on public\.founder_team_members/);
});

test("Texte gibt es auf Deutsch und Englisch, gleiche Schluessel", () => {
  const keys = (locale: string) => Object.keys(JSON.parse(source(`messages/${locale}/teams.json`)).strengthsShare).sort();
  assert.deepEqual(keys("de"), keys("en"));
  for (const locale of ["de", "en"]) {
    const teams = JSON.parse(source(`messages/${locale}/teams.json`));
    assert.ok(teams.teamNavigation.strengths);
  }
});
