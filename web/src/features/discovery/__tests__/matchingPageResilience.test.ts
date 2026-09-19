import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PREPARATION = "src/app/(product)/discovery/intros/[introRequestId]/matching/page.tsx";
const REPORT = "src/app/(product)/matching/[matchingSessionId]/report/page.tsx";

/**
 * Die Ladefunktionen dieser beiden Seiten. Alle werfen bei einem
 * Datenbankfehler - das ist ihre Bauweise und in Ordnung. Nicht in Ordnung ist,
 * wenn eine Serverkomponente den Wurf nicht faengt: Dann steht statt einer
 * Seite eine weisse Fehlermeldung mit einer Digest-Nummer.
 */
const THROWING_LOADERS = [
  "getDiscoveryMatchingPreparation",
  "getMatchingSessionForDiscoveryStart",
  "getMatchingReportRunForSession",
  "getMatchingWorkspaceForSession",
];

test("Gemeinsam prüfen stürzt bei einem Datenbankfehler nicht ab", () => {
  // GEFUNDEN AM 20.09.2026 in der Produktion: "Application error: a
  // server-side exception has occurred", Digest 1326995352. Die Ursache war
  // nicht ein einzelner Bug, sondern dass NICHTS gefangen wurde - drei
  // Ladefunktionen mit einem Dutzend Abfragen darunter, jede mit
  // `throw new Error(...load_failed)`.
  const page = codeOnly(PREPARATION);
  assert.match(page, /try \{/, "die Ladephase ist ungesichert");
  assert.match(page, /return <UnavailableState t=\{t\} \/>;/);

  // Jeder werfende Aufruf muss INNERHALB des try stehen.
  const tryStart = page.indexOf("try {");
  const catchEnd = page.indexOf("}", page.indexOf("} catch (error) {"));
  for (const loader of ["getDiscoveryMatchingPreparation", "getMatchingSessionForDiscoveryStart"]) {
    const at = page.indexOf(`await ${loader}(`);
    assert.ok(at > tryStart && at < catchEnd, `${loader} steht ausserhalb der Absicherung`);
  }
});

test("der Report stürzt bei einem Datenbankfehler nicht ab", () => {
  const page = codeOnly(REPORT);
  assert.match(page, /try \{/);
  assert.match(page, /} catch \(error\) \{/);
  assert.match(page, /return <EmptyReportState/);
});

test("das Protokoll nennt den Grund, ohne jemanden zu nennen", () => {
  // Der Zweck des console.error: Beim naechsten Mal steht im Serverprotokoll,
  // WELCHE Abfrage es war. Ohne Kennungen - ein Protokoll, das user_id oder
  // relationship_id mitschreibt, ist ein Datenschutzproblem, das man sich fuer
  // eine Fehlersuche einkauft.
  for (const [path, tag] of [
    [PREPARATION, "\\[discovery-matching\\] preparation_load_failed"],
    [REPORT, "\\[matching-report\\] load_failed"],
  ] as const) {
    const page = source(path);
    assert.match(page, new RegExp(`console\\.error\\("${tag}"`));
    const statement = page.slice(page.indexOf("console.error("));
    const block = statement.slice(0, statement.indexOf("});") + 3);
    assert.match(block, /operation: "/, `${path}: das Protokoll nennt den Vorgang nicht`);
    assert.match(block, /reason: error instanceof Error/, `${path}: es nennt den Grund nicht`);
    assert.doesNotMatch(
      block,
      /\b(userId|user\.id|relationshipId|introRequestId|matchingSessionId|email)\b/,
      `${path}: das Protokoll schreibt eine Kennung mit`
    );
  }
});

// ---------------------------------------------------------------------------
// Die Sackgasse bei einer bestehenden Verbindung
// ---------------------------------------------------------------------------
test("wer sich schon kennt, bekommt keinen Knopf, der nicht gehen kann", () => {
  // GEMELDET AM 20.09.2026: Zwei Menschen kennen sich aus dem
  // Co-Founder-Matching, finden sich danach NOCH EINMAL über Find und nehmen
  // dort ein Intro an. `canCreateDiscoveryMatchingStart` ergibt bei einer
  // bestehenden Beziehung immer false - der Knopf MUSSTE scheitern.
  const page = codeOnly(PREPARATION);
  assert.match(page, /const existingSharedContext =/);
  assert.match(
    page,
    /existingSharedContext \?[\s\S]{0,200}alreadyConnectedText/,
    "in diesem Zustand steht kein erklärender Text statt des Knopfes"
  );
  // Der Knopf hängt jetzt am Gegenteil dieses Zustands.
  const buttonAt = page.indexOf("actions.startPreparation");
  const guardAt = page.lastIndexOf("existingSharedContext ? (", buttonAt);
  assert.ok(guardAt > 0 && guardAt < buttonAt, "der Knopf steht ungesichert da");
});

test("der Hinweis auf die bestehende Verbindung führt auch dorthin", () => {
  // Vorher stand da "Öffnet eure bestehende Verbindung" - ohne irgendetwas
  // zum Anklicken. Einen Weg zu nennen, den man nicht gehen kann, ist
  // schlimmer als ihn nicht zu nennen.
  const page = codeOnly(PREPARATION);
  assert.match(page, /href="\/connections"/);
  assert.match(page, /matchingPreparation\.actions\.openExistingConnection/);

  for (const locale of ["de", "en"]) {
    const prep = (
      JSON.parse(readFileSync(`messages/${locale}/discovery.json`, "utf8")) as {
        matchingPreparation: {
          actions: Record<string, string>;
          states: Record<string, string>;
          existingContextText: string;
        };
      }
    ).matchingPreparation;
    assert.ok(prep.actions.openExistingConnection, `${locale}: der Weg hat kein Label`);
    for (const key of ["alreadyConnectedTitle", "alreadyConnectedSubtext", "alreadyConnectedText"]) {
      assert.ok(prep.states[key], `${locale}: states.${key} fehlt`);
    }
    // Der Text muss sagen, WOHER der gemeinsame Bereich kommt - sonst liest es
    // sich wie ein Fehler des Produkts.
    assert.match(
      prep.existingContextText,
      locale === "de" ? /Co-Founder-Matching/ : /co-founder matching/,
      `${locale}: der Text erklärt die Herkunft nicht`
    );
  }
});

test("die drei Schritte stehen nur da, wo es noch losgeht", () => {
  // "Als Nächstes beantwortet ihr Fragen" vor Menschen, die das längst getan
  // haben, ist Hohn.
  const page = codeOnly(PREPARATION);
  const steps = page.indexOf("steps.startFullMatching");
  const guard = page.lastIndexOf("existingSharedContext ? null : (", steps);
  assert.ok(guard > 0 && guard < steps, "die Schritte stehen auch im schon-verbunden-Fall");
});

test("die werfenden Ladefunktionen sind als solche erkennbar geblieben", () => {
  // Der Gegenentwurf waere gewesen, sie still `null` zurueckgeben zu lassen.
  // Das waere schlechter: Ein Ladefehler und "es gibt nichts" sind zwei
  // verschiedene Dinge, und die Seite soll sie unterscheiden koennen.
  const data = source("src/features/discovery/discoveryMatchingStartData.ts");
  assert.match(data, /throw new Error\(getErrorMessage\(error, "discovery_matching_start_load_failed"\)\)/);
  assert.ok(THROWING_LOADERS.length >= 4);
});
