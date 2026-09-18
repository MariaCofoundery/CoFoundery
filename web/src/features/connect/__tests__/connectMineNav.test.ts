import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

/** Die drei Seiten, auf denen man sich in Connect umsieht. */
const BROWSE_PAGES = [
  "src/app/(product)/connect/page.tsx",
  "src/app/(product)/connect/people/page.tsx",
  "src/app/(product)/connect/problems/page.tsx",
];

/** Die drei Seiten, die einem selbst gehoeren. */
const OWN_PAGES = ["/connect/profile", "/connect/my", "/connect/ventures"];

test("aus Connect führt ein Weg zum Eigenen", () => {
  // Bis 19.09.2026 gab es keinen: Die drei Seiten existierten, aber der
  // einzige Link dorthin stand im zentralen Profil - also in einem anderen
  // Bereich. Wer in Connect war, sah ausschliesslich das, was andere gemacht
  // haben, und kam an sein eigenes Profil nicht heran.
  const nav = source("src/features/connect/ConnectMineNav.tsx");
  for (const href of OWN_PAGES) {
    assert.ok(nav.includes(`"${href}"`), `${href} ist von Connect aus nicht erreichbar`);
  }
});

test("der Weg steht auf jeder Umsehen-Seite, nicht nur auf einer", () => {
  // Die Reiter sind eine Flaeche. Ein Rueckweg, den es nur auf einem der drei
  // Reiter gibt, ist ein Rueckweg, den man sucht.
  for (const page of BROWSE_PAGES) {
    assert.match(source(page), /<ConnectMineNav \/>/, `${page} hat keinen Weg zum Eigenen`);
  }
});

test("die Gruppe ist benannt und in beiden Sprachen beschriftet", () => {
  // Ohne aria-label ist es fuer eine Screenreader-Nutzerin nur die zweite
  // namenlose Navigation auf der Seite - direkt neben den Reitern.
  const nav = source("src/features/connect/ConnectMineNav.tsx");
  assert.match(nav, /aria-label=\{t\("mine\.label"\)\}/);

  for (const locale of ["de", "en"]) {
    const mine = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        mine: Record<string, string>;
      }
    ).mine;
    for (const key of ["label", "profile", "listings", "ventures"]) {
      assert.ok(mine?.[key], `${locale}: mine.${key} fehlt`);
    }
  }
});

test("die Ziele sind mit dem Daumen zu treffen und mit der Tastatur zu sehen", () => {
  const nav = source("src/features/connect/ConnectMineNav.tsx");
  assert.match(nav, /min-h-11/);
  assert.match(nav, /focus-visible:ring-2/);
});
