import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { profileTabState } from "@/features/profile/profileTabState";

const read = (path: string) => readFileSync(path, "utf8");

test("jeder Bearbeitungsschritt gehört zu genau einer Gruppe", () => {
  assert.deepEqual(profileTabState(null), { group: "overview" });
  assert.deepEqual(profileTabState("identity"), { group: "about", sub: "identity" });
  assert.deepEqual(profileTabState("resources"), { group: "about", sub: "resources" });
  for (const step of ["areas", "ownership", "evidence"]) assert.deepEqual(profileTabState(step), { group: "align", sub: "capability" });
  assert.deepEqual(profileTabState("strengths"), { group: "align", sub: "strengths" });
  assert.deepEqual(profileTabState("sichtbarkeit"), { group: "visibility" });
  assert.deepEqual(profileTabState(null, "direction"), { group: "align", sub: "direction" });
  // Ein unbekannter Schritt führt nicht in eine fremde Gruppe.
  assert.deepEqual(profileTabState("unbekannt"), { group: "overview" });
});

test("alle Schritte der Profilseite sind einer Gruppe zugeordnet", () => {
  const page = read("src/app/(product)/profile/page.tsx");
  const steps = [...(page.match(/const PAGE_STEPS = \[([\s\S]*?)\] as const/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((m) => m[1]!);
  assert.ok(steps.length >= 7);
  for (const step of steps) assert.notEqual(profileTabState(step).group === "overview", true, `${step} ohne Gruppe`);
});

test("Find und Connect erscheinen nur mit Zugang und führen zu ihren eigenen Seiten", () => {
  const tabs = read("src/features/profile/ProfileTabs.tsx");
  assert.match(tabs, /hasFind \? \[\{ key: "find", href: "\/discovery\/profile"/);
  assert.match(tabs, /hasConnect \? \[\{ key: "connect", href: "\/connect\/profile"/);
  assert.match(read("src/app/(product)/profile/page.tsx"), /<ProfileTabs step=\{step\} hasFind=\{hasDiscovery\} hasConnect=\{isConnectMember\}/);
  assert.match(read("src/app/(product)/profile/direction/page.tsx"), /<ProfileTabsForUser[^>]*current="direction"/);
  // Keine Zahl, kein Fortschritt in den Reitern.
  assert.doesNotMatch(tabs, /%|percent|score|von\s+\d/i);
});

test("die Reiter sind in beiden Sprachen beschriftet", () => {
  for (const locale of ["de", "en"]) {
    const tabs = JSON.parse(read(`messages/${locale}/capability.json`)).profileTabs as Record<string, unknown>;
    for (const key of ["label", "subLabel", "overview", "about", "align", "visibility", "find", "connect"]) assert.ok(tabs[key], `${locale}: ${key}`);
    for (const key of ["identity", "resources", "capability", "strengths", "direction"]) assert.ok((tabs.sub as Record<string, string>)[key], `${locale}: sub.${key}`);
  }
});
