import assert from "node:assert/strict";
import test from "node:test";

import { filterCurrentConfirmations } from "@/features/teams/founderSetupConfirmations";

// 21.10.2026, Pruefung fuer drei und vier Gruendende: Eine Bestaetigung vor dem letzten Austritt zaehlt nicht.
const row = (user: string, at: string) => ({ revision_id: "r1", user_id: user, confirmed_at: at });

test("wer nie ausgetreten ist, behaelt seine Bestaetigung", () => {
  const rows = [row("a", "2026-10-01T10:00:00Z"), row("b", "2026-10-02T10:00:00Z")];
  assert.deepEqual(filterCurrentConfirmations(rows, new Map()), rows);
});

test("eine Bestaetigung vor dem Austritt gilt nicht, eine danach schon", () => {
  const exits = new Map([["c", "2026-10-10T00:00:00Z"]]);
  const before = row("c", "2026-10-05T10:00:00Z");
  const after = row("c", "2026-10-12T10:00:00Z");
  assert.deepEqual(filterCurrentConfirmations([before], exits), []);
  assert.deepEqual(filterCurrentConfirmations([after], exits), [after]);
});

test("der Austritt einer Person aendert nichts an den Bestaetigungen der anderen (vier Founder)", () => {
  const exits = new Map([["d", "2026-10-10T00:00:00Z"]]);
  const rows = ["a", "b", "c", "d"].map((user) => row(user, "2026-10-05T10:00:00Z"));
  assert.deepEqual(filterCurrentConfirmations(rows, exits).map((r) => r.user_id), ["a", "b", "c"]);
});
