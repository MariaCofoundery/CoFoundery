import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(file, "utf8");

function walk(dir: string, filter: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "__tests__" ? [] : walk(full, filter);
    return filter(full) ? [full] : [];
  });
}

// ---------------------------------------------------------------------------
// Die Grenze
// ---------------------------------------------------------------------------
test("der Anmeldeweg fragt jedes Mal neu, nicht aus dem Zwischenspeicher", () => {
  /**
   * Der gefaehrlichste Fehler bei dieser Optimierung.
   *
   * Unter /auth wird zuerst geprueft, ob schon eine Sitzung besteht, dann eine
   * angelegt (verifyOtp / exchangeCodeForSession) und danach noch einmal
   * gelesen. Mit einem Zwischenspeicher kaeme beim zweiten Mal die Antwort von
   * vorher - die Person waere nach dem Anmelden nicht angemeldet, und zwar
   * ohne Fehlermeldung.
   */
  const authRoutes = walk("src/app/auth", (file) => file.endsWith(".ts") || file.endsWith(".tsx"));
  assert.ok(authRoutes.length >= 3, `zu wenige Auth-Wege gefunden (${authRoutes.length})`);

  for (const route of authRoutes) {
    assert.doesNotMatch(
      source(route),
      /getRequestUser/,
      `${route}: der Anmeldeweg darf die Antwort nicht zwischenspeichern`
    );
  }

  // Dieselbe Stelle in den Helfern, die der Anmeldeweg benutzt.
  for (const helper of [
    "src/features/auth/authRedirects.ts",
    "src/features/auth/postAuthRedirect.ts",
    "src/features/auth/connectSignup.ts",
  ]) {
    assert.doesNotMatch(source(helper), /getRequestUser/, `${helper}: siehe oben`);
  }
});

test("Aktionen, die an der Anmeldung drehen, fragen ebenfalls neu", () => {
  // Abmelden, Konto loeschen, Adresse wechseln - dort aendert sich der Zustand
  // innerhalb derselben Anfrage.
  for (const file of [
    "src/features/account/accountActions.ts",
    "src/features/account/actions.ts",
    "src/features/profile/actions.ts",
  ]) {
    assert.doesNotMatch(source(file), /getRequestUser/, `${file}: siehe oben`);
  }
});

test("die Middleware bleibt, wie sie ist", () => {
  // Sie laeuft in einem eigenen Zusammenhang und ist der Ort, an dem die
  // Sitzung aufgefrischt wird. Ein Zwischenspeicher haette dort nichts zu
  // suchen - und wuerde auch nichts sparen.
  assert.match(source("src/lib/supabase/middleware.ts"), /auth\.getUser\(\)/);
  assert.doesNotMatch(source("src/lib/supabase/middleware.ts"), /getRequestUser/);
});

// ---------------------------------------------------------------------------
// Die Wirkung
// ---------------------------------------------------------------------------
test("Seiten fragen ueber den gemeinsamen Weg", () => {
  // 19 Seiten machten zwei bis vier Auth-Abfragen je Aufbau, zusaetzlich zu
  // der in der Middleware. Das Dashboard vier.
  const pages = walk("src/app", (file) => file.endsWith("page.tsx")).filter(
    (file) => !file.startsWith("src/app/auth/")
  );
  const direct = pages.filter((page) => /auth\.getUser\(\)/.test(source(page)));
  assert.deepEqual(
    direct,
    [],
    "diese Seiten fragen den Auth-Server direkt und zahlen den Netzwerkgang doppelt"
  );

  const cached = pages.filter((page) => /getRequestUser\(\)/.test(source(page)));
  assert.ok(cached.length > 30, `zu wenige Seiten umgestellt (${cached.length})`);
});

test("der Zwischenspeicher gilt genau eine Anfrage lang", () => {
  const server = source("src/lib/supabase/server.ts");
  // React cache() und nicht unstable_cache: Der zweite haelt ueber Anfragen
  // hinweg und wuerde die Person der vorigen Anfrage zurueckgeben.
  assert.match(server, /import \{ cache \} from "react"/);
  assert.match(server, /export const getRequestUser = cache\(async \(\) => \{/);
  assert.doesNotMatch(server, /unstable_cache|revalidate/);

  // Dieselbe Rueckgabeform wie auth.getUser() - sonst haette an 50 Stellen
  // mehr als der Aufruf geaendert werden muessen.
  assert.match(server, /return await client\.auth\.getUser\(\);/);
});
