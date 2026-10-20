import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INTEREST_AREAS, interestsForPlan, parseInterests } from "@/features/profile/interests";

// 21.10.2026: „Wofuer ich hier bin" ist eine Absicht, keine Berechtigung.
test("nur bekannte Absichten, ohne Doppelte, in fester Reihenfolge", () => {
  assert.deepEqual(parseInterests(["find", "admin", "align", "find", 3, null]), ["align", "find"]);
  assert.deepEqual(parseInterests([]), []);
  assert.deepEqual([...INTEREST_AREAS], ["align", "find", "connect", "advise"]);
});

test("der Einstieg leitet die Absicht aus Plan und Startwahl ab", () => {
  assert.deepEqual(interestsForPlan("founder", ""), ["align", "find"]);
  assert.deepEqual(interestsForPlan("advisor", ""), ["advise"]);
  assert.deepEqual(interestsForPlan("both", ""), ["align", "find", "advise"]);
  assert.deepEqual(interestsForPlan("connect", ""), ["connect"]);
  // Wer als Founder ausdruecklich mit Connect anfaengt, hat Connect gesagt.
  assert.deepEqual(interestsForPlan("founder", "connect"), ["align", "find", "connect"]);
  assert.deepEqual(interestsForPlan("", ""), []);
});

test("die Absicht gibt nie Zugang: sie steht im Kern, nicht in Rollen oder Freigaben", () => {
  const migration = readFileSync("../supabase/migrations/20261212120000_person_interests.sql", "utf8");
  assert.match(migration, /add column interests text\[\] not null default '\{\}'/);
  assert.match(migration, /interests <@ array\['align', 'find', 'connect', 'advise'\]/);
  assert.doesNotMatch(migration, /create policy|alter policy|network_memberships|insert into public\.profiles/);
  // Gelesen wird fehlertolerant: ein Fehler darf keine Seite stoeren.
  const data = readFileSync("src/features/profile/interestsData.ts", "utf8");
  assert.match(data, /catch \{\s*return \[\];/);
  // Und die gemeinsame Kernabfrage bleibt unberuehrt - ohne die Spalte laufen alle Profilseiten weiter.
  const core = readFileSync("src/features/profile/personCoreData.ts", "utf8");
  assert.doesNotMatch(core, /interests/);
});

test("Startseite und Profil nutzen sie nur als Vorschlag", () => {
  const areas = readFileSync("src/features/dashboard/DashboardOrientation.tsx", "utf8");
  assert.match(areas, /interests = \[\]/);
  assert.match(areas, /\.sort\(\(a, b\) => Number\(wanted\(b\.key\)\) - Number\(wanted\(a\.key\)\)\)/);
  const page = readFileSync("src/app/(product)/profile/page.tsx", "utf8");
  assert.match(page, /step === "identity" \? <InterestsCard/);
});
