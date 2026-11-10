import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { VALUES_MAX, VALUES_MIN, VALUE_KEYS, conversationNames, groupByUser, normalizeValueName, sharedGroups, valueName, type TeamValueRow } from "@/features/values/valuesModel";

/**
 * Werte (20270413120000): drei bis fuenf, eigene Reihenfolge, eigene Worte, getrennte Freigaben, keine Punkte.
 * Die Regeln der Datenbank pinnt pgTAP (person_values.sql); hier Modell, Oberflaeche und Texte.
 */
const read = (path: string) => readFileSync(path, "utf8");
const sql = read("../supabase/migrations/20270413120000_person_values.sql");
const row = (userId: string, slot: number, key: TeamValueRow["key"], label: string | null = null): TeamValueRow => ({ userId, slot, key, label, meaning: null });

test("Katalog und Grenzen gleich in Datenbank und Oberflaeche", () => {
  assert.equal(VALUES_MIN, 3);
  assert.equal(VALUES_MAX, 5);
  const match = sql.match(/value_key in \(([^)]*)\)/);
  assert.ok(match);
  assert.deepEqual(match[1].split(",").map((part) => part.trim().replaceAll("'", "")).filter((key) => key !== "custom"), [...VALUE_KEYS]);
  assert.match(sql, /slot between 1 and 5/);
  for (const locale of ["de", "en"]) {
    const names = JSON.parse(read(`messages/${locale}/profile.json`)).values.names;
    for (const key of VALUE_KEYS) assert.ok(names[key], `${locale}: ${key}`);
  }
});

test("gemeinsam heisst: mindestens zwei Personen nennen denselben Begriff - auch als eigener Wert, ohne Gross-/Kleinschreibung und Akzente", () => {
  const catalog = (key: string) => ({ ehrlichkeit: "Ehrlichkeit", sinnhaftigkeit: "Sinnhaftigkeit" })[key] ?? key;
  const rows = [row("a", 1, "ehrlichkeit"), row("b", 3, "custom", " ehrlichkeit "), row("a", 2, "sinnhaftigkeit"), row("b", 1, "custom", "Freude"), row("a", 3, "custom", "FREUDE"), row("c", 1, "custom", "Einzig")];
  assert.deepEqual(sharedGroups(rows, catalog).map((group) => group.name), ["Ehrlichkeit", "Freude"]);
  assert.deepEqual(conversationNames(rows, catalog), { shared: ["Ehrlichkeit", "Freude"], single: ["Sinnhaftigkeit", "Einzig"] });
  assert.equal(normalizeValueName("  Verlässlichkeit "), normalizeValueName("verlaesslichkeit"));
  assert.equal(normalizeValueName("Qualité"), normalizeValueName("qualite"));
  assert.equal(valueName({ key: "custom", label: "Freude" }, () => "x"), "Freude");
  // Zweimal derselbe Begriff bei einer Person zaehlt nicht als gemeinsam.
  assert.deepEqual(sharedGroups([row("a", 1, "custom", "Mut"), row("a", 2, "custom", "mut")], catalog), []);
});

test("jede Person bleibt in ihrer eigenen Reihenfolge; Plaetze werden nirgends verglichen oder verrechnet", () => {
  const grouped = groupByUser([row("a", 2, "mut"), row("a", 1, "freiheit"), row("b", 1, "mut")]);
  assert.deepEqual(grouped.get("a")?.map((entry) => entry.key), ["freiheit", "mut"]);
  const view = read("src/app/(product)/teams/[teamId]/werte/page.tsx");
  assert.doesNotMatch(view, /sort\(|reduce\(|average|score|percent/i);
});

test("getrennte Freigaben: Standard niemand, je Team einzeln, Connect nur Begriffe; Advisoren und Organisationen nie", () => {
  assert.match(sql, /create policy person_values_own on public\.person_values for select to authenticated using \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /create trigger drop_value_shares_on_leave after delete on public\.founder_team_members/);
  assert.match(sql, /returns table \(slot smallint, value_key text, label text\)/);
  assert.doesNotMatch(sql, /advisor_org/);
  const actions = read("src/features/values/valuesActions.ts");
  assert.match(actions, /set_value_team_share/);
  assert.match(actions, /set_value_connect_show/);
});

test("Oberflaeche: sortieren per Maus und Tastatur, Verlinkung im Profil, im Team und in Connect", () => {
  const editor = read("src/features/values/ValuesEditor.tsx");
  assert.match(editor, /draggable/);
  assert.match(editor, /onDrop=/);
  assert.match(editor, /move\(index, index - 1\)/);
  assert.match(read("src/app/me/profile/page.tsx"), /href="\/me\/profile\/werte"/);
  assert.match(read("src/app/(product)/teams/[teamId]/page.tsx"), /\/werte`/);
  assert.match(read("src/app/(product)/connect/people/[userId]/page.tsx"), /getConnectValues\(client, userId\)/);
});

test("Texte in beiden Sprachen", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(JSON.parse(read("messages/de/profile.json")).values).sort(), keys(JSON.parse(read("messages/en/profile.json")).values).sort());
  assert.deepEqual(keys(JSON.parse(read("messages/de/teams.json")).values).sort(), keys(JSON.parse(read("messages/en/teams.json")).values).sort());
});
