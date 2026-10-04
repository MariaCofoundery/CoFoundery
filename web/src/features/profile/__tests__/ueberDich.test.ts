import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  MARKABLE_STEPS,
  STATION_IDS,
  STEPS_OF,
  buildAboutYou,
  isMarkableStep,
  recommendNextStep,
  stationStatus,
  type AboutYouFacts,
  type StationId,
  type StepId,
} from "@/features/profile/aboutYou";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = join("src", "app", "(product)", "profile", "page.tsx");
const MODELL = join("src", "features", "profile", "aboutYou.ts");

/** Ein Mensch, der gerade erst da ist. */
const leer: AboutYouFacts = {
  identityGaps: 3,
  identityTouched: false,
  workAnswers: 0,
  workSubmitted: false,
  interviewStarted: false,
  interviewCompleted: false,
  unsortedAnswers: 0,
  areaCount: 0,
  levelledCount: 0,
  wishedCount: 0,
  strengthCount: 0,
  directionAnswers: 0,
  directionStatements: 0,
  confirmedResources: 0,
  pendingResources: 0,
  marks: new Set<string>(),
};

const mit = (teil: Partial<AboutYouFacts>): AboutYouFacts => ({ ...leer, ...teil });
const station = (facts: AboutYouFacts, id: StationId) =>
  buildAboutYou(facts).find((s) => s.id === id)!;
const schritt = (facts: AboutYouFacts, id: StepId) =>
  buildAboutYou(facts)
    .flatMap((s) => s.steps)
    .find((s) => s.id === id)!;

// ---------------------------------------------------------------------------
// Der Grundzustand
// ---------------------------------------------------------------------------

test("ein leeres Profil hat fuenf offene Stationen und keine Rechnung", () => {
  const stations = buildAboutYou(leer);

  assert.deepEqual(
    stations.map((s) => s.id),
    [...STATION_IDS],
  );
  for (const s of stations) {
    assert.equal(s.status, "open", `${s.id} ist nicht offen`);
  }

  // Neun Erfassungswege unter fünf Stationen - keiner geht verloren, und
  // keiner kommt doppelt vor.
  const alle = stations.flatMap((s) => s.steps.map((step) => step.id));
  assert.equal(new Set(alle).size, alle.length, "ein Schritt steht in zwei Stationen");
  assert.equal(alle.length, Object.values(STEPS_OF).flat().length);
});

test("die grosse Station traegt fuenf Schritte und trotzdem einen Status", () => {
  // „Was du mitbringst" liegt über fünf Erfassungswegen. Sie zeigt EINEN
  // Status - fünf nebeneinander wären eine Rechnung, und „3 von 5 erledigt"
  // ist der Fortschrittsbalken, den diese Seite nicht haben soll.
  const facts = mit({ areaCount: 3, levelledCount: 3, wishedCount: 0, strengthCount: 2 });
  const mitbringen = station(facts, "mitbringen");

  assert.equal(mitbringen.steps.length, 5);
  assert.equal(mitbringen.status, "started");

  // Und der Status ist keine Mehrheitsentscheidung: Ein offener Schritt
  // genügt, damit die Station nicht „für jetzt fertig" ist.
  assert.equal(
    stationStatus([
      { id: "faehigkeiten", status: "doneForNow", href: "", markable: true },
      { id: "staerken", status: "open", href: "", markable: true },
    ]),
    "started",
  );
});

// ---------------------------------------------------------------------------
// Was abgeleitet wird
// ---------------------------------------------------------------------------

test("die Basis endet an derselben Schwelle wie das Veroeffentlichen", () => {
  // Zwei Begriffe von „genug" für dieselben drei Felder wären ein
  // Widerspruch, den niemand auflöst: `getIdentityGaps` entscheidet beides.
  assert.equal(schritt(leer, "basis").status, "open");
  assert.equal(schritt(mit({ identityTouched: true }), "basis").status, "started");
  assert.equal(
    schritt(mit({ identityTouched: true, identityGaps: 0 }), "basis").status,
    "doneForNow",
  );
  assert.match(codeOnly(MODELL), /facts\.identityGaps === 0/);
});

test("das Arbeitsprofil ist fertig, wenn es abgegeben ist - nicht vorher", () => {
  assert.equal(schritt(mit({ workAnswers: 11 }), "arbeitsweise").status, "started");
  assert.equal(
    schritt(mit({ workAnswers: 11, workSubmitted: true }), "arbeitsweise").status,
    "doneForNow",
  );
});

test("ein abgeschlossenes Gespraech mit wartenden Antworten ist nicht fertig", () => {
  // Was nicht eingeordnet ist, steht nirgends im Profil. Ein Haken darüber
  // wäre eine falsche Auskunft über den eigenen Bestand.
  const facts = mit({ interviewCompleted: true, unsortedAnswers: 3 });
  assert.equal(schritt(facts, "gespraech").status, "started");
  assert.equal(schritt(mit({ interviewCompleted: true }), "gespraech").status, "doneForNow");
});

test("Erfahrung und Verantwortung enden, wenn jeder Eintrag eine Angabe hat", () => {
  const halb = mit({ areaCount: 4, levelledCount: 2, wishedCount: 1 });
  assert.equal(schritt(halb, "erfahrung").status, "started");
  assert.equal(schritt(halb, "verantwortung").status, "started");

  const ganz = mit({ areaCount: 4, levelledCount: 4, wishedCount: 4 });
  assert.equal(schritt(ganz, "erfahrung").status, "doneForNow");
  assert.equal(schritt(ganz, "verantwortung").status, "doneForNow");

  // OHNE BEREICHE GIBT ES NICHTS EINZUORDNEN, und das ist „noch offen" und
  // nicht „fertig": Fertig wäre die Behauptung, es sei etwas geschehen.
  assert.equal(schritt(leer, "erfahrung").status, "open");
  assert.equal(schritt(leer, "verantwortung").status, "open");
});

test("die Richtung behaelt die Regel ihres Gespraechs", () => {
  // DIRECTION_MIN_ANSWERS, unverändert übernommen - keine zweite Definition
  // von „genug beantwortet" daneben.
  assert.equal(schritt(mit({ directionAnswers: 2 }), "antrieb").status, "started");
  assert.equal(schritt(mit({ directionAnswers: 4 }), "antrieb").status, "doneForNow");
  assert.match(codeOnly(MODELL), /facts\.directionAnswers >= DIRECTION_MIN_ANSWERS/);
  assert.ok(!/>= 4/.test(codeOnly(MODELL)), "die Zahl steht noch einmal von Hand da");
});

// ---------------------------------------------------------------------------
// Was nur die Person weiss
// ---------------------------------------------------------------------------

test("genau drei Bereiche koennen von Hand als fuer-jetzt-fertig gelten", () => {
  // „Genug Bereiche", „genug Stärken", „mehr Zugänge habe ich nicht" sind
  // Aussagen der Person und keine Eigenschaft ihrer Zeilen. Alle übrigen
  // sechs Schritte haben ein ableitbares Ende und brauchen keine Markierung.
  assert.deepEqual([...MARKABLE_STEPS], ["faehigkeiten", "staerken", "ressourcen"]);

  const alle = buildAboutYou(leer).flatMap((s) => s.steps);
  assert.deepEqual(
    alle.filter((s) => s.markable).map((s) => s.id),
    [...MARKABLE_STEPS],
  );

  assert.ok(isMarkableStep("staerken"));
  assert.ok(!isMarkableStep("basis"));
  assert.ok(!isMarkableStep("../../etc"));
});

test("eine Markierung ueberlebt spaetere Aenderungen", () => {
  // „Für jetzt fertig" heißt nicht „für immer abgeschlossen". Ein Profil,
  // das sich beim Pflegen selbst zurückstuft, bestraft das Pflegen.
  const markiert = mit({ strengthCount: 2, marks: new Set(["staerken"]) });
  assert.equal(schritt(markiert, "staerken").status, "doneForNow");

  const mehr = mit({ strengthCount: 9, marks: new Set(["staerken"]) });
  assert.equal(schritt(mehr, "staerken").status, "doneForNow");

  // Und ohne Markierung bleibt es „begonnen" - egal wie viele es sind.
  assert.equal(schritt(mit({ strengthCount: 40 }), "staerken").status, "started");
});

// ---------------------------------------------------------------------------
// Der Vorschlag
// ---------------------------------------------------------------------------

test("erst das Begonnene, dann etwas Neues", () => {
  // Wer mitten in den Erfahrungsstufen steckt, soll nicht als Nächstes das
  // Gespräch angeboten bekommen.
  const facts = mit({
    identityTouched: true,
    identityGaps: 0,
    areaCount: 4,
    levelledCount: 2,
    marks: new Set(["faehigkeiten"]),
  });
  assert.equal(recommendNextStep(buildAboutYou(facts))?.id, "erfahrung");
});

test("ein markierbarer Bereich verdeckt nicht dauerhaft alles andere", () => {
  // GEFUNDEN VOM EIGENEN TEST: „Deine Fähigkeiten" bleibt `started`, solange
  // niemand sie markiert - es gibt dort nichts, was das beendet, ausser der
  // Person. Nach „erst das Begonnene" wäre also auf Dauer immer dasselbe
  // vorgeschlagen worden, auch wenn längst alles andere offen war.
  const facts = mit({
    identityTouched: true,
    identityGaps: 0,
    workSubmitted: true,
    interviewCompleted: true,
    areaCount: 4,
  });
  const vorschlag = recommendNextStep(buildAboutYou(facts));
  assert.notEqual(vorschlag?.id, "faehigkeiten", "der Vorschlag haengt an einer Markierung");
  assert.equal(vorschlag?.id, "erfahrung");

  // Bleibt nur noch die Entscheidung uebrig, darf sie auch vorgeschlagen
  // werden - dann ist sie wirklich das Naechste.
  const fastFertig = mit({
    identityTouched: true,
    identityGaps: 0,
    workSubmitted: true,
    interviewCompleted: true,
    areaCount: 3,
    levelledCount: 3,
    wishedCount: 3,
    strengthCount: 4,
    directionAnswers: 6,
    confirmedResources: 2,
  });
  assert.equal(recommendNextStep(buildAboutYou(fastFertig))?.id, "faehigkeiten");
});

test("wartende Antworten gehen allem vor", () => {
  // Der einzige Zustand, in dem Arbeit schon getan ist und trotzdem nichts
  // zu sehen - und damit der einzige, der einen Vorrang verdient.
  const facts = mit({ identityTouched: true, unsortedAnswers: 3 });
  const vorschlag = recommendNextStep(buildAboutYou(facts));
  assert.equal(vorschlag?.id, "gespraech");
  assert.equal(vorschlag?.href, "/profile/interview/sort");
  assert.equal(vorschlag?.urgent, true);

  // Ohne wartende Antworten gewinnt wieder das Begonnene.
  assert.equal(recommendNextStep(buildAboutYou(mit({ identityTouched: true })))?.id, "basis");
});

test("ist nichts mehr offen, gibt es keinen Vorschlag", () => {
  // Ein Satz ins Leere klänge nach einer Aufgabe, die es nicht gibt.
  const fertig = mit({
    identityTouched: true,
    identityGaps: 0,
    workSubmitted: true,
    interviewCompleted: true,
    areaCount: 3,
    levelledCount: 3,
    wishedCount: 3,
    strengthCount: 4,
    directionAnswers: 6,
    confirmedResources: 2,
    marks: new Set(["faehigkeiten", "staerken", "ressourcen"]),
  });
  const stations = buildAboutYou(fertig);
  for (const s of stations) assert.equal(s.status, "doneForNow", `${s.id}`);
  assert.equal(recommendNextStep(stations), null);
});

// ---------------------------------------------------------------------------
// Die Seite
// ---------------------------------------------------------------------------

test("die Uebersicht zaehlt nichts zusammen", () => {
  const page = codeOnly(PAGE);
  const modell = codeOnly(MODELL);

  // Kein Anteil, keine Gesamtzahl, kein Prozentwert - auch nicht nebenbei.
  for (const quelle of [page, modell]) {
    assert.ok(!/%|percent|progress|fortschritt/i.test(quelle), "ein Fortschrittswert");
    assert.ok(!/\{index\}.*\{total\}|von \{total\}|of \{total\}/.test(quelle), "eine Zählweise");
    assert.ok(!/completion|completed_count|doneCount/i.test(quelle), "ein Zählwert über Stationen");
  }

  // Und keine Nummer an einer Station: Wer mit den Ressourcen anfangen will,
  // soll das nicht als Umweg lesen.
  assert.ok(!/Station \d|station \d|stationNumber/.test(page));
});

test("jede Station hat genau einen Hauptweg", () => {
  const page = codeOnly(PAGE);
  // Mehrere gleichrangige Knöpfe sind keine Empfehlung mehr.
  const karte = codeOnly(join("src", "features", "profile", "AboutYouStation.tsx"));
  assert.equal([...karte.matchAll(/cta\.href/g)].length, 1);
  assert.match(page, /cta=\{\{/);

  // Auch „für jetzt fertig" führt irgendwohin - der Knopf heißt dann anders.
  assert.match(page, /aboutYou\.cta\.\$\{station\.status\}/);
});

test("die Seite baut keine Erfassungsoberflaeche nach", () => {
  const page = codeOnly(PAGE);

  // Der Founder-Bogen, das Gespräch und das Richtungs-Gespräch bleiben, wo
  // sie sind. „Über dich" verdrahtet sie.
  for (const fremd of ["AlignmentForm", "InterviewAnswerForm", "DirectionProposals"]) {
    assert.ok(!page.includes(fremd), `${fremd} ist nachgebaut worden`);
  }

  // Und die Wege dorthin stehen im Modell, nicht als feste Adressen auf der
  // Seite verteilt.
  const modell = codeOnly(MODELL);
  for (const ziel of [
    "/me/profile/workstyle",
    "/profile/interview",
    "/profile/direction",
    "/profile?step=areas",
    "/profile?step=ownership",
    "/profile?step=strengths",
    "/profile?step=resources",
    "/profile?step=identity",
  ]) {
    assert.ok(modell.includes(ziel), `kein Weg zu ${ziel}`);
  }
});

test("die alten Adressen funktionieren weiter", () => {
  // `evidence`, `areas` und `ownership` stehen in Links, Lesezeichen und in
  // den Weiterleitungen der Erfassungsaktionen.
  const page = codeOnly(PAGE);
  const schritte = /const PAGE_STEPS = \[([\s\S]*?)\] as const;/.exec(page)?.[1];
  assert.ok(schritte, "die Schritte stehen nicht als Daten");
  for (const alt of ["evidence", "areas", "ownership"]) {
    assert.match(schritte, new RegExp(`"${alt}"`), `${alt} ist verschwunden`);
  }
});

test("beide Sprachen sagen dasselbe ueber Ueber dich", () => {
  const bundle = (locale: string) =>
    JSON.parse(source(join("messages", locale, "capability.json"))).aboutYou as Record<
      string,
      unknown
    >;

  const pfade = (wert: unknown, praefix = ""): string[] =>
    typeof wert === "object" && wert !== null
      ? Object.entries(wert as Record<string, unknown>).flatMap(([k, v]) =>
          pfade(v, praefix ? `${praefix}.${k}` : k),
        )
      : [praefix];

  assert.deepEqual(pfade(bundle("de")).sort(), pfade(bundle("en")).sort());

  for (const locale of ["de", "en"]) {
    const about = bundle(locale);
    const status = about.status as Record<string, string>;
    assert.deepEqual(Object.keys(status).sort(), ["doneForNow", "open", "started"]);

    // KEIN ZUSTAND VERSPRICHT EIN ENDE. Der dritte trägt seine Einschränkung
    // im Namen - „fertig" allein wäre eine Zusage, die ein Profil nicht
    // einlösen kann, und machte jede spätere Ergänzung zum Rückschritt.
    assert.match(
      status.doneForNow,
      locale === "de" ? /für jetzt/i : /for now/i,
      `${locale}: der dritte Zustand behauptet ein Ende: ${status.doneForNow}`,
    );

    // Je Station ein Titel und ein Satz, je Schritt ein Name.
    const stations = about.stations as Record<string, { title: string; text: string }>;
    assert.deepEqual(Object.keys(stations).sort(), [...STATION_IDS].sort());
    for (const id of STATION_IDS) {
      assert.ok(stations[id].title?.trim(), `${locale}: ${id} ohne Titel`);
      assert.ok(stations[id].text?.trim(), `${locale}: ${id} ohne Satz`);
    }

    const steps = about.steps as Record<string, string>;
    const vorschlaege = (about.next as { steps: Record<string, string> }).steps;
    for (const id of Object.values(STEPS_OF).flat()) {
      assert.ok(steps[id]?.trim(), `${locale}: Schritt ${id} ohne Namen`);
      assert.ok(vorschlaege[id]?.trim(), `${locale}: Schritt ${id} ohne Vorschlag`);
    }
  }
});
