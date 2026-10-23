import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parsePlacementTarget,
  placementEndFromDate,
  placementState,
} from "@/features/connect/highlightPlacementModel";

const ID = "a1b00000-0000-4000-8000-000000000100";

test("aus einem Link wird Sorte und Kennung - und sonst nichts", () => {
  assert.deepEqual(parsePlacementTarget(`https://made2found.de/connect/listings/${ID}`), { kind: "listing", id: ID });
  assert.deepEqual(parsePlacementTarget(`/connect/people/${ID.toUpperCase()}?x=1`), { kind: "person", id: ID });
  assert.deepEqual(parsePlacementTarget(`/connect/ventures/${ID}/`), { kind: "venture", id: ID });
  assert.deepEqual(parsePlacementTarget(`/connect/problems/${ID}#a`), { kind: "problem", id: ID });
  for (const bad of ["", "nonsense", `/connect/contacts/${ID}`, "/connect/listings/not-a-uuid", `/connect/listings/${ID}x`, 42, null]) {
    assert.equal(parsePlacementTarget(bad), null, String(bad));
  }
});

test("ein Platz endet am Schluss des gewaehlten Tages, und Vergangenes gilt nicht", () => {
  const now = new Date("2026-10-23T10:00:00Z");
  assert.equal(placementEndFromDate("2026-10-23", now)?.toISOString(), "2026-10-23T23:59:59.000Z");
  assert.equal(placementEndFromDate("2026-10-22", now), null);
  assert.equal(placementEndFromDate("23.10.2026", now), null);
  assert.equal(placementEndFromDate(undefined, now), null);
});

test("laeuft, geplant oder abgelaufen", () => {
  const now = new Date("2026-10-23T10:00:00Z");
  assert.equal(placementState({ starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z" }, now), "running");
  assert.equal(placementState({ starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }, now), "planned");
  assert.equal(placementState({ starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-10-01T00:00:00Z" }, now), "ended");
});

test("die Verwaltung ist nur fuer Plattform-Admins, und eine Anzeige laesst sich nicht unbeschriftet speichern", () => {
  const actions = readFileSync("src/features/connect/highlightPlacementActions.ts", "utf8");
  const page = readFileSync("src/app/(product)/admin/highlights/page.tsx", "utf8");
  assert.equal((actions.match(/await requirePlatformAdmin\(\)/g) ?? []).length, 2, "beide Aktionen pruefen den Admin");
  assert.match(page, /await requirePlatformAdmin\(\)/);
  // Der Begruendungssatz gehoert nur zur Empfehlung.
  assert.match(actions, /p_note: source === "editorial"/);
  // Die Kennzeichnung der Anzeige haengt nicht an einem Feld der Verwaltung.
  assert.doesNotMatch(page, /name="disclosure"/);
});
