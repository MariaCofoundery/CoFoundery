import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isLocalSupabaseUrl } from "@/features/auth/devLogin";

// ---------------------------------------------------------------------------
// Die Entwicklungs-Anmeldung
// ---------------------------------------------------------------------------
//
// GEWUENSCHT AM 25.09.2026: "Wo ich einfach immer nur so quasi so ein
// Testprofil haette, was nur lokal liegt, was niemals irgendwie auf Vercel
// gepusht wird."
//
// "Niemals auf Vercel" ist die ganze Zusage, und dieser Test ist die Stelle,
// an der sie gehalten wird. Alles andere hier ist Bequemlichkeit; das hier
// ist die Sicherheit.

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/dev-login/page.tsx";
const SEED = "scripts/dev-seed.ts";

test("lokal ist lokal - und sonst nichts", () => {
  for (const url of [
    "http://127.0.0.1:54321",
    "http://localhost:54321",
    "http://localhost:3000/",
    "https://127.0.0.1",
    "http://[::1]:54321",
  ]) {
    assert.equal(isLocalSupabaseUrl(url), true, url);
  }
});

test("was nur so aussieht wie localhost, kommt nicht durch", () => {
  // DER EIGENTLICHE PRUEFPUNKT. Eine Sperre mit `includes("localhost")` oder
  // einem Praefix-Vergleich haette hier ueberall "ja" gesagt - und damit
  // gegen eine fremde Datenbank angemeldet.
  for (const url of [
    "https://localhost.angreifer.example",
    "https://127.0.0.1.angreifer.example",
    "https://angreifer.example/?h=localhost",
    "https://angreifer.example#localhost",
    "https://xyzabcdef.supabase.co",
    "https://meinprojekt.supabase.co",
  ]) {
    assert.equal(isLocalSupabaseUrl(url), false, url);
  }
});

test("im Zweifel zu", () => {
  // Fehlende oder kaputte Angabe heisst nicht lokal. Eine Sperre, die bei
  // fehlender Angabe oeffnet, ist auf einem falsch eingerichteten Server
  // genau dann offen, wenn es darauf ankommt.
  for (const value of [null, undefined, "", "   ", "kein-url", "//localhost"]) {
    assert.equal(isLocalSupabaseUrl(value), false, String(value));
  }
});

test("die Seite prueft beides - und die Aktion noch einmal", () => {
  const page = codeOnly(PAGE);

  // Zwei verschiedene Fragen: `NODE_ENV` sagt, wofuer man den Lauf HAELT, die
  // Adresse sagt, wohin man sich wirklich anmeldet.
  assert.match(page, /process\.env\.NODE_ENV === "production"\) notFound\(\)/);
  assert.match(page, /isLocalSupabaseUrl\(process\.env\.NEXT_PUBLIC_SUPABASE_URL\)\) notFound\(\)/);

  // UND ZWAR ZWEIMAL: einmal beim Zeichnen, einmal in der Server Action. Eine
  // Server Action ist ein eigener Eintrittspunkt und wird auch ohne die Seite
  // aufgerufen - eine Pruefung nur im Rumpf der Seite schuetzt sie nicht.
  assert.equal([...page.matchAll(/NODE_ENV === "production"\) notFound\(\)/g)].length, 2);
  assert.equal([...page.matchAll(/isLocalSupabaseUrl\(/g)].length, 2);

  // NACHGESCHAERFT AM 26.09.2026: Hier stand `!page.includes("<input")`.
  // Seit die Seite zwei Rollen anbietet, traegt sie versteckte Felder - und
  // die sind keine freie Eingabe. Geprueft wird jetzt das Anliegen: kein
  // Feld, in das man eine Mailadresse tippen kann, und eine feste
  // Kontenliste. Ein Formular mit freier Mailadresse waere eine
  // Anmeldemaske ohne Ratenbegrenzung.
  assert.ok(!/type="(text|email|password)"/.test(page), "kein Feld fuer eine Mailadresse");
  assert.match(page, /const ACCOUNTS = \{/);
  // Und ein durchgereichter Parameter landet nicht ungeprueft in der Anmeldung.
  assert.match(page, /isAccountKey\(requested\)/);
});

test("das Testprofil-Skript kann die echte Datenbank nicht erreichen", () => {
  const seed = codeOnly(SEED);

  // Es schreibt mit dem Dienstschluessel und geht damit an der
  // Zeilensicherheit vorbei - es kann also alles. Deshalb haengt seine Sperre
  // an der Adresse und nicht an einer Absichtserklaerung.
  assert.match(seed, /isLocalSupabaseUrl\(url\)/);
  assert.match(seed, /SUPABASE_SERVICE_ROLE_KEY/);

  // Und es bricht ab, statt weiterzumachen.
  assert.match(seed, /throw new Error\(/);

  // Dieselbe Sperre wie die Seite, nicht eine zweite Fassung davon: Zwei
  // Fassungen derselben Regel laufen irgendwann auseinander.
  assert.ok(
    !seed.includes('new Set(["127.0.0.1"'),
    "keine eigene Hostliste im Skript"
  );
});

test("das Skript landet in keinem Bundle - die Seite schon, aber taub", () => {
  // GENAU GESAGT, weil der Unterschied zaehlt:
  //
  //   Das SKRIPT liegt unter `scripts/` und wird von keinem Bauteil
  //   importiert. Was Vercel baut, kennt diese Datei nicht.
  //
  //   Die SEITE wird mitgebaut - wie die vorhandenen Debug-Seiten unter
  //   `/debug/*` auch. Sie antwortet dort aber auf jede Anfrage mit 404, und
  //   zwar aus zwei unabhaengigen Gruenden (siehe Test oben). "Wird nicht
  //   ausgeliefert" waere gelogen; "kann dort nichts tun" ist wahr.
  const imports = [
    "src/app/dev-login/page.tsx",
    "src/features/auth/devLogin.ts",
  ].map(codeOnly);
  for (const file of imports) {
    assert.ok(!file.includes("scripts/dev-seed"), "kein Bauteil importiert das Skript");
  }

  // Und die Zugangsdaten stehen nirgends in einer Umgebungsvariablen, die
  // auf Vercel gesetzt werden koennte - sie stehen fest im Klartext und
  // gehoeren zu einem Konto, das es nur lokal gibt.
  assert.ok(!codeOnly(PAGE).includes("process.env.DEV_LOGIN"), "kein Schalter per Variable");
});

test("das Testprofil erfindet keine Fragen, es liest sie", () => {
  const seed = codeOnly(SEED);

  // ZWEI FEHLSCHLAEGE AM 26.09.2026 FUEHRTEN ZU DIESEM TEST.
  //
  // Erst brach der Lauf an `base_choice_value_not_found_for_question` ab:
  // Ein Ausloeser prueft, dass jede Antwort auf eine vorhandene Zeile in
  // `choices` zeigt. Dann zeigte sich der Grund - die Registratur kennt
  // Kennungen wie `q01_vision_l1`, diese Datenbank aber `D1_Q1`. Zwei
  // Kennungsschemata nebeneinander, und das Skript hatte das falsche.
  //
  // Ein Testprofil, das seine eigene Vorstellung vom Fragebogen mitbringt,
  // ist genau so lange richtig, bis sich eine der beiden Seiten aendert.
  assert.match(seed, /from\("questions"\)/);
  assert.match(seed, /from\("choices"\)/);

  // Keine eingebauten Fragen- oder Antwortkennungen.
  assert.ok(!/["']D\d+_Q\d+["']/.test(seed), "keine fest verdrahtete Fragenkennung");
  assert.ok(!seed.includes("q01_vision"), "keine Registratur-Kennung als Fragenkennung");

  // Und die Verwaltungs-API von GoTrue wird nicht angefasst: Sie lehnt die
  // HS256-Schluessel dieses Stacks ab (v2.187). Die normale Registrierung
  // reicht, weil lokal `enable_confirmations = false` gilt.
  assert.ok(!seed.includes("auth.admin"), "kein Verwaltungszugriff auf die Anmeldung");
  assert.match(seed, /auth\.signUp\(/);
});
