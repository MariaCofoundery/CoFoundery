import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resumablePath } from "@/features/navigation/lastPlace";

test("Letzter Ort: nur Produktbereiche, nie Anmeldung, Einladung, Druck oder fremde Adressen", () => {
  assert.equal(resumablePath("/advisor/organisation?org=abc&tab=tasks"), "/advisor/organisation?org=abc&tab=tasks");
  assert.equal(resumablePath(encodeURIComponent("/teams/123/setup")), "/teams/123/setup");
  assert.equal(resumablePath("/dashboard"), "/dashboard");
  for (const bad of ["/start", "/login", "/invite/advisor-org/x", "/api/cron/x", "//evil.example", "https://evil.example/advisor", "/advisor\\..\\x", "/teams/1/setup/document", "/advisor/organisation/foerderung/csv?org=1", "/dashboardx", "", undefined, "%E0%A4%A"]) {
    assert.equal(resumablePath(bad as string | undefined), null, String(bad));
  }
});

test("Letzter Ort: gemerkt nur in der installierten App, /start nutzt ihn nur ohne eigenes Ziel", () => {
  const remember = readFileSync("src/features/navigation/RememberLastPlace.tsx", "utf8");
  assert.match(remember, /\(display-mode: standalone\)/);
  assert.match(remember, /if \(!isStandalone\) return;/);
  assert.match(remember, /visibilitychange/);
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /<RememberLastPlace \/>/);
  const start = readFileSync("src/app/(product)/start/page.tsx", "utf8");
  assert.match(start, /const lastPlace = params\.next \? null : resumablePath\(\(await cookies\(\)\)\.get\(LAST_PLACE_COOKIE\)\?\.value\);/);
  assert.ok(start.indexOf("if (lastPlace) redirect(lastPlace);") < start.indexOf("resolvePostAuthRedirectPath(supabase, nextPath)"));
});
