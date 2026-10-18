import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const shell = readFileSync(
  join("src", "features", "navigation", "ProductShell.tsx"), "utf8");

test("die zweite Reihe unter Align liest sich als Weg", () => {
  // Erst das eigene Bild, dann der Test, dann die anderen, dann das
  // Nachlesen. Vorher stand "Verbindungen" vorn - man faengt aber bei sich
  // selbst an.
  const reihenfolge = [...shell.matchAll(/label: t\("(align[A-Za-z]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual(reihenfolge, [
    "alignOwnProfile",
    "alignNewVersion",
    "alignConnections",
    "alignLibrary",
  ]);
});

test("Verbindungen steht auch ohne Founder-Rolle da", () => {
  // Wer nur Advisor oder Connect ist, hat kein Gesamtbild und keinen Test -
  // aber Verbindungen. Stuende es im selben hasFounder-Block, waere die
  // zweite Reihe fuer diese Menschen leer.
  const zweiteReihe = shell.slice(
    shell.indexOf("DIE REIHENFOLGE IST EIN WEG"),
    shell.indexOf("const findItem"),
  );
  const verbindungen = zweiteReihe.indexOf('label: t("alignConnections")');
  const blockEnde = zweiteReihe.indexOf("...(hasFounder", verbindungen);

  assert.ok(verbindungen > 0, "Verbindungen fehlt");
  // Nach Verbindungen beginnt ein neuer hasFounder-Block - Verbindungen liegt
  // also ausserhalb des vorherigen.
  assert.ok(blockEnde > verbindungen, "Verbindungen haengt an der Founder-Rolle");
});

test("die neue Fassung bleibt im Menü aktiv, egal auf welcher ihrer Seiten man steht", () => {
  // Ein Reiter, der sich beim Anklicken aufloest, war hier schon einmal das
  // Problem.
  assert.match(shell, /href: "\/me\/profile\/workstyle"[\s\S]{0,420}startsWith\("\/research\/workstyle-pretest"\)/);
});

test("historical workbook is not labeled as the current workstyle", () => {
  // Nur der Workstyle-Eintrag selbst - seit Phase 1.1 steht danach im Profil
  // der Einstieg „So willst du gründen" (/founder-alignment/vorhaben).
  const start = shell.indexOf('href: "/me/profile/workstyle"');
  const item = shell.slice(start, shell.indexOf("href:", start + 10));
  assert.doesNotMatch(item,/founder-alignment/);
});

test("„So willst du gründen“ steht im Profil, nicht unter Teams & Verbindungen", () => {
  const profil = shell.slice(shell.indexOf('href: "/me/profile",'), shell.indexOf('href: "/connections"'));
  assert.match(profil, /href: "\/founder-alignment\/vorhaben",\s*label: t\("profileVenture"\)/);
  assert.match(shell, /currentPathname\.startsWith\("\/founder-alignment\/vorhaben"\);/);
  // Der Vergleich bleibt Teamkontext.
  assert.match(shell, /\(currentPathname\.startsWith\("\/founder-alignment"\) && !isProfileArea\(currentPathname\)\)/);
});
