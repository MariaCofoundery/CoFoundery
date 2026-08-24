import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAdvisorConfirmedFounderSetup,
  buildFounderSetupAdvisorAccess,
} from "@/features/teams/founderSetupAdvisorAccessModel";

test("founder grant presentation distinguishes pending and active unanimous consent", () => {
  const access = buildFounderSetupAdvisorAccess([
    {
      source_relationship_advisor_id: "source-1",
      advisor_name: "  Dr. Lee  ",
      grant_id: "grant-1",
      grant_status: "pending",
      consented_founder_user_ids: ["founder-a", "founder-b", "founder-b"],
      access_active: false,
    },
    {
      source_relationship_advisor_id: "source-2",
      advisor_name: null,
      grant_id: "grant-2",
      grant_status: "active",
      consented_founder_user_ids: ["founder-a", "founder-b", "founder-c"],
      access_active: true,
    },
  ]);

  assert.deepEqual(access[0], {
    sourceRelationshipAdvisorId: "source-1",
    advisorName: "Dr. Lee",
    grantId: "grant-1",
    status: "pending",
    consentedFounderUserIds: ["founder-a", "founder-b"],
    accessActive: false,
  });
  assert.equal(access[1]?.consentedFounderUserIds.length, 3);
  assert.equal(access[1]?.accessActive, true);
});

test("advisor model contains confirmed-only fields and rejects unknown setup rows", () => {
  const items = buildAdvisorConfirmedFounderSetup([
    {
      item_key: "roles_responsibilities",
      resolution_status: "documented",
      note: "Confirmed usercontent",
      documentation_reference: "https://example.com/document",
      confirmed_at: "2026-08-24T12:00:00.000Z",
    },
    {
      item_key: "unknown_item",
      resolution_status: "clarified",
      note: "Must not render",
      documentation_reference: null,
      confirmed_at: "2026-08-24T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(items, [{
    itemKey: "roles_responsibilities",
    resolutionStatus: "documented",
    note: "Confirmed usercontent",
    documentationReference: "https://example.com/document",
    confirmedAt: "2026-08-24T12:00:00.000Z",
  }]);
  assert.equal("workingNote" in items[0]!, false);
  assert.equal("pendingRevision" in items[0]!, false);
  assert.equal("confirmations" in items[0]!, false);
});

test("Founder and Advisor UI wire only the dedicated access RPCs and expose no edit controls to advisors", () => {
  const data = readFileSync("src/features/teams/founderSetupAdvisorAccessData.ts", "utf8");
  const founderPanel = readFileSync("src/features/teams/FounderSetupAdvisorAccessPanel.tsx", "utf8");
  const advisorSection = readFileSync("src/features/teams/AdvisorFounderSetupSection.tsx", "utf8");
  const reportPage = readFileSync("src/app/(product)/advisor/report/page.tsx", "utf8");

  assert.match(data, /get_founder_team_advisor_setup_access/);
  assert.match(data, /get_advisor_confirmed_founder_setup/);
  assert.doesNotMatch(data, /createPrivilegedClient|service_role|working_note|pending_revision/);
  assert.match(founderPanel, /proposeFounderSetupAdvisorAccessAction/);
  assert.match(founderPanel, /confirmFounderSetupAdvisorAccessAction/);
  assert.match(founderPanel, /revokeFounderSetupAdvisorAccessAction/);
  assert.match(reportPage, /AdvisorFounderSetupSection/);
  assert.doesNotMatch(advisorSection, /<form|<button|textarea|workingNote|pendingRevision/);
});

test("Advisor Founder Setup consent and confirmed-only copy is parallel in DE and EN", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));
  assert.deepEqual(Object.keys(de.setup.advisorAccess), Object.keys(en.setup.advisorAccess));
  assert.deepEqual(Object.keys(de.setup.advisorView), Object.keys(en.setup.advisorView));
  assert.match(de.setup.advisorAccess.description, /gemeinsam bestätigten/);
  assert.match(en.setup.advisorAccess.description, /jointly confirmed/);
  assert.match(de.setup.advisorAccess.description, /Arbeitsnotizen.*privat/);
  assert.match(en.setup.advisorAccess.description, /Working notes.*private/);
});
