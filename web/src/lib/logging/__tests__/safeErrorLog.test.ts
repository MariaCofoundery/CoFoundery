import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { safeErrorLog } from "@/lib/logging/safeErrorLog";

/**
 * Fehlerprotokolle ohne Personendaten (Privacy-Audit 14.10.2026).
 *
 * Simuliert werden die Fehler, die im Einladungsbereich wirklich auftreten
 * können - und jeder trägt eine E-Mail-Adresse im Text. Geprüft wird die
 * Zeile, die tatsächlich ins Protokoll geschrieben würde.
 */

const EMAIL = "eingeladene.person@example.com";

function captureConsoleError(run: () => void): string {
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    run();
  } finally {
    console.error = original;
  }
  return JSON.stringify(lines);
}

test("Postgres-Fehler mit Zeilenwerten: nur der Code landet im Protokoll", () => {
  const postgresError = {
    code: "23514",
    message: `new row for relation "advisor_team_invites" violates check constraint`,
    details: `Failing row contains (…, ${EMAIL}, …).`,
    hint: null,
  };
  const logged = captureConsoleError(() => console.error("Failed to create advisor team invite", { error: safeErrorLog(postgresError) }));
  assert.doesNotMatch(logged, /example\.com|Failing row/);
  assert.deepEqual(safeErrorLog(postgresError), { name: null, code: "23514", status: null });
});

test("Resend-Fehler mit Antworttext: nur Code und Status", () => {
  const sendError = `resend_request_failed:422:{"message":"Invalid \`to\` field: ${EMAIL}"}`;
  const logged = captureConsoleError(() =>
    console.error("createInvitation email send failed", { invitationId: "inv-1", error: safeErrorLog(sendError) }),
  );
  assert.doesNotMatch(logged, /example\.com|Invalid/);
  assert.deepEqual(safeErrorLog(sendError), { name: null, code: "resend_request_failed", status: 422 });
});

test("Ausnahme mit Meldungstext: nur der technische Name", () => {
  const thrown = new TypeError(`Cannot bind inputs for ${EMAIL}`);
  const logged = captureConsoleError(() => console.error("bootstrap failed", { error: safeErrorLog(thrown) }));
  assert.doesNotMatch(logged, /example\.com|Cannot bind/);
  assert.equal(safeErrorLog(thrown).name, "TypeError");
});

test("verdächtige Codes und unbekannte Werte werden nicht durchgereicht", () => {
  assert.equal(safeErrorLog({ code: EMAIL }).code, null, "ein „Code“ mit @ ist kein Code");
  assert.equal(safeErrorLog({ name: `Fehler für ${EMAIL}` }).name, null);
  assert.deepEqual(safeErrorLog(`${EMAIL} konnte nicht`), { name: null, code: "unparsed_error", status: null });
  assert.deepEqual(safeErrorLog(null), { name: null, code: null, status: null });
  assert.equal(safeErrorLog({ statusCode: 503 }).status, 503);
});

test("die Einladungs-Protokolle nutzen den Helfer und schreiben keine Adresse und keinen Meldungstext", () => {
  const files = [
    "src/app/(product)/dashboard/actions.ts",
    "src/features/dashboard/advisorTeamInviteActions.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const calls = [...source.matchAll(/console\.(error|warn|info|log)\(([\s\S]*?)\);/g)].map((m) => m[2]);
    assert.ok(calls.length > 0, `${file}: keine Protokollaufrufe gefunden`);
    for (const call of calls) {
      assert.doesNotMatch(call, /invitedEmail|inviteeEmail|founderAEmail|founderBEmail|Email\b/, `${file}: Adresse im Protokoll`);
      assert.doesNotMatch(call, /\.message\b|sendResult\.error\b(?!\))/, `${file}: Meldungstext im Protokoll`);
    }
  }
  const actions = readFileSync("src/app/(product)/dashboard/actions.ts", "utf8");
  assert.match(actions, /error: safeErrorLog\(sendResult\.error\)/);
  assert.match(actions, /error: safeErrorLog\(error\)/);
  const data = readFileSync("src/features/dashboard/advisorTeamInviteData.ts", "utf8");
  assert.doesNotMatch(data, /detail: extendedResult\.error\.message/);
});
