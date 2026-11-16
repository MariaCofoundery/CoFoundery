import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { areaCards } from "@/features/dashboard/areasModel";

const code = (path: string) => readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const none = { work: false, can: false, strengths: false, direction: false };

test("Bereiche mit Fortschritt stehen oben, mit dem Stand als Tatsache; die übrigen laden ein", () => {
  const cards = areaCards({ alignParts: none, find: "draft", connect: null, hasAdvisor: false });
  assert.deepEqual(cards.map((card) => [card.key, card.chosen, card.state]), [
    ["align", false, "open"],
    ["find", true, "started"],
    ["connect", false, "open"],
    ["advise", false, "open"],
  ]);
  assert.equal(cards.find((card) => card.key === "find")!.href, "/discovery/profile");
  assert.equal(cards.find((card) => card.key === "connect")!.href, "/connect/profile");
});

test("Align führt zum ersten offenen Teil; Stärken öffnen immer Stärken entdecken; fertig führt zum Bericht", () => {
  const started = areaCards({ alignParts: { work: true, can: false, strengths: false, direction: false }, find: null, connect: null, hasAdvisor: false });
  const align = started.find((card) => card.key === "align")!;
  assert.equal(align.state, "started");
  assert.equal(align.href, "/profile?step=areas");
  const strengths = areaCards({ alignParts: { work: true, can: true, strengths: false, direction: false }, find: null, connect: null, hasAdvisor: false }).find((card) => card.key === "align")!;
  assert.equal(strengths.href, "/profile/strengths-interview?neu=1");
  const done = areaCards({ alignParts: { work: true, can: true, strengths: true, direction: true }, find: null, connect: null, hasAdvisor: false }).find((card) => card.key === "align")!;
  assert.deepEqual([done.state, done.href], ["done", "/me/profile/workstyle"]);
});

test("wo schon etwas getan wurde, zählt der Bereich als aktiv", () => {
  const cards = areaCards({ alignParts: none, find: "active", connect: "active", hasAdvisor: true });
  assert.deepEqual(cards.map((card) => [card.key, card.chosen]), [["align", false], ["find", true], ["connect", true], ["advise", true]]);
  assert.equal(cards.find((card) => card.key === "find")!.state, "done", "ein pausiertes oder aktives Find-Profil steht");
  assert.equal(areaCards({ alignParts: none, find: "paused", connect: null, hasAdvisor: false }).find((card) => card.key === "find")!.state, "done");
});

test("die Karte zeigt nur Worte, keine Zahl, keinen Wert, keine Rangfolge", () => {
  // Seit 17.11.2026 als vier Kacheln in der Hauptspalte (AreaTiles), nicht mehr in der leisen Spalte.
  const tiles = code("src/features/dashboard/AreaTiles.tsx");
  assert.match(tiles, /data-dashboard-areas/);
  assert.doesNotMatch(tiles.slice(tiles.indexOf("data-dashboard-areas")), /\bscore\b|percent|%|\bvon\s+\d/i);
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")).start.areas;
    for (const key of ["title", "setup", "continue", "view"]) assert.ok(bundle[key], `${locale}: ${key}`);
    for (const state of ["open", "started", "done"]) assert.ok(bundle.state[state], `${locale}: state ${state}`);
    for (const area of ["align", "find", "connect", "advise"]) assert.ok(bundle[area].name && bundle[area].line, `${locale}: ${area}`);
    assert.doesNotMatch(JSON.stringify(bundle), /%|Prozent|percent|Punkte|points/i, locale);
  }
  assert.doesNotMatch(readFileSync("messages/en/dashboard.json", "utf8").match(/"areas": \{[\s\S]*?"advise": \{[\s\S]*?\}\s*\}/)?.[0] ?? "", /[äöüÄÖÜß]/);
  // Die im Einstieg gewaehlte Absicht sortiert die Startseite nicht (Entscheidung vom 04.11.2026).
  assert.doesNotMatch(code("src/app/(product)/dashboard/page.tsx") + code("src/features/dashboard/areasModel.ts"), /getInterests|\.interests\b|input\.interests/);
  // Die Daten kommen mit den Rechten der Person aus der eigenen Zeile - nichts, was andere sehen.
  const states = code("src/features/dashboard/areaStates.ts");
  assert.match(states, /\.eq\("user_id", userId\)/);
  assert.doesNotMatch(states, /\.insert\(|\.update\(|\.delete\(|rpc\(/);
});

test("Startseite 17.11.2026: dunkler Schritt mit langsamem Lichtschein (steht still bei reduzierter Bewegung), Bereiche als Kacheln, Mia still neben der Begrüßung", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.dashboard-hero-night \{[^}]*#17173a/);
  assert.match(css, /@keyframes hero-glow-drift/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.dashboard-hero-night::before,\s*\.dashboard-hero-night::after \{ animation: none; \}/);
  const page = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  const asideSrc = readFileSync("src/features/dashboard/DashboardAside.tsx", "utf8");
  assert.match(asideSrc, /src="\/brand\/mia\.png" alt=""/, "Mia is decoration: empty alt, no animation");
  assert.doesNotMatch(asideSrc, /mia[^\n]*(animate|motion|transition)/i);
  const tiles = readFileSync("src/features/dashboard/AreaTiles.tsx", "utf8");
  assert.doesNotMatch(tiles, /%|percent|score/i);
  assert.match(tiles, /areas\.state\.\$\{area\.state\}/);
  const aside = readFileSync("src/features/dashboard/DashboardAside.tsx", "utf8");
  assert.doesNotMatch(aside, /data-dashboard-areas/, "the areas moved out of the quiet column");
});

test("Startseite 17.11.2026 Version 2: ein getöntes Feld rechts (Stand mit Mia, Team, Wartet auf dich), Wartendes bis fünf Zeilen, Bereiche mit Stand in Worten", () => {
  const aside = readFileSync("src/features/dashboard/DashboardAside.tsx", "utf8");
  assert.match(aside, /data-dashboard-panel/);
  assert.ok(aside.indexOf("dashboard-stand-title") < aside.indexOf("dashboard-team-title") && aside.indexOf("dashboard-team-title") < aside.indexOf("{waiting ?"), "Stand, then Team, then Wartet auf dich");
  assert.match(aside, /rounded-full bg-emerald-50/, "finished profile parts are chips");
  assert.doesNotMatch(aside, /<dl\b/, "the old definition list is gone");
  const waiting = readFileSync("src/features/dashboard/DashboardWaiting.tsx", "utf8");
  assert.ok(!waiting.startsWith('"use client"'));
  assert.match(waiting, /const SHOWN = 5;/);
  const tiles = readFileSync("src/features/dashboard/AreaTiles.tsx", "utf8");
  assert.match(tiles, /border-dashed/, "areas not in use are a quiet invitation");
  assert.match(tiles, /areas\.status\.align\.some/);
  assert.doesNotMatch(tiles, /%|percent|score/i);
  const next = readFileSync("src/features/dashboard/DashboardNextStep.tsx", "utf8");
  assert.match(next, /<ol aria-label=[^>]*className="sr-only"/, "the path stays available as text for screen readers");
});

test("areaCards names the finished and missing Align parts and the exact Find and Connect state", () => {
  const cards = areaCards({ alignParts: { work: true, can: true, strengths: false, direction: false }, find: "draft", connect: "active", hasAdvisor: false });
  const align = cards.find((card) => card.key === "align");
  assert.deepEqual(align?.doneParts, ["work", "can"]);
  assert.deepEqual(align?.missingParts, ["strengths", "direction"]);
  assert.equal(cards.find((card) => card.key === "find")?.detail, "draft");
  assert.equal(cards.find((card) => card.key === "connect")?.detail, "active");
  assert.equal(cards.find((card) => card.key === "advise")?.chosen, false);
});
