import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PAGE = "src/app/(product)/teams/[teamId]/page.tsx";

const groups = (locale: string) =>
  (
    (readJson(`messages/${locale}/teams.json`).homebase as Record<string, unknown>).groups as Record<
      string,
      { title?: string; text?: string }
    >
  ) ?? {};

/**
 * Die Verbindungsseite hat eine Reihenfolge.
 *
 * Bis 18.09.2026 standen dort neun gleich gewichtete Kaesten: Alignment,
 * Commitment Lab, Read My Mind, Founder in the Wild, Founder Setup, Library,
 * Vereinbarungen, Advisor-Aufgabe, Founders. Ein frisch gematchtes Paar sah
 * das und wusste nicht, wo es anfangen soll - und weil alles gleich aussah,
 * fuehlte sich das Spielerische wie Hausaufgaben an und das Ernste wie
 * Beiwerk.
 *
 * Jetzt drei Gruppen in der Reihenfolge, in der ein Paar sich bewegt.
 */
test("seit 04.11.2026: Grundlagen, Im Alltag, Wenn ihr mögt, dann eingeklappt Übungen zu zweit und Rückblick", () => {
  const page = source(PAGE);
  const at = (needle: string) => {
    const index = page.indexOf(needle);
    assert.ok(index > 0, `nicht gefunden: ${needle}`);
    return index;
  };

  // Kopf, naechster Schritt und "Euer Weg" stehen in TeamOverview.
  const header = at("<TeamOverview");
  const waiting = at('t("groups.waiting.title")');
  const core = at('t("groups.core.title")');
  const everyday = at('t("groups.everyday.title")');
  const extras = at('t("groups.extras.title")');
  const deepen = at('t("groups.discover.title")');
  const history = at('id="team-alignment"');
  const advisor = at("<FounderRelationshipAdvisorPanel");

  // Kern vorn, Ergaenzung danach, Hintergrund eingeklappt am Ende.
  assert.ok(at("<TeamPageHeader") < header, "der Teamkopf steht nicht ganz oben");
  assert.ok(header < waiting && waiting < core, "Wartet auf euch steht nicht direkt unter dem Kopf");
  assert.ok(core < everyday && everyday < extras && extras < deepen && deepen < history && history < advisor, "die Ebenen stehen nicht in Reihenfolge");
  // Die drei Grundlagen.
  for (const card of ['aria-labelledby="team-report-title"', 'aria-labelledby="team-venture-title"', 'aria-labelledby="team-setup-title"']) {
    assert.ok(at(card) > core && at(card) < everyday, `${card} steht nicht unter den Grundlagen`);
  }
  // Im Alltag: Testprojekt und Check-in.
  for (const card of ['aria-labelledby="test-project-title"', 'aria-labelledby="team-check-in-title"']) {
    assert.ok(at(card) > everyday && at(card) < extras, `${card} steht nicht im Alltag`);
  }
  // Ergaenzungen als kleine Karten.
  for (const card of ["<TeamStrengthsCard", "<TradeoffsTeamCard", "<BetaTeamCard", 'aria-labelledby="team-roles-title"', 'aria-labelledby="team-financing-title"', "<FounderLibraryHomebaseCard", 'aria-labelledby="team-program-title"']) {
    assert.ok(at(card) > extras && at(card) < deepen, `${card} steht nicht unter Wenn ihr mögt`);
  }
  // Die Uebungen zu zweit sind eingeklappt und stehen nach den Ergaenzungen.
  assert.match(page, /<details id="team-deep-dives"/);
  assert.doesNotMatch(page, /<details id="team-deep-dives"[^>]*\bopen=/);
  for (const entry of ['aria-labelledby="commitment-lab-title"', "<ReadMyMindHomebaseCard", "<FounderInTheWildHomebaseCard"]) {
    assert.ok(at(entry) > deepen && at(entry) < history, `${entry} steht nicht unter den Uebungen zu zweit`);
  }
  assert.ok(at('t("agreements.title")') > history, "historische Notizen stehen ausserhalb des Rueckblicks");
  // Genau eine Grundlage ist hervorgehoben - dieselbe Regel wie der naechste Schritt im Kopf.
  assert.match(page, /const focus = teamFocus\(journey\)/);
  assert.match(source("src/features/teams/TeamOverview.tsx"), /const here: StationKey = teamFocus\(journey\)/);

  const overview = source("src/features/teams/TeamOverview.tsx");
  for (const entry of ["/me/profile/workstyle", "ventureHref(teamId, journey.venture)", "/workstyle`", "/setup`"]) {
    assert.ok(overview.includes(entry), `${entry} fehlt im Teamkopf`);
  }
  assert.doesNotMatch(overview, /%|percent|von\s+\d|\bscore\b/i);

  // Founder Setup bleibt von oben erreichbar: Weg im Kopf, Karte unter den Grundlagen und Reiter.
  assert.match(source("src/features/teams/TeamJourneyStatus.tsx"), /href: `\/teams\/\$\{team\}\/setup`/);
  assert.match(source("src/features/teams/FounderTeamNavigation.tsx"), /key: "setup" as const/);
  assert.match(source("src/features/teams/TeamPageHeader.tsx"), /<FounderTeamNavigation/);
  // Teamfreigabe: fehlt sie, steht sie unter "Wartet auf euch"; steht sie, eingeklappt unten.
  assert.ok(page.indexOf("<TeamShareCard") > waiting && page.indexOf("<TeamShareCard") < core, "die fehlende Teamfreigabe steht nicht oben");
  assert.ok(page.lastIndexOf("<TeamShareCard") > history, "die bestehende Teamfreigabe liegt nicht unten");
  assert.ok(at("<LeaveTeamSection") > advisor, "Team verlassen steht nicht am Ende");
});

test("die Statuszeile behaelt vier getrennte Zustaende ohne Gesamtwert", () => {
  const status = source("src/features/teams/TeamJourneyStatus.tsx");
  const page = source(PAGE);
  // Nur Code pruefen - die Kommentare verneinen genau diese Woerter.
  const codeOnly = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const key of ["work", "venture", "report", "setup"]) {
    assert.match(status, new RegExp(`key: "${key}"`));
  }
  assert.doesNotMatch(codeOnly(`${status}\n${page}`), /\bpercent|Prozent|\d\s*%|\bprogress\b|Fortschritt|teamHealth|\bvon 4\b|\bof 4\b/i);
  // Bestaetigt heisst weiterhin: von allen aktuellen Mitgliedern.
  assert.match(status, /currentConfirmedRevision/);
  assert.match(status, /rosterConfirmationMissing/);
  for (const locale of ["de", "en"]) {
    const journey = (readJson(`messages/${locale}/teams.json`).homebase as Record<string, unknown>).journey as Record<string, Record<string, string>>;
    // "everyday" (seit 04.11.2026) ist eine eigene Station - kein Gesamtwert.
    assert.deepEqual(Object.keys(journey.items), ["work", "venture", "report", "setup", "everyday"]);
  }
});

test("Vertiefen zeigt nur vorhandene Paare und erfindet keine", () => {
  const page = source(PAGE);
  // Die Paarliste kommt ausschliesslich aus den bestehenden Relationships
  // des Readmodels - kein Kombinieren der Mitglieder zu theoretischen Paaren.
  assert.match(page, /team\.alignment\.map\(\(entry\) =>/);
  assert.doesNotMatch(page, /members\.flatMap|combinations|allPairs|createRelationship|ensure_founder_team_for_relationship/);
  // Ab drei Mitgliedern steht das Paar an jeder Zeile, und RMM/FitW sagen
  // ehrlich, dass sie nur zu zweit startbar sind.
  assert.match(page, /!isPairTeam \? \(\s*<p[^>]*>\{commitmentT\("pair"/);
  assert.match(page, /t\("deepen\.twoOnly"\)/);
});

test("die vier Alignment-Links sagen, was dahinter liegt", () => {
  for (const locale of ["de", "en"]) {
    const alignment = (
      (readJson(`messages/${locale}/teams.json`).homebase as Record<string, unknown>)
        .alignment as Record<string, string>
    );
    const labels = ["matchingReport", "workbook", "workspace", "report"].map((key) => alignment[key]);
    for (const [index, label] of labels.entries()) {
      assert.ok(label, `${locale}: Beschriftung ${index} fehlt`);
    }
    // Zwei Links hiessen beide "Report ansehen" beziehungsweise
    // "Matching-Report ansehen" - unterscheidbar war das nicht.
    assert.equal(new Set(labels).size, labels.length, `${locale}: zwei Links heissen gleich`);
  }

  // Der aktuelle Report steht zuerst, der aeltere zuletzt und leise.
  const page = source(PAGE);
  const current = page.indexOf('t("alignment.matchingReport")');
  const older = page.indexOf('t("alignment.report")');
  assert.ok(current > 0 && older > current, "der aeltere Report steht vor dem aktuellen");
  assert.doesNotMatch(
    page.slice(older - 400, older),
    /className=\{LINK_CLASS\}/,
    "der aeltere Report sieht aus wie ein gleichrangiger Knopf"
  );
});

test("ein neues Paar bekommt einen Startpunkt genannt", () => {
  const page = source(PAGE);
  // Absichtlich nur aus dem, was die Seite ohnehin weiss - ein falscher Rat
  // ist schlechter als keiner.
  assert.match(page, /const isNewPair =/);
  assert.match(page, /!setup\?\.started/);
  assert.match(page, /startedLabRelationships\.size === 0/);
  assert.match(page, /\{isNewPair \? \(/);

  for (const locale of ["de", "en"]) {
    const text = String(groups(locale).whereToStart ?? "");
    assert.ok(text.length > 60, `${locale}: der Startpunkt wird nicht erklaert`);
  }
});

test("jede Gruppe hat Titel und Erklaerung in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const all = groups(locale);
    for (const key of ["discover", "understand", "commit"]) {
      assert.ok(all[key]?.title, `${locale}: groups.${key}.title fehlt`);
      assert.ok((all[key]?.text ?? "").length > 40, `${locale}: groups.${key}.text erklaert nichts`);
    }
    assert.ok(all.resources?.title, `${locale}: groups.resources.title fehlt`);
  }
});
