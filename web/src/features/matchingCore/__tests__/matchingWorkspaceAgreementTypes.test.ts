import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS,
  canCreateMatchingWorkspaceAgreement,
  createInitialMatchingWorkspaceAgreementSections,
  isMatchingWorkspaceAgreementStatus,
  isMatchingWorkspaceAgreementSectionKey,
  mergeMatchingWorkspaceAgreementSection,
  normalizeMatchingWorkspaceAgreementSections,
  normalizeMatchingWorkspaceAgreementSectionInput,
} from "@/features/matchingCore/matchingWorkspaceAgreementTypes";

test("accepts only draft matching workspace agreement status for V1", () => {
  assert.equal(isMatchingWorkspaceAgreementStatus("draft"), true);
  assert.equal(isMatchingWorkspaceAgreementStatus("in_review"), false);
  assert.equal(isMatchingWorkspaceAgreementStatus("agreed"), false);
});

test("creates initial agreement sections for every V1 section key", () => {
  const sections = createInitialMatchingWorkspaceAgreementSections();

  assert.deepEqual(Object.keys(sections), [...MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS]);
  for (const key of MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS) {
    assert.deepEqual(sections[key], {
      notes: "",
      agreement: "",
      updatedAt: null,
    });
  }
});

test("accepts only known agreement section keys", () => {
  assert.equal(isMatchingWorkspaceAgreementSectionKey("roles"), true);
  assert.equal(isMatchingWorkspaceAgreementSectionKey("next_90_days"), true);
  assert.equal(isMatchingWorkspaceAgreementSectionKey("unknown"), false);
});

test("normalizes incomplete agreement sections without dropping V1 keys", () => {
  const sections = normalizeMatchingWorkspaceAgreementSections({
    roles: {
      notes: "Rollennotiz",
      agreement: "Rollenregel",
      updatedAt: "2026-07-06T10:00:00.000Z",
    },
    unknown: {
      notes: "ignore me",
    },
  });

  assert.equal(sections.roles.notes, "Rollennotiz");
  assert.equal(sections.roles.agreement, "Rollenregel");
  assert.equal(sections.roles.updatedAt, "2026-07-06T10:00:00.000Z");
  assert.equal(sections.commitment.notes, "");
  assert.equal(sections.next_90_days.agreement, "");
  assert.equal(Object.keys(sections).includes("unknown"), false);
});

test("normalizes section input while allowing empty contents", () => {
  assert.deepEqual(
    normalizeMatchingWorkspaceAgreementSectionInput({
      notes: "",
      agreement: "",
    }),
    {
      notes: "",
      agreement: "",
    }
  );
});

test("limits large section inputs before persistence", () => {
  const longText = "x".repeat(5000);
  const normalized = normalizeMatchingWorkspaceAgreementSectionInput({
    notes: longText,
    agreement: longText,
  });

  assert.equal(normalized.notes.length, 4000);
  assert.equal(normalized.agreement.length, 4000);
});

test("merges only the selected agreement section", () => {
  const sections = createInitialMatchingWorkspaceAgreementSections();
  const merged = mergeMatchingWorkspaceAgreementSection({
    sections,
    sectionKey: "roles",
    notes: "Rollennotiz",
    agreement: "Rollenregel",
    updatedAt: "2026-07-10T10:00:00.000Z",
  });

  assert.equal(merged.roles.notes, "Rollennotiz");
  assert.equal(merged.roles.agreement, "Rollenregel");
  assert.equal(merged.roles.updatedAt, "2026-07-10T10:00:00.000Z");
  assert.equal(merged.commitment.notes, "");
  assert.equal(merged.commitment.agreement, "");
  assert.equal(merged.commitment.updatedAt, null);
});

test("allows agreement creation only for prepared participant workspaces", () => {
  assert.equal(
    canCreateMatchingWorkspaceAgreement({
      workspaceStatus: "prepared",
      currentUserIsParticipant: true,
    }),
    true
  );
  assert.equal(
    canCreateMatchingWorkspaceAgreement({
      workspaceStatus: "prepared",
      currentUserIsParticipant: false,
    }),
    false
  );
  assert.equal(
    canCreateMatchingWorkspaceAgreement({
      workspaceStatus: "archived",
      currentUserIsParticipant: true,
    }),
    false
  );
});

test("treats an existing agreement as idempotently available", () => {
  assert.equal(
    canCreateMatchingWorkspaceAgreement({
      workspaceStatus: "prepared",
      currentUserIsParticipant: true,
      existingAgreementId: "agreement-1",
    }),
    true
  );
});
