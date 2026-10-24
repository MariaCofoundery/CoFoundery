import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildCronAlertPayload, cronAlertNeeded } from "@/features/privacy/cronAlert";

test("Alarm nur bei echtem Aufruf mit Fehlschlag", () => {
  assert.equal(cronAlertNeeded(500, { ok: false }), true);
  assert.equal(cronAlertNeeded(503, { ok: false, reason: "missing_service_role" }), true);
  // Von aussen ausloesbar: keine Mail.
  assert.equal(cronAlertNeeded(401, { ok: false, reason: "unauthorized" }), false);
  assert.equal(cronAlertNeeded(503, { ok: false, reason: "cron_secret_not_configured" }), false);
  assert.equal(cronAlertNeeded(200, { ok: true }), false);
});

test("Die Mail nennt Lauf, Status und Schritte, keine Zahlen und keine Fehlertexte", () => {
  const { subject, text } = buildCronAlertPayload("privacy-retention", 500, {
    ok: false,
    researchCleanup: "ok",
    eventCleanup: "failed",
    operationalCleanup: "ok",
    personalCleanup: "ok",
    counts: { research: { deletedResearchEvents: 41 } },
    message: "duplicate key value (user_id)=(abc)",
  });
  assert.match(subject, /privacy-retention/);
  assert.match(text, /eventCleanup: failed/);
  assert.doesNotMatch(text, /41|abc|duplicate/);
});

test("Beide Zeitplanrouten rufen den Alarm auf", () => {
  for (const file of ["privacy-retention", "connect-suggestions"]) {
    const src = readFileSync(`src/app/api/cron/${file}/route.ts`, "utf8");
    assert.match(src, /sendCronFailureAlert\("/);
  }
});
