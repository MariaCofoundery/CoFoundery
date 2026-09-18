import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findGuessTallyForRound, type GuessTallySummary } from "@/features/collaborationLab/guessTally";

const source = (path: string) => readFileSync(path, "utf8");
const sqlWithoutComments = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261003120000_collaboration_guess_tally.sql";
const CARD = "src/features/collaborationLab/GuessTallyCard.tsx";

const summary = (rounds: GuessTallySummary["rounds"]): GuessTallySummary => ({
  rounds,
  totalPrompts: rounds.reduce((sum, round) => sum + round.promptCount, 0),
  ownHits: rounds.reduce((sum, round) => sum + round.ownHits, 0),
  partnerHits: rounds.reduce((sum, round) => sum + round.partnerHits, 0),
});

const round = (overrides: Partial<GuessTallySummary["rounds"][number]> = {}) => ({
  roundId: "r1",
  experienceKey: "founder_in_the_wild" as const,
  packKey: "when_it_gets_personal_v1",
  completedAt: null,
  promptCount: 5,
  ownHits: 3,
  partnerHits: 2,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Der Fund, der falsche Zahlen produziert haette
// ---------------------------------------------------------------------------
test("die Abfrage weiss, dass der Tipp in beiden Labs woanders liegt", () => {
  // Read My Mind legt den Tipp auf die Zuordnung der GERATENEN Person - dort
  // raet B ueber A, und A hat auf derselben Zuordnung geantwortet. Founder in
  // the Wild legt ihn auf die EIGENE Zuordnung.
  //
  // Ohne diese Unterscheidung stuenden ueberall null Treffer, und zwar ohne
  // dass irgendetwas fehlschlaegt.
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /'read_my_mind'::text as experience_key, 'self'::text as response_type, true as guess_on_target/);
  assert.match(migration, /'founder_in_the_wild', 'move', false/);
  assert.match(
    migration,
    /case when answer_type\.guess_on_target then partner_assignment\.id else own_assignment\.id end/
  );
  assert.match(
    migration,
    /case when answer_type\.guess_on_target then own_assignment\.id else partner_assignment\.id end/
  );
});

test("die Bilanz gibt nur Zahlen heraus", () => {
  const migration = sqlWithoutComments(MIGRATION);
  const signature = migration.slice(migration.indexOf("returns table ("), migration.indexOf(")\nlanguage sql"));
  // Ein Schluessel in der Rueckgabe waere ein Blick in die Antworten des
  // anderen - genau das, was der Reveal einzeln und erst nach Freigabe tut.
  assert.doesNotMatch(signature, /text\[\]|choice_keys/);
  assert.match(signature, /own_hits integer/);
  assert.match(signature, /partner_hits integer/);

  assert.match(migration, /revoke all on function public\.get_collaboration_guess_tally\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_collaboration_guess_tally\(uuid\) to authenticated/);
});

test("eine unfertige Runde wird nicht bilanziert", () => {
  // Ein Zwischenstand waere ein Blick in die Antworten des anderen, bevor
  // beide fertig sind.
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /and not exists \(\s*select 1\s*from public\.collaboration_experience_prompt_assignments/);
  assert.match(migration, /is_current_user_collaboration_round_participant/);
});

test("ein Pack ohne Raten taucht gar nicht erst auf", () => {
  // "0 von 5" waere dort eine Aussage, die niemand gemacht hat.
  assert.match(
    sqlWithoutComments(MIGRATION),
    /having count\(\*\) filter \(where paired\.own_guess is not null\) > 0/
  );
});

// ---------------------------------------------------------------------------
// Die Ansicht
// ---------------------------------------------------------------------------
test("ohne Bilanz erscheint nichts", () => {
  const card = source(CARD);
  // Eine leere Karte mit "noch keine Daten" ist schlechter als keine Karte.
  assert.match(card, /if \(!round && !hasHistory\) return null;/);
});

test("die Gesamtsumme erscheint erst, wenn es mehr als diese Runde gibt", () => {
  const card = source(CARD);
  assert.match(card, /const hasHistory = summary\.rounds\.length > \(round \? 1 : 0\);/);
});

test("wenige Treffer sind kein schlechtes Ergebnis", () => {
  const card = source(CARD);
  // Keine Prozentzahl, kein Ziel, nichts was nach Bewertung aussieht.
  assert.doesNotMatch(card, /%|percent|score|Math\.round/);
  assert.match(card, /hits \* 2 >= total \? "many" : "few"/);

  for (const locale of ["de", "en"]) {
    const tone = (
      JSON.parse(source(`messages/${locale}/collaborationLab.json`)) as {
        tally: { tone: Record<string, string> };
      }
    ).tally.tone;
    for (const key of ["all", "many", "few", "none"]) {
      assert.ok(tone[key], `${locale}: tone.${key} fehlt`);
    }
    assert.match(
      tone.few,
      locale === "de" ? /kein schlechtes Ergebnis/ : /isn't a bad result/,
      `${locale}: wenige Treffer klingen wie ein Misserfolg`
    );
  }
});

test("die Runde dieser Seite wird aus der Gesamtbilanz herausgesucht", () => {
  const tally = summary([round({ roundId: "r1" }), round({ roundId: "r2", ownHits: 1 })]);
  assert.equal(findGuessTallyForRound(tally, "r2")?.ownHits, 1);
  assert.equal(findGuessTallyForRound(tally, "gibt-es-nicht"), null);
  assert.equal(tally.ownHits, 4);
  assert.equal(tally.totalPrompts, 10);
});

test("beide Labs zeigen dieselbe Bilanz", () => {
  const pages = [
    "src/app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/page.tsx",
    "src/app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx",
    "src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/[roundId]/reveal/page.tsx",
    "src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/page.tsx",
  ];
  for (const page of pages) {
    assert.match(source(page), /<GuessTallyCard/, `${page}: keine Bilanz`);
  }
});
