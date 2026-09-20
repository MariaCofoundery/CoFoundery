import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ENTRY = "src/features/navigation/InstalledAppEntry.tsx";

/**
 * GEMELDET AM 20.09.2026 von einem iPhone: "Wenn ich wieder reingehe, komme
 * ich immer erstmal auf die Startseite ... eigentlich wuerde ich sofort gerne
 * in meinem Dashboard landen."
 *
 * Zwei Antworten, weil eine nicht reicht: `start_url` im Manifest gilt fuer
 * neue Installationen, diese Weiche fuer ein Symbol, das schon auf dem
 * Startbildschirm liegt.
 */
test("in der installierten App geht es weiter, im Browser nicht", () => {
  const entry = codeOnly(ENTRY);
  // Die Bedingung ist der ganze Punkt: Ohne sie wuerde jede angemeldete Person
  // von der Marketingseite weggeleitet, auch im Browser.
  assert.match(entry, /display-mode: standalone/);
  assert.match(entry, /standalone === true/, "iOS meldet es ueber navigator.standalone");
  assert.match(entry, /if \(!isStandalone\) return;/);
});

test("die Weiche fuehrt nach /start und nicht auf ein festes Dashboard", () => {
  // /start entscheidet anhand der Zugaenge. Ein festes /dashboard waere fuer
  // Menschen ohne Founder-Zugang die falsche Tuer - dieselbe Ueberlegung wie
  // bei start_url im Manifest.
  const entry = codeOnly(ENTRY);
  assert.match(entry, /router\.replace\("\/start"\)/);
  assert.doesNotMatch(entry, /"\/dashboard"/);

  // replace, nicht push: Sonst liegt die Marketingseite im Verlauf und
  // "zurueck" fuehrt aus der App heraus.
  assert.doesNotMatch(entry, /router\.push/);
});

test("sie steht auf der Marketing-Startseite", () => {
  const page = codeOnly("src/app/(marketing)/page.tsx");
  assert.match(page, /<InstalledAppEntry \/>/);
});
