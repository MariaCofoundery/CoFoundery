import assert from "node:assert/strict";
import test from "node:test";
import {
  alignRoomHref,
  alignRoomOfPath,
  initialOf,
  nextOwnPart,
  ownPartsDone,
  stateFromCount,
  stateFromWorkProfile,
  teamIdFromPath,
  teamMapTiles,
} from "@/features/align/alignModel";

const TEAM = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";

test("Der naechste eigene Teil ist der erste offene, in der Reihenfolge des Wegs", () => {
  assert.equal(nextOwnPart({ work: "done", can: "done", strengths: "open", direction: "done" }), "strengths");
  assert.equal(nextOwnPart({ work: "started", can: "open", strengths: "open", direction: "open" }), "work");
  assert.equal(nextOwnPart({ work: "done", can: "done", strengths: "done", direction: "done" }), null);
  assert.equal(ownPartsDone({ work: "done", can: "started", strengths: "open", direction: "done" }), 2);
});

test("Zustaende: Zahl und Arbeitsprofil", () => {
  assert.equal(stateFromCount(0), "open");
  assert.equal(stateFromCount(3), "done");
  assert.equal(stateFromWorkProfile("completed"), "done");
  assert.equal(stateFromWorkProfile("started"), "started");
  assert.equal(stateFromWorkProfile("legacy"), "open");
});

test("Reiter: jede Adresse gehoert genau einem Raum", () => {
  assert.equal(alignRoomOfPath("/align"), "overview");
  assert.equal(alignRoomOfPath("/me/profile"), "ich");
  assert.equal(alignRoomOfPath("/profile/strengths-interview"), "ich");
  assert.equal(alignRoomOfPath("/research/workstyle-pretest"), "ich");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}`), "wir");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/workstyle`), "wir");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/roles`), "wir");
  assert.equal(alignRoomOfPath("/connections"), "wir");
  assert.equal(alignRoomOfPath("/programm"), "wir");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/setup`), "vorhaben");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/setup/decision_rights`), "vorhaben");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/vorhaben-beta`), "vorhaben");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/finanzierung`), "vorhaben");
  assert.equal(alignRoomOfPath("/founder-alignment/vorhaben"), "vorhaben");
  assert.equal(alignRoomOfPath("/founder-alignment/profil"), "ich");
  assert.equal(alignRoomOfPath(`/teams/${TEAM}/gesamtbild`), "overview");
  assert.equal(alignRoomOfPath("/discovery"), null);
  assert.equal(alignRoomOfPath("/dashboard"), null);
});

test("Team-Id aus der gemerkten Adresse: nur eine echte Id", () => {
  assert.equal(teamIdFromPath(`/teams/${TEAM}/setup`), TEAM);
  assert.equal(teamIdFromPath(`/teams/${TEAM}`), TEAM);
  assert.equal(teamIdFromPath(`/teams/${TEAM}?x=1`), TEAM);
  assert.equal(teamIdFromPath("/teams/neu"), null);
  assert.equal(teamIdFromPath("/dashboard"), null);
  assert.equal(teamIdFromPath(null), null);
  assert.equal(teamIdFromPath("%E0%A4%A"), null);
});

test("Menueziele: ohne Team zur Teamliste, mit Team zur Teamseite und zum Setup", () => {
  assert.equal(alignRoomHref("ich", null), "/me/profile");
  assert.equal(alignRoomHref("wir", null), "/connections");
  assert.equal(alignRoomHref("vorhaben", null), "/connections");
  assert.equal(alignRoomHref("wir", TEAM), `/teams/${TEAM}`);
  assert.equal(alignRoomHref("vorhaben", TEAM), `/teams/${TEAM}/setup`);
});

test("Teamkarte: nur Besetztes und Freies; Ungesprochenes erscheint nicht als Luecke", () => {
  const tiles = teamMapTiles([
    { familyId: "product_value", state: "covered", claimants: ["u1"] },
    { familyId: "technology_delivery", state: "contested", claimants: ["u1", "u2"] },
    { familyId: "finance_funding", state: "gap", claimants: [] },
    { familyId: "legal_governance", state: "open", claimants: [] },
    { familyId: "customer_market", state: "unspoken", claimants: [] },
  ]);
  assert.deepEqual(
    tiles.map((tile) => `${tile.kind}:${tile.familyId}`),
    ["held:product_value", "held:technology_delivery", "free:finance_funding", "free:legal_governance"],
  );
});

test("Initiale", () => {
  assert.equal(initialOf("lena"), "L");
  assert.equal(initialOf("  "), "?");
  assert.equal(initialOf(null), "?");
});
