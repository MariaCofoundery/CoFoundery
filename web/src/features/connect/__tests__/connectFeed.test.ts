import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_FEED_KINDS,
  parseFeedKinds,
  parseFeedWork,
  pickFeedPage,
  sortFeed,
  topValues,
  workToRemoteModes,
} from "@/features/connect/connectFeedModel";

const source = (path: string) => readFileSync(path, "utf8");

test("ohne Angabe gelten Gesuche, Angebote und Probleme - Menschen und Unternehmen haben eigene Reiter", () => {
  assert.deepEqual(parseFeedKinds(undefined), [...DEFAULT_FEED_KINDS]);
  assert.deepEqual(parseFeedKinds(""), [...DEFAULT_FEED_KINDS]);
  assert.deepEqual(parseFeedKinds("quatsch"), [...DEFAULT_FEED_KINDS]);
});

test("Arten kommen als Liste oder kommagetrennt an und behalten eine feste Reihenfolge", () => {
  assert.deepEqual(parseFeedKinds(["venture", "person"]), ["person", "venture"]);
  assert.deepEqual(parseFeedKinds("venture,person,person"), ["person", "venture"]);
});

test("Arbeitsort: eine Wahl schraenkt ein und schliesst hybrid ein, beide oder keine nicht", () => {
  assert.deepEqual(parseFeedWork("remote,onsite"), ["remote", "onsite"]);
  assert.deepEqual(workToRemoteModes(["remote"]), ["remote", "hybrid", "flexible"]);
  assert.deepEqual(workToRemoteModes(["onsite"]), ["onsite", "hybrid", "flexible"]);
  assert.equal(workToRemoteModes(["remote", "onsite"]), null);
  assert.equal(workToRemoteModes([]), null);
});

test("die Liste ist nach Aktualitaet sortiert, nie nach etwas anderem", () => {
  const sorted = sortFeed([
    { key: "a", at: "2026-10-01" }, { key: "c", at: "2026-10-03" }, { key: "b", at: "2026-10-02" },
  ]);
  assert.deepEqual(sorted.map((entry) => entry.key), ["c", "b", "a"]);
});

test("eine Seite nimmt aus der Vereinigung, zeigt ob es weitergeht und doppelt nichts", () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({ key: `k${index}`, at: `2026-10-0${index + 1}` }));
  const first = pickFeedPage([...rows, rows[0]], 1, 3);
  assert.deepEqual(first.entries.map((entry) => entry.key), ["k6", "k5", "k4"]);
  assert.equal(first.hasMore, true);
  const last = pickFeedPage(rows, 3, 3);
  assert.deepEqual(last.entries.map((entry) => entry.key), ["k0"]);
  assert.equal(last.hasMore, false);
});

test("Themen und Orte: die haeufigsten zuerst, leer und doppelt fallen weg", () => {
  assert.deepEqual(topValues([["Pflege", "Recht"], ["Pflege", " "], null, ["Recht", "Pflege"], ["Alt"]], 2), ["Pflege", "Recht"]);
});

test("die Quellen bleiben die Abfragen mit der Sichtbarkeitspruefung, die Liste baut nichts nach", () => {
  const data = source("src/features/connect/connectFeedData.ts");
  for (const fn of ["getActiveConnectListings", "getActiveConnectProblems", "getConnectPeople", "getActiveConnectVentures"]) {
    assert.match(data, new RegExp(`${fn}\\(`), `${fn} fehlt`);
  }
  assert.doesNotMatch(data, /\.from\("network_(listings|problems|ventures|profiles)"\)/, "die Liste liest an der Sichtbarkeit vorbei");
  // Keine Rangliste: nirgends eine Sortierung nach Zuspruch oder Passung.
  assert.doesNotMatch(source("src/features/connect/connectFeedModel.ts"), /score|popular|rank|match/i);
});

test("die Zeile zeigt kein Passungs- oder Beliebtheitswort", () => {
  const row = source("src/features/connect/ConnectFeedRow.tsx");
  assert.doesNotMatch(row, /score|popularity|best match|kompatib/i);
});
