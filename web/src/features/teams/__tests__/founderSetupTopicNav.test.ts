import assert from "node:assert/strict";
import test from "node:test";

import { FOUNDER_SETUP_CATALOG } from "@/features/teams/founderSetupCatalog";
import type { FounderSetupItem } from "@/features/teams/founderSetupModel";
import {
  buildFounderSetupRail,
  founderSetupRailState,
  founderSetupTopicPosition,
} from "@/features/teams/founderSetupTopicNav";

const item = (key: string, extra: Partial<FounderSetupItem> = {}) =>
  ({ key, category: "collaboration", legalNote: false, persisted: true, workStatus: "open", workingNote: "", stage: "open", outcome: null,
    displayStatus: "open", currentConfirmedRevision: null, pendingRevision: null, ...extra }) as unknown as FounderSetupItem;

const pending = (confirmedBy: string[]) => ({ id: "r", confirmations: confirmedBy.map((userId) => ({ userId })) }) as unknown as FounderSetupItem["pendingRevision"];

test("Themenleiste: 'wartet auf dich' nur, wenn die eigene Bestaetigung fehlt", () => {
  const waiting = item("time_commitment", { stage: "awaiting_confirmation", pendingRevision: pending(["ben"]) });
  assert.equal(founderSetupRailState(waiting, "nora"), "waiting_for_you");
  assert.equal(founderSetupRailState(waiting, "ben"), "awaiting_others");
  assert.equal(founderSetupRailState(item("equity", { stage: "discussing" }), "nora"), "discussing");
  assert.equal(founderSetupRailState(item("equity", { stage: "settled" }), "nora"), "settled");
});

test("Themenleiste: alle Themen genau einmal, in der Reihenfolge der Seite, ohne leere Phase", () => {
  const items = FOUNDER_SETUP_CATALOG.map((entry) => item(entry.key));
  const groups = buildFounderSetupRail(items, "nora");
  const keys = groups.flatMap((group) => group.entries.map((entry) => entry.key));
  assert.equal(keys.length, FOUNDER_SETUP_CATALOG.length);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(groups.every((group) => group.entries.length > 0));
});

test("Weiterblaettern: erstes Thema hat kein Zurueck, letztes kein Weiter", () => {
  const groups = buildFounderSetupRail(FOUNDER_SETUP_CATALOG.map((entry) => item(entry.key)), "nora");
  const keys = groups.flatMap((group) => group.entries.map((entry) => entry.key));
  const first = founderSetupTopicPosition(groups, keys[0]);
  const last = founderSetupTopicPosition(groups, keys[keys.length - 1]);
  assert.equal(first.previous, null);
  assert.equal(first.next, keys[1]);
  assert.equal(last.next, null);
  assert.equal(last.index, last.total);
});
