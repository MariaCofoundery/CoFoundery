import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectPeople, getConnectTabCounts } from "@/features/connect/connectPeopleData";
import type { ConnectProfile } from "@/features/connect/connectTypes";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PEOPLE_PAGE = "src/app/(product)/connect/people/page.tsx";
const LISTINGS_PAGE = "src/app/(product)/connect/page.tsx";
const PROBLEMS_PAGE = "src/app/(product)/connect/problems/page.tsx";
const TABS = "src/features/connect/ConnectTabs.tsx";

const ME = "11111111-1111-4111-8111-111111111111";

// ---------------------------------------------------------------------------
// Ein nachgebauter Client
// ---------------------------------------------------------------------------
/**
 * Warum nicht per Quelltext-Grep:
 *
 * Die Zusagen dieser Datei sind Verhalten, nicht Wortlaut - "man findet sich
 * nicht selbst", "ein Prozentzeichen ist Text, kein Platzhalter". Ein Grep auf
 * `.neq(` haette beim Umbau auf eine andere Schreibweise stillschweigend
 * weiter gegruent.
 *
 * Der Nachbau merkt sich die Abfragekette und gibt feste Zeilen zurueck. Was
 * die Datenbank filtert, wird an der Kette geprueft; was in JavaScript
 * gefiltert wird - die Textsuche - am Ergebnis.
 */
type Recorded = { table: string; filters: [string, string, unknown][]; order?: [string, unknown] };

function fakeClient(rows: Record<string, unknown[]>, counts: Record<string, number> = {}) {
  const recorded: Recorded[] = [];

  const from = (table: string) => {
    const state: Recorded = { table, filters: [] };
    recorded.push(state);

    const push = (op: string) => (column: string, value: unknown) => {
      state.filters.push([op, column, value]);
      return self;
    };

    const self = {
      select: () => self,
      eq: push("eq"),
      neq: push("neq"),
      gt: push("gt"),
      ilike: push("ilike"),
      contains: push("contains"),
      in: push("in"),
      order: (column: string, options: unknown) => {
        state.order = [column, options];
        return self;
      },
      limit: () => self,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: rows[table] ?? [],
          error: null,
          count: counts[table] ?? (rows[table] ?? []).length,
        }).then(resolve, reject),
    };
    return self;
  };

  return { client: { from } as unknown as SupabaseClient, recorded };
}

function profile(overrides: Partial<ConnectProfile> & { user_id: string }): ConnectProfile {
  return {
    display_name: "Jemand",
    headline: "Macht Dinge",
    bio: "Eine Beschreibung, die lang genug ist.",
    location_region: null,
    remote_mode: null,
    expertise: [],
    industries: [],
    network_roles: [],
    status: "active",
    photo_source: null,
    photo_avatar_id: null,
    photo_path: null,
    visibility: "members",
    public_slug: "jemand",
    network_reach: null,
    open_to_formats: [],
    contact_note: null,
    published_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  } as ConnectProfile;
}

const find = (recorded: Recorded[], table: string) => recorded.filter((entry) => entry.table === table);

// ---------------------------------------------------------------------------
// Wer auftaucht
// ---------------------------------------------------------------------------
test("man findet sich in der Personensuche nicht selbst", async () => {
  const { client, recorded } = fakeClient({ network_profiles: [] });
  await getConnectPeople(client, ME, {});

  const [query] = find(recorded, "network_profiles");
  assert.deepEqual(
    query.filters.find(([op, column]) => op === "neq" && column === "user_id"),
    ["neq", "user_id", ME],
    "das eigene Profil ist ausgeschlossen - sonst sucht man sich selbst"
  );
});

test("nur veroeffentlichte Profile, keine Entwuerfe", async () => {
  const { client, recorded } = fakeClient({ network_profiles: [] });
  await getConnectPeople(client, ME, {});

  const [query] = find(recorded, "network_profiles");
  assert.deepEqual(
    query.filters.find(([op, column]) => op === "eq" && column === "status"),
    ["eq", "status", "active"]
  );
});

// ---------------------------------------------------------------------------
// Keine Rangliste
// ---------------------------------------------------------------------------
test("sortiert wird nach Aktualitaet, nie nach Passung", async () => {
  const { client, recorded } = fakeClient({ network_profiles: [] });
  await getConnectPeople(client, ME, { q: "design" });

  const [query] = find(recorded, "network_profiles");
  assert.ok(query.order, "es wird ueberhaupt sortiert");
  assert.equal(query.order?.[0], "published_at");

  // Sobald Menschen nach Passung sortiert werden, ist es eine Rangliste -
  // dieselbe Linie wie am Problembrett.
  const code = source("src/features/connect/connectPeopleData.ts");
  assert.doesNotMatch(code, /\.sort\(/, "und in JavaScript wird nicht nachsortiert");
});

// ---------------------------------------------------------------------------
// Die Suche
// ---------------------------------------------------------------------------
test("der Suchbegriff findet Menschen ueber ihr Unternehmen", async () => {
  // Im Profil steht nichts von Bienen - nur im Unternehmen.
  const beekeeper = profile({ user_id: "aaaa", display_name: "Nina" });
  const other = profile({ user_id: "bbbb", display_name: "Tom" });

  const { client } = fakeClient({
    network_profiles: [beekeeper, other],
    network_ventures: [{ owner_user_id: "aaaa" }],
  });

  const result = await getConnectPeople(client, ME, { q: "Imkerei" });
  assert.deepEqual(
    result.map((person) => person.user_id),
    ["aaaa"],
    "wer eine Imkerei betreibt, ist ueber 'Imkerei' zu finden"
  );
});

test("der Suchbegriff greift auch auf Fachgebiete und den Ort", async () => {
  const rows = [
    profile({ user_id: "aaaa", expertise: ["Steuerrecht"] }),
    profile({ user_id: "bbbb", location_region: "Leipzig" }),
    profile({ user_id: "cccc" }),
  ];
  const { client } = fakeClient({ network_profiles: rows, network_ventures: [] });

  assert.deepEqual(
    (await getConnectPeople(client, ME, { q: "steuer" })).map((p) => p.user_id),
    ["aaaa"],
    "Gross- und Kleinschreibung darf nicht entscheiden"
  );
  const { client: second } = fakeClient({ network_profiles: rows, network_ventures: [] });
  assert.deepEqual(
    (await getConnectPeople(second, ME, { q: "Leipzig" })).map((p) => p.user_id),
    ["bbbb"]
  );
});

test("ein Prozentzeichen im Suchbegriff ist Text, kein Platzhalter", async () => {
  const { client, recorded } = fakeClient({ network_profiles: [], network_ventures: [] });
  await getConnectPeople(client, ME, { q: "100%", region: "50_%" });

  const ventureQuery = find(recorded, "network_ventures")[0];
  const [, , pattern] = ventureQuery.filters.find(([op]) => op === "ilike") ?? [];
  assert.equal(pattern, "%100\\%%", "sonst passt der Begriff auf alles");

  const profileQuery = find(recorded, "network_profiles")[0];
  const [, , regionPattern] = profileQuery.filters.find(([op]) => op === "ilike") ?? [];
  assert.equal(regionPattern, "%50\\_\\%%", "Unterstrich genauso - er stuende fuer ein Zeichen");
});

test("ohne Suchbegriff wird die Unternehmenstabelle nicht durchsucht", async () => {
  const { client, recorded } = fakeClient({ network_profiles: [profile({ user_id: "aaaa" })] });
  await getConnectPeople(client, ME, {});

  const ventureQueries = find(recorded, "network_ventures");
  // Eine Abfrage bleibt: die Zahl der Eintraege je Person fuer die Karte.
  assert.ok(
    ventureQueries.every((query) => !query.filters.some(([op]) => op === "ilike")),
    "keine Textsuche ohne Suchbegriff"
  );
});

// ---------------------------------------------------------------------------
// Die Zahlen an den Reitern
// ---------------------------------------------------------------------------
test("die Zahl am Personenreiter zaehlt die eigene Person nicht mit", async () => {
  const { client, recorded } = fakeClient({}, { network_profiles: 7, network_ventures: 4, network_listings: 3, network_problems: 2 });
  const counts = await getConnectTabCounts(client, ME);

  assert.deepEqual(counts, { people: 7, ventures: 4, listings: 3, problems: 2 });
  const [query] = find(recorded, "network_profiles");
  assert.ok(
    query.filters.some(([op, column, value]) => op === "neq" && column === "user_id" && value === ME),
    "sonst steht eine Person mehr am Reiter, als man finden kann"
  );
});

test("abgelaufene Anzeigen werden am Reiter nicht mitgezaehlt", async () => {
  const { client, recorded } = fakeClient({});
  await getConnectTabCounts(client, ME);

  const [listings] = find(recorded, "network_listings");
  assert.ok(
    listings.filters.some(([op, column]) => op === "gt" && column === "expires_at"),
    "eine Zahl, hinter der Abgelaufenes steckt, ist eine falsche Zahl"
  );
});

// ---------------------------------------------------------------------------
// Die Leiste
// ---------------------------------------------------------------------------
test("alle drei Connect-Seiten tragen dieselbe Leiste", () => {
  const expected: [string, string][] = [
    [PEOPLE_PAGE, "people"],
    [LISTINGS_PAGE, "listings"],
    [PROBLEMS_PAGE, "problems"],
  ];

  for (const [page, active] of expected) {
    const code = source(page);
    assert.match(code, /<ConnectTabs\s+active="([a-z]+)"/, `${page}: keine Leiste`);
    assert.match(
      code,
      new RegExp(`<ConnectTabs\\s+active="${active}"`),
      `${page}: die Leiste zeigt den falschen Reiter als aktiv`
    );
  }
});

test("die Leiste fuehrt zu allen drei Bereichen", () => {
  const code = source(TABS);
  for (const href of ["/connect/people", "/connect", "/connect/problems"]) {
    assert.ok(code.includes(`href: "${href}"`), `${href} fehlt in der Leiste`);
  }
  assert.match(code, /aria-current=\{isActive \? "page"/, "wo man ist, muss auch vorgelesen werden");
});

// ---------------------------------------------------------------------------
// Die Texte
// ---------------------------------------------------------------------------
test("die Texte der Personensuche stehen in beiden Sprachen", () => {
  const used = new Set(
    [...source(PEOPLE_PAGE).matchAll(/t\("people\.([a-zA-Z]+)"/g)].map((match) => match[1])
  );
  used.add("count");
  used.add("ventureCount");
  assert.ok(used.size > 10, "der Abgleich hat die Aufrufe nicht gefunden");

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const people = (messages.people ?? {}) as Record<string, unknown>;
    const tabs = (messages.tabs ?? {}) as Record<string, unknown>;

    for (const key of used) {
      assert.ok(people[key], `${locale}: people.${key} fehlt`);
    }
    for (const key of ["label", "people", "listings", "problems"]) {
      assert.ok(tabs[key], `${locale}: tabs.${key} fehlt`);
    }
  }
});
