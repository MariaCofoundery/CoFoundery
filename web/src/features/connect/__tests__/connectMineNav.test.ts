import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const SHELL = "src/features/navigation/ProductShell.tsx";

/** Die Seiten, auf denen man sich in Connect umsieht. */
const BROWSE_PAGES = [
  "src/app/(product)/connect/page.tsx",
  "src/app/(product)/connect/people/page.tsx",
  "src/app/(product)/connect/problems/page.tsx",
];

/** Die Seiten, die einem selbst gehoeren. */
const OWN_PAGES = [
  "/connect/profile",
  "/connect/my",
  "/connect/ventures/mine",
  "/connect/suggestions",
];

/**
 * Der Weg zum Eigenen in Connect.
 *
 * ---------------------------------------------------------------------------
 * UMGEZOGEN AM 30.09.2026
 * ---------------------------------------------------------------------------
 *
 * Er stand als eigene Reihe auf den Umsehen-Seiten. Damit hatte Connect ein
 * anderes Muster als ALIGN, wo dieselben Ziele in der Leiste stehen - und
 * FIND ein drittes. Maria: „Wenn das Menü tatsächlich einheitlich ist, so wie
 * wir das bei Align gemacht haben, für diese anderen beiden Bereiche auch,
 * dann ist das ordentlicher."
 *
 * Die Eigenschaft, die diese Prüfungen schützen, ist dieselbe geblieben: Aus
 * Connect führt ein Weg zum Eigenen, und zwar von JEDER Seite. Nur steht er
 * jetzt woanders — und dadurch auch auf den Seiten, auf denen die Reihe
 * vorher fehlte.
 */
test("aus Connect führt ein Weg zum Eigenen", () => {
  // Bis 19.09.2026 gab es keinen: Die Seiten existierten, aber der einzige
  // Link dorthin stand im zentralen Profil - also in einem anderen Bereich.
  const shell = source(SHELL);
  for (const href of OWN_PAGES) {
    assert.ok(shell.includes(`href: "${href}"`), `${href} ist von Connect aus nicht erreichbar`);
  }
});

test("der Weg steht auf jeder Connect-Seite, nicht nur auf den Umsehen-Seiten", () => {
  // Die Leiste gehört zum Bereich und nicht zur Seite: Sie erscheint, sobald
  // `isActive` für Connect zutrifft - also überall unter /connect.
  const shell = source(SHELL);
  assert.match(shell, /currentPathname\.startsWith\("\/connect"\)/);
  assert.match(shell, /const activeAreaSubItems = activeArea\?\.subItems/);

  // Und die alte Reihe ist weg, nicht zusätzlich da: Zwei Wege zu denselben
  // Seiten heißen, dass man sich angewöhnt, in beiden zu suchen.
  assert.ok(!existsSync("src/features/connect/ConnectMineNav.tsx"));
  for (const page of BROWSE_PAGES) {
    assert.ok(!/ConnectMineNav/.test(source(page)), `${page} trägt noch die alte Reihe`);
  }
});

test("die Ziele sind in beiden Sprachen beschriftet", () => {
  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8")) as Record<
      string,
      string
    >;
    for (const key of [
      "connectProfile",
      "connectListings",
      "connectVentures",
      "connectSuggestions",
    ]) {
      assert.ok(nav[key], `${locale}: ${key} fehlt`);
    }
  }
});

test("die Reiter über die Inhalte bleiben auf der Seite", () => {
  // Menschen, Unternehmen, Angebote und Ungelöstes sind Ausschnitte derselben
  // Fläche und keine Orte - und sie tragen Zähler, damit niemand einen Reiter
  // anklickt, hinter dem nichts steht. In der Leiste gäbe es die Zahlen nicht.
  const tabs = source("src/features/connect/ConnectTabs.tsx");
  assert.match(tabs, /counts/);
  for (const page of BROWSE_PAGES) {
    assert.match(source(page), /<ConnectTabs/, `${page} hat keine Reiterreihe`);
  }
});
