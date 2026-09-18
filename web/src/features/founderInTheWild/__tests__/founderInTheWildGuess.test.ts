import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_IN_THE_WILD_PACK,
  FOUNDER_IN_THE_WILD_PACKS,
  getFounderInTheWildPack,
  isFounderInTheWildChoice,
} from "@/features/founderInTheWild/founderInTheWildContent";

const source = (path: string) => readFileSync(path, "utf8");
const sqlWithoutComments = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261002120000_founder_in_the_wild_personal_pack.sql";
const OLD_MIGRATION = "../supabase/migrations/20260830200000_create_founder_in_the_wild_v1.sql";

// ---------------------------------------------------------------------------
// Das alte Pack bleibt, wie es ist
// ---------------------------------------------------------------------------
test("das bestehende Pack bekommt das Raten NICHT nachtraeglich", () => {
  // Die Vollstaendigkeit einer Runde ergibt sich aus den Antwortvertraegen des
  // Packs. Ein vierter Vertrag in 'under_pressure_v1' haette jede laufende UND
  // jede abgeschlossene Runde schlagartig unvollstaendig gemacht - Menschen
  // haetten eine fertige Runde wieder offen vorgefunden.
  const migration = sqlWithoutComments(MIGRATION);
  assert.doesNotMatch(
    migration,
    /'under_pressure_v1'/,
    "die Migration fasst das bestehende Pack an"
  );
  assert.equal(FOUNDER_IN_THE_WILD_PACK.hasGuess, false);

  // Und die Rechnung, die das entscheidet, haengt weiterhin an den Vertraegen.
  assert.match(
    sqlWithoutComments(OLD_MIGRATION),
    /is_founder_in_the_wild_round_answer_complete[\s\S]{0,900}prompt_response_contracts/
  );
});

// ---------------------------------------------------------------------------
// Das neue Pack
// ---------------------------------------------------------------------------
test("es gibt jetzt zwei Packs, und nur das neue laesst raten", () => {
  assert.equal(FOUNDER_IN_THE_WILD_PACKS.length, 2);
  const withGuess = FOUNDER_IN_THE_WILD_PACKS.filter((pack) => pack.hasGuess);
  assert.equal(withGuess.length, 1);
  assert.equal(withGuess[0]?.key, "when_it_gets_personal_v1");
  for (const pack of FOUNDER_IN_THE_WILD_PACKS) {
    assert.equal(pack.scenarios.length, 5, `${pack.key}: nicht fuenf Szenen`);
  }
});

test("Inhalt und Datenbank kennen dieselben Szenen und Schluessel", () => {
  const migration = sqlWithoutComments(MIGRATION);
  const pack = getFounderInTheWildPack("when_it_gets_personal_v1");
  assert.ok(pack);

  for (const scenario of pack.scenarios) {
    assert.match(migration, new RegExp(`'${scenario.key}'`), `${scenario.key} fehlt in der Migration`);
    // Waere ein Schluessel im Text anders als im Vertrag, liefe die Antwort in
    // founder_in_the_wild_choices_invalid - erst beim Absenden, nicht vorher.
    for (const choice of [...scenario.moves, ...scenario.matters, ...scenario.needs]) {
      assert.match(
        migration,
        new RegExp(`'${choice.key}'`),
        `${scenario.key}: ${choice.key} steht nicht im Vertrag`
      );
    }
  }
});

test("geraten wird auf denselben Zuegen wie gewaehlt", () => {
  const pack = getFounderInTheWildPack("when_it_gets_personal_v1");
  const scenario = pack!.scenarios[0];
  const move = scenario.moves[0].key;

  // Sonst liessen sich Tipp und Antwort nicht vergleichen.
  assert.equal(isFounderInTheWildChoice("guess", scenario, [move]), true);
  assert.equal(isFounderInTheWildChoice("guess", scenario, [scenario.needs[0].key]), false);
  assert.equal(isFounderInTheWildChoice("guess", scenario, [move, scenario.moves[1].key]), false, "ein Tipp, keine Auswahl");

  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /when 'guess' then contract\.move_keys/);
  assert.match(migration, /\('guess'::text\)/);
});

test("die Datenbank nimmt den vierten Antworttyp ueberhaupt an", () => {
  // Die Sperr-Funktion wies alles ab, was nicht move/matters/need war - der
  // Tipp waere gar nicht erst gespeichert worden.
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /p_response_type not in \('move','matters','need','guess'\)/);
  assert.match(migration, /create or replace function public\.lock_founder_in_the_wild_response/);
});

// ---------------------------------------------------------------------------
// Der Moment, um den es geht
// ---------------------------------------------------------------------------
test("der Reveal sagt, ob man richtig geraten hat - und schweigt sonst", () => {
  const reveal = source(
    "src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/[roundId]/reveal/[position]/page.tsx"
  );
  assert.match(reveal, /reveal\.ownGuessHit !== null \? \(/, "ein fehlendes Raten wuerde als Fehlschuss gezeigt");
  assert.match(reveal, /t\(reveal\.ownGuessHit \? "guessHit" : "guessMiss"/);

  const model = source("src/features/founderInTheWild/founderInTheWildModel.ts");
  // Getroffen heisst: mein Tipp ist der Zug, den der andere wirklich gewaehlt
  // hat - nicht irgendein Uebereinstimmen.
  assert.match(model, /ownGuessHit: hit\(own\.guess, partner\.move\)/);
  assert.match(model, /partnerGuessHit: hit\(partner\.guess, own\.move\)/);
  assert.match(model, /round\.pack\.hasGuess && guess\.length === 1/);
});

test("eine Runde mit Raten gilt erst als fertig, wenn der Tipp steht", () => {
  const model = source("src/features/founderInTheWild/founderInTheWildModel.ts");
  // Waere das hier laxer als in der Datenbank, sagte die Seite "fertig" und
  // der Reveal bliebe verschlossen.
  assert.match(model, /\(!guess \|\| guess\.lockedAt\)/);

  const form = source("src/features/founderInTheWild/FounderInTheWildPromptForm.tsx");
  assert.match(form, /\(!prompt\.guess \|\| guess\.length === 1\)/);
});

// ---------------------------------------------------------------------------
// Die Auswahl
// ---------------------------------------------------------------------------
test("beide Packs stehen zur Wahl, aber nur eine Runde laeuft", () => {
  const entry = source(
    "src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/page.tsx"
  );
  assert.match(entry, /FOUNDER_IN_THE_WILD_PACKS\.map/);
  assert.match(entry, /t\("otherRoundOpen"\)/, "eine offene Runde blockiert das andere Pack nicht");
  assert.match(entry, /startFounderInTheWildRoundAction\.bind\(null, teamId, pack\.key\)/);

  // Der Schluessel aus dem Formular wird geprueft, bevor er an die Datenbank
  // geht.
  const actions = source("src/features/founderInTheWild/founderInTheWildActions.ts");
  assert.match(actions, /const pack = getFounderInTheWildPack\(packKey\);/);
  assert.match(actions, /if \(!pack\) redirect/);
});

test("jeder neue Text steht in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(source(`messages/${locale}/founderInTheWild.json`)) as {
      entry: Record<string, string>;
      round: Record<string, string>;
      reveal: Record<string, string>;
    };
    for (const key of ["withGuess", "otherRoundOpen"]) {
      assert.ok(messages.entry[key], `${locale}: entry.${key} fehlt`);
    }
    for (const key of ["guess", "guessHint", "partnerFallback"]) {
      assert.ok(messages.round[key], `${locale}: round.${key} fehlt`);
    }
    for (const key of ["guessHit", "guessMiss", "guessMissDetail", "partnerGuessHit", "partnerGuessMiss"]) {
      assert.ok(messages.reveal[key], `${locale}: reveal.${key} fehlt`);
    }
  }
});
