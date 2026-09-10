import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  IDENTITY_RETURN_PATHS,
  IDENTITY_THRESHOLDS,
  getIdentityGaps,
  isIdentityPublishReady,
  parseIdentityReturnPath,
} from "@/features/profile/identityReadiness";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const core = (over: Partial<{ display_name: string; headline: string; bio: string }> = {}) => ({
  display_name: "Maria",
  headline: "Baut CoFoundery",
  bio: "Ich arbeite an einer Plattform fuer Gruendungsteams.",
  ...over,
});

// ---------------------------------------------------------------------------
// Die Schwellen
// ---------------------------------------------------------------------------
test("the thresholds match what Connect actually enforces when publishing", () => {
  // Zwei Listen, die auseinanderlaufen koennen: Der Hinweis wuerde sonst
  // etwas anderes verlangen als die Pruefung, und das ist schlimmer als kein
  // Hinweis.
  const validation = source("src/features/connect/connectValidation.ts");
  const clause =
    validation.match(/display_name\.length >= (\d+) && p\.headline\.length >= (\d+) && p\.bio\.length >= (\d+)/) ??
    [];

  assert.equal(Number(clause[1]), IDENTITY_THRESHOLDS.displayName);
  assert.equal(Number(clause[2]), IDENTITY_THRESHOLDS.headline);
  assert.equal(Number(clause[3]), IDENTITY_THRESHOLDS.bio);
});

test("a complete core has no gaps", () => {
  assert.deepEqual(getIdentityGaps(core()), []);
  assert.equal(isIdentityPublishReady(core()), true);
});

test("each field short on its own is named on its own", () => {
  assert.deepEqual(getIdentityGaps(core({ display_name: "M" })), ["displayName"]);
  assert.deepEqual(getIdentityGaps(core({ headline: "hi" })), ["headline"]);
  assert.deepEqual(getIdentityGaps(core({ bio: "zu kurz" })), ["bio"]);
});

test("gaps come in form order so the list reads like the form", () => {
  assert.deepEqual(getIdentityGaps({ display_name: "", headline: "", bio: "" }), [
    "displayName",
    "headline",
    "bio",
  ]);
});

test("whitespace does not count as an entry", () => {
  // Sonst gilt ein Feld mit Leerzeichen als gefuellt und die
  // Veroeffentlichung scheitert trotzdem - genau der Fall, den der Hinweis
  // verhindern soll.
  assert.deepEqual(getIdentityGaps({ display_name: "   ", headline: "   ", bio: "   ".repeat(20) }), [
    "displayName",
    "headline",
    "bio",
  ]);
});

test("a missing core is all gaps, not a crash", () => {
  assert.deepEqual(getIdentityGaps(null), ["displayName", "headline", "bio"]);
});

// ---------------------------------------------------------------------------
// Der Rueckweg
// ---------------------------------------------------------------------------
test("only the two known return paths are accepted", () => {
  assert.equal(parseIdentityReturnPath("/connect/profile"), "/connect/profile");
  assert.equal(parseIdentityReturnPath("/discovery/profile"), "/discovery/profile");
  assert.deepEqual([...IDENTITY_RETURN_PATHS], ["/connect/profile", "/discovery/profile"]);
});

test("nothing else becomes a redirect", () => {
  // Ein Query-Parameter, der zu einem Redirect wird, ist eine offene
  // Weiterleitung, sobald er mehr zulaesst als noetig.
  for (const hostile of [
    "https://example.com",
    "//example.com",
    "/connect/profile/../../account",
    "/connect/profileX",
    "/dashboard",
    "javascript:alert(1)",
    "",
    null,
    undefined,
    42,
  ]) {
    assert.equal(parseIdentityReturnPath(hostile), null, `${String(hostile)} darf nicht durchkommen`);
  }
});

// ---------------------------------------------------------------------------
// Wo es sichtbar wird
// ---------------------------------------------------------------------------
test("the profile page names the gaps where the fields are edited", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  assert.match(page, /getIdentityGaps\(core\)/);
  assert.match(page, /identity\.gaps\.\$\{gap\}/);
  // Nur fuer Menschen, die ueberhaupt irgendwo veroeffentlichen.
  assert.match(page, /identityGaps\.length > 0 && \(isConnectMember \|\| hasDiscovery\)/);
});

test("saving from a context page offers the way back", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  const actions = source("src/features/profile/personCoreActions.ts");

  assert.match(page, /<input type="hidden" name="next" value=\{returnPath\} \/>/);
  assert.match(page, /identity\.backTo\./);
  // Der Rueckweg ueberlebt das Speichern, sonst ist er nach dem ersten
  // Speichern weg.
  assert.match(actions, /next=\$\{encodeURIComponent\(returnPath\)\}/);
  // Aber es wird nicht automatisch zurueckgesprungen - wer hier ist, hat
  // vielleicht noch mehr vor.
  assert.doesNotMatch(actions, /redirect\(returnPath\)/);
});

test("both context pages hand over the return path", () => {
  assert.match(
    source("src/app/(product)/connect/profile/page.tsx"),
    /href="\/profile\?next=\/connect\/profile"/
  );
  assert.match(
    source("src/app/(product)/discovery/profile/page.tsx"),
    /href="\/profile\?next=\/discovery\/profile"/
  );
});

// ---------------------------------------------------------------------------
// Connect: die benannte Absage
// ---------------------------------------------------------------------------
test("Connect says what is missing instead of just \"incomplete\"", () => {
  const actions = source("src/features/connect/connectActions.ts");
  assert.match(actions, /identityGaps\.length \? "identity_incomplete" : "roles_missing"/);

  for (const locale of ["de", "en"]) {
    const errors = readJson(`messages/${locale}/connect.json`).errors as Record<string, string>;
    assert.ok(errors.identity_incomplete, `${locale}: errors.identity_incomplete fehlt`);
    assert.ok(errors.roles_missing, `${locale}: errors.roles_missing fehlt`);
  }
  // Die alte Sammelmeldung sagte nicht, welche der beiden Seiten fehlt.
  const de = readJson("messages/de/connect.json").errors as Record<string, string>;
  assert.match(de.identity_incomplete, /Profil/);
});

test("the Connect profile page validates query keys before translating them", () => {
  const page = source("src/app/(product)/connect/profile/page.tsx");
  const de = readJson("messages/de/connect.json");
  const errors = de.errors as Record<string, string>;
  const successProfile = (de.success as Record<string, unknown>).profile as Record<string, string>;

  // Ohne Allowlist zeigt ein erfundenes ?error= den rohen Schluesselpfad.
  // next-intl wirft dabei nicht - es loggt und rendert den Pfad selbst.
  assert.match(page, /const ERROR_KEYS = \[/);
  assert.match(page, /ERROR_KEYS\.includes\(params\.error \?\? ""\)/);
  assert.match(page, /SAVED_KEYS\.includes\(params\.saved \?\? ""\)/);
  assert.doesNotMatch(page, /t\(`errors\.\$\{params\.error\}`\)/);

  // Und jeder erlaubte Schluessel muss auch Text haben.
  const declared = (page.match(/const ERROR_KEYS = \[([^\]]+)\]/)?.[1] ?? "")
    .split(",").map((v) => v.trim().replace(/"/g, "")).filter(Boolean);
  assert.ok(declared.length >= 5, `nur ${declared.length} Schluessel gelesen`);
  for (const key of declared) assert.ok(errors[key], `errors.${key} fehlt in der Copy`);

  const savedDeclared = (page.match(/const SAVED_KEYS = \[([^\]]+)\]/)?.[1] ?? "")
    .split(",").map((v) => v.trim().replace(/"/g, "")).filter(Boolean);
  for (const key of savedDeclared) assert.ok(successProfile[key], `success.profile.${key} fehlt`);
});

// ---------------------------------------------------------------------------
// Stiller Erfolg
// ---------------------------------------------------------------------------
test("saving reports failure when no row was written", () => {
  const actions = source("src/features/profile/personCoreActions.ts");
  // Ein update ohne passende Zeile ist fuer PostgREST kein Fehler. Ohne die
  // Zaehlung wuerde die Seite "Gespeichert" melden und nichts gespeichert
  // haben.
  assert.match(actions, /\{ count: "exact" \}/);
  assert.match(actions, /if \(!error && count === 0\)/);
});

// ---------------------------------------------------------------------------
// Erreichbarkeit
// ---------------------------------------------------------------------------
test("the profile is in the navigation bar, not only behind the avatar", () => {
  const shell = source("src/features/navigation/ProductShell.tsx");
  const navLinks = shell.match(/<Link href="\/profile" className=\{navLinkClassName/g) ?? [];
  assert.equal(navLinks.length, 1, "genau ein Eintrag in der Leiste");

  for (const locale of ["de", "en"]) {
    const navigation = readJson(`messages/${locale}/navigation.json`) as Record<string, string>;
    assert.ok(navigation.profile, `${locale}: navigation.profile fehlt`);
  }
});
