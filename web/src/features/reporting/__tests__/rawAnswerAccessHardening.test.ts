import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionsSource = readFileSync(
  new URL("../actions.ts", import.meta.url),
  "utf8"
);
const payloadSource = readFileSync(
  new URL("../founderAlignmentReportPayload.ts", import.meta.url),
  "utf8"
);
const migrationSource = readFileSync(
  new URL(
    "../../../../../supabase/migrations/20260830120000_harden_founder_alignment_raw_answer_access.sql",
    import.meta.url
  ),
  "utf8"
);
const workbookDataSource = readFileSync(
  new URL("../founderAlignmentWorkbookData.ts", import.meta.url),
  "utf8"
);

test("the additive migration removes the invitation-wide raw-answer policy", () => {
  assert.match(
    migrationSource,
    /drop policy if exists assessment_answers_select_invitation_members_submitted\s+on public\.assessment_answers/
  );
  assert.doesNotMatch(migrationSource, /create policy/);
  assert.doesNotMatch(migrationSource, /assessments_select_invitation_members_submitted/);
});

test("shared report creation fails closed without the trusted server client", () => {
  const start = actionsSource.indexOf(
    "export async function ensureReportRunForInvitation(invitationId: string)"
  );
  const end = actionsSource.indexOf(
    "export async function backfillReportRunsForAcceptedInvitations",
    start
  );
  const functionSource = actionsSource.slice(start, end);

  assert.match(functionSource, /if \(!privileged\) \{\s*return \{ ok: false, reason: "missing_service_role" \};\s*\}/);
  assert.doesNotMatch(functionSource, /privileged \?\? supabase/);
  assert.doesNotMatch(functionSource, /falling back to authenticated client/);
  assert.match(functionSource, /requesterUserId: user\.id/);
  assert.match(functionSource, /skipMembershipCheck: false/);
});

test("derived report payload is built from answers without serializing raw answer collections", () => {
  const payloadStart = payloadSource.indexOf("const payload: FounderAlignmentReportPayload = {");
  const payloadEnd = payloadSource.indexOf("return {", payloadStart);
  const serializedPayloadSource = payloadSource.slice(payloadStart, payloadEnd);

  assert.match(serializedPayloadSource, /report: finalReport/);
  assert.match(serializedPayloadSource, /founderReport/);
  assert.match(serializedPayloadSource, /founderScoring/);
  assert.doesNotMatch(serializedPayloadSource, /baseAnswers/);
  assert.doesNotMatch(serializedPayloadSource, /valuesAnswers/);
  assert.doesNotMatch(serializedPayloadSource, /choice_value/);
});

test("founder workbook fallback consumes the authorized derived projection", () => {
  assert.match(workbookDataSource, /getFounderMatchingLiveData\(normalizedInvitationId\)/);
  assert.match(workbookDataSource, /founderLiveData!\.founderScoring/);
  assert.doesNotMatch(workbookDataSource, /debugResult!\.scoring!/);
});
