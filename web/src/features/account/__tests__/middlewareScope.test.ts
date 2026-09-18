import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const MIDDLEWARE = "src/middleware.ts";
const source = (file: string) => readFileSync(file, "utf8");

/** Die Routen, die Bilder ausliefern - erkennbar an ihrer Antwort. */
function findAssetRoutes(dir = "src/app/api", found: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findAssetRoutes(full, found);
    else if (entry.name === "route.ts") {
      const code = readFileSync(full, "utf8");
      // Eine Route, die einen Bildtyp setzt oder eine Datei durchreicht.
      if (/content-type["']?\s*[:,]\s*[^\n]*image\/|createSignedUrl|\.download\(/.test(code)) {
        found.push(`/${path.relative("src/app", path.dirname(full))}/`);
      }
    }
  }
  return found;
}

test("die Middleware laeuft nicht fuer Bildrouten", () => {
  // Jeder Treffer kostet einen Netzwerkgang zum Auth-Server. Eine Seite mit
  // zwanzig Profilbildern loeste damit zwanzig zusaetzliche Auth-Abfragen aus,
  // bevor ein einziges Bild ankam.
  const matcher = source(MIDDLEWARE);
  for (const route of findAssetRoutes()) {
    // Die dynamischen Segmente interessieren den Matcher nicht.
    const prefix = route.replace(/\[[^\]]+\]\//g, "").replace(/^\//, "");
    assert.ok(
      matcher.includes(prefix),
      `${route} laeuft noch durch die Middleware - das kostet je Bild eine Auth-Abfrage`
    );
  }
});

test("jede ausgenommene Bildroute prueft Anmeldung und Freigabe selbst", () => {
  // Der Grund, warum das Ausschliessen sicher ist - und die Bedingung dafuer,
  // dass es sicher BLEIBT.
  for (const route of findAssetRoutes()) {
    const file = path.join("src/app", route, "route.ts");
    const code = source(file);
    assert.match(code, /auth\.getUser\(\)/, `${route}: prueft keine Anmeldung`);
    assert.match(
      code,
      /rpc\("(can_read_member_photo|is_network_member|can_read_network_profile_photo)"/,
      `${route}: prueft keine Freigabe`
    );
  }
});

test("Seiten und Auth-Wege laufen weiter durch die Middleware", () => {
  const matcher = source(MIDDLEWARE);
  // Die Ausschlussliste steht im negativen Lookahead. Sie wird hier
  // ausgelesen und Stueck fuer Stueck geprueft - ein `includes` auf dem ganzen
  // Muster haette "/connect" in "api/connect/photos/" gefunden und waere
  // faelschlich rot geworden.
  const lookahead = /\(\?!([^)]+)\)/.exec(matcher)?.[1];
  assert.ok(lookahead, "die Ausschlussliste wurde nicht gefunden");
  const excluded = lookahead.split("|").map((entry) => entry.trim()).filter(Boolean);

  // Ein zu breiter Ausschluss waere schlimmer als der langsame Zustand: Ohne
  // Auffrischung liefe die Sitzung irgendwann ab.
  for (const mustPass of ["dashboard", "connect", "auth/callback", "welcome", "teams", "profile"]) {
    const covered = excluded.filter((entry) => mustPass.startsWith(entry.replace(/\/$/, "")));
    assert.deepEqual(covered, [], `${mustPass} ist aus der Middleware ausgenommen`);
  }
  assert.ok(excluded.includes("_next/static"));
});
