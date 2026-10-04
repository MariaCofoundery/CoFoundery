import assert from "node:assert/strict";
import { test } from "node:test";
import * as nodeModule from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertLegacyAlignmentWritable } from "@/features/reporting/history/legacyWrites";

type Loaded = {format: string; source: string; shortCircuit?: boolean};
const registerHooks = (nodeModule as unknown as {registerHooks(hooks: {
  load(s: string, c: unknown, next: (s: string,c: unknown) => Loaded): Loaded;
}): {deregister(): void}}).registerHooks;
const hooks = registerHooks({load(s,c,next) {
  return s.endsWith("/HistoricalValue.tsx") ? {format:"module",shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(s),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText} : next(s,c);
}});
const { HistoricalValue } = await import("@/features/reporting/history/HistoricalValue");
hooks.deregister();
const source = (file: string) => readFileSync(`src/${file}`,"utf8");

test("historical renderer preserves all payload generations and escapes user content", () => {
  const payload = {steps:{decision_rules:{founderA:"reflection",agreement:"old draft",founderAApproved:true,advisorNotes:"advisor note",workspaceV2:{entries:[{text:"<script>alert(1)</script>"}],reactions:[{signal:"critical"}]},outputs:[{futureUnknownField:"still readable"}]}}};
  const before = JSON.stringify(payload);
  const html = renderToStaticMarkup(createElement(HistoricalValue,{value:payload}));
  for (const text of ["reflection","old draft","advisor note","critical","still readable","&lt;script&gt;"]) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/<script|<input|<textarea|<form|confirmed revision/i);
  assert.equal(JSON.stringify(payload),before);
});
test("historical reader has no scoring prerequisite or create-on-read", () => {
  const reader = source("features/reporting/history/HistoricalWorkbookPage.tsx");
  const participantReader = reader.slice(reader.indexOf("const [{ data: workbook"));
  assert.match(participantReader,/HistoricalValue value=\{workbook.payload\}/);
  assert.doesNotMatch(participantReader,/sanitize|scoring|\.insert\(|\.update\(|\.upsert\(|\.rpc\(/);
  assert.match(reader,/invitation.inviter_user_id, invitation.invitee_user_id/);
  const workspace = source("app/(product)/workspaces/[workspaceId]/page.tsx");
  assert.match(workspace,/getMatchingWorkspaceAgreementForWorkspace/);
  assert.doesNotMatch(workspace,/createOrGet|updateMatching|<form|<textarea/);
});
test("retired server write paths fail closed before touching data", () => {
  assert.throws(assertLegacyAlignmentWritable,/legacy_alignment_read_only/);
  for (const file of ["matchingCore/matchingWorkspaceData.ts","matchingCore/matchingWorkspaceAgreementData.ts","reporting/founderAlignmentWorkbookActions.ts","reporting/workbookDeepDiveHandoffActions.ts"]) {
    assert.match(source(`features/${file}`),/if \(LEGACY_ALIGNMENT_READ_ONLY\)/);
  }
});
test("current reports never require workbook creation or deep-dive chain", () => {
  for (const file of ["app/report/[sessionId]/page.tsx","app/(product)/matching/[matchingSessionId]/report/page.tsx"]) {
    const report = source(file);
    assert.doesNotMatch(report,/buildWorkbookIntroHref|startWorkspaceFromMatchingSessionAction|deepDiveStep=/);
    assert.match(report,/\/setup/);
  }
  const team = source("app/(product)/teams/[teamId]/page.tsx");
  assert.ok(team.indexOf('<details') < team.indexOf('t("agreements.title")'));
});
