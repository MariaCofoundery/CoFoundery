import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const shell = readFileSync(
  join("src", "features", "navigation", "ProductShell.tsx"), "utf8");

/**
 * GEMELDET AM 30.09.2026: „Ich weiß nicht, wo ich bin.“
 *
 * Geprüft wird nicht, wie die Zeile aussieht, sondern die zwei Eigenschaften,
 * an denen sie scheitern könnte.
 */

test("die Krumen kommen aus dem Navigationsbaum, nicht aus dem Pfad", () => {
  // Aus dem Pfad gebaut stuende dort „Teams › 3f2a-91c8-… › Setup“ - eine
  // Kennung, die niemandem etwas sagt. Aus dem Baum kommen nur Namen, die wir
  // selbst vergeben haben.
  const block = shell.slice(shell.indexOf("const breadcrumb"), shell.indexOf("const menuAttentionCount"));
  assert.match(block, /activeArea/);
  assert.match(block, /activeSubItem/);

  // Kein Zerlegen des Pfades - genau das wuerde Kennungen sichtbar machen.
  assert.ok(!/pathname\.split/.test(block), "die Zeile zerlegt den Pfad");
});

test("die Zeile erscheint nur, wenn sie etwas sagt (Phase 11.7B)", () => {
  // Ab 1280 Pixeln (vorher 1024) zeigen Pille und zweite Reihe schon Bereich und
  // Unterbereich - die Krume war dort die dritte Angabe desselben Ortes. Auf
  // dem Telefon traegt der Menueknopf den Bereich; die Krume bleibt fuer Seiten
  // UNTERHALB eines Unterbereichs, nie auf Teamseiten mit eigenem Rueckweg.
  const zeile = shell.slice(
    shell.indexOf('aria-label={t("breadcrumbLabel")}'),
    shell.indexOf("{children}", shell.indexOf('aria-label={t("breadcrumbLabel")}')),
  );
  assert.ok(zeile.length > 0, "die Zeile fehlt");
  const klassen = [...zeile.matchAll(/className="([^"]*)"/g)].map((treffer) => treffer[1]).join(" ");
  assert.match(klassen, /\bxl:hidden\b/, "am Rechner wiederholt die Zeile Pille und zweite Reihe");
  const regel = shell.slice(shell.indexOf("const breadcrumbAddsOrientation"), shell.indexOf("const breadcrumb ="));
  assert.match(regel, /pathname !== activeSubItem\?\.href/);
  assert.match(regel, /!pathname\.startsWith\("\/teams\/"\)/);
  // Die Ortsangabe auf dem Telefon: der Bereich auf dem Menueknopf.
  assert.match(shell, /activeArea\?\.label \?\? t\("menuOpen"\)/);
});

test("„hier“ steht nur da, wo man wirklich ist", () => {
  // Ein Link auf die Seite, auf der man steht, sieht aus wie ein Weg und ist
  // keiner - aber umgekehrt genauso: Auf /connect/listings/abc stand im
  // ersten Anlauf „Connect“ als aktuelle Seite, und der Weg nach /connect war
  // weg. Verglichen wird deshalb die Adresse und nicht die Position.
  const zeile = shell.slice(
    shell.indexOf('aria-label={t("breadcrumbLabel")}'),
    shell.indexOf("{children}", shell.indexOf('aria-label={t("breadcrumbLabel")}')),
  );
  assert.match(zeile, /krume\.href === pathname/);
  assert.match(zeile, /aria-current="page"/);
  assert.ok(
    !/index === breadcrumb\.length - 1/.test(zeile),
    "die Zeile entscheidet nach Position statt nach Adresse",
  );
});
