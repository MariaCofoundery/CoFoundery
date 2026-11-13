import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { authRateLimit } from "@/features/auth/authRateLimit";

test("Sekunden-Sperre je Adresse und Stundenlimit des Projekts werden unterschieden", () => {
  assert.deepEqual(
    authRateLimit({ status: 429, code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 52 seconds." }),
    { kind: "cooldown", seconds: 52 },
  );
  assert.deepEqual(authRateLimit({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }), { kind: "hourly" });
  assert.deepEqual(authRateLimit({ message: "Email rate limit exceeded" }), { kind: "hourly" });
});

test("andere Fehler sind kein Limit", () => {
  assert.equal(authRateLimit(null), null);
  assert.equal(authRateLimit({ status: 400, message: "Signups not allowed for otp" }), null);
  assert.equal(authRateLimit({ status: 500, message: "boom" }), null);
});

test("beide Anmeldewege nutzen dieselbe Unterscheidung und versprechen keine Stunde", () => {
  for (const file of ["src/features/auth/MagicLinkForm.tsx", "src/app/(product)/start/page.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /authRateLimit\(/, file);
  }
  for (const locale of ["de", "en"]) {
    const auth = JSON.parse(readFileSync(`messages/${locale}/auth.json`, "utf8"));
    const texts = [auth.magicLinkForm.rateLimited, auth.magicLinkForm.rateLimitedCooldown, auth.start.status.rateLimited, auth.start.status.cooldown].join(" ");
    assert.doesNotMatch(texts, /Stunde\b|hour\b/i, locale);
    assert.match(auth.magicLinkForm.rateLimitedCooldown, /\{seconds\}/);
  }
});
