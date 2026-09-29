import test from "node:test";
import assert from "node:assert/strict";

import {
  deepDiveLinks,
  sectionsWithoutDeepDive,
} from "@/features/instruments/align/deepDive";
import { getFounderSetupCatalogItem } from "@/features/teams/founderSetupCatalog";
import { SCOPES } from "@/features/instruments/align/registries";

test("vor der Gründung werden nur beantwortbare Themen angeboten", () => {
  // Der Katalog sagt es selbst: „‚Founder-Exit‘ anzubieten, bevor die
  // Rechtsform steht, ist Laerm - und Laerm laesst Menschen die Seite
  // schliessen.“
  for (const scope of SCOPES) {
    for (const link of deepDiveLinks(scope, "pre_founder")) {
      assert.equal(
        getFounderSetupCatalogItem(link.itemKey)?.phase,
        "before",
        `${scope}: ${link.itemKey} ist vor der Gruendung nicht beantwortbar`,
      );
    }
  }
});

test("ein bestehendes Team bekommt mehr Themen als ein Vorhaben vor der Gründung", () => {
  // Sonst waere die Phasenregel eine Behauptung ohne Wirkung.
  const vorher = deepDiveLinks("venture_alignment", "pre_founder");
  const danach = deepDiveLinks("venture_alignment", "existing_team");

  assert.ok(danach.length > vorher.length);
  for (const link of vorher) {
    assert.ok(
      danach.some((entry) => entry.itemKey === link.itemKey),
      `${link.itemKey} verschwindet nach der Gruendung`,
    );
  }
});

test("jedes Thema steht nur einmal, auch wenn mehrere Abschnitte darauf zeigen", () => {
  // A, I und E zeigen alle drei auf „Entscheidungen & Entscheidungsrechte“.
  // Dreimal dieselbe Karte waere nicht mehr Weg, sondern weniger.
  const links = deepDiveLinks("founder_profile", "existing_team");
  const keys = links.map((link) => link.itemKey);

  assert.deepEqual(keys, [...new Set(keys)]);

  const entscheidungen = links.find((link) => link.itemKey === "decision_rights");
  assert.ok(entscheidungen);
  assert.equal(entscheidungen.sections.length, 3, "A, I und E zeigen alle darauf");
});

test("nur „S – Ziele“ hat kein Thema — und das ist so gewollt", () => {
  // Der Setup-Katalog hat nichts fuer Ziele. Ein erfundener Link waere
  // schlimmer als keiner: Wer „Rollen & Verantwortlichkeiten“ anklickt, weil
  // er ueber Ziele sprechen wollte, haelt den Irrtum fuer seinen eigenen.
  //
  // Kommt ein Abschnitt dazu, faellt er hier auf, statt lautlos ohne Weg
  // dazustehen.
  assert.deepEqual(sectionsWithoutDeepDive("founder_profile"), []);
  assert.deepEqual(sectionsWithoutDeepDive("venture_alignment"), [
    "S – Ziele & strategische Richtung",
  ]);
});
