import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("die Hülle wartet nicht nacheinander auf Admin-Abfragen", () => {
  // Beide Admin-Abfragen starten, BEVOR die übrigen laufen, und werden erst
  // danach abgewartet - sonst hängt jede Seite eines Admins an zwei
  // zusätzlichen Datenbankgängen.
  assert.doesNotMatch(layout, /await Promise\.resolve\(supabase\.rpc\("is_platform_admin"\)\)/);
  const started = layout.indexOf("const adminState");
  const rest = layout.indexOf("const [roleViews");
  const awaited = layout.indexOf("await adminState");
  assert.ok(started > 0 && started < rest && rest < awaited, "Admin-Abfragen müssen vor den übrigen starten und danach abgewartet werden");
});

test("Sprache, Cookie und Anmeldung laufen gleichzeitig", () => {
  assert.match(layout, /Promise\.all\(\[\s*getRequestLocale\(\),\s*cookies\(\),\s*getRequestUser\(\),?\s*\]\)/);
});
