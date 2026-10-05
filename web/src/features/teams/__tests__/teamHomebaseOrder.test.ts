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
test("Phase 9.4B: Verstehen, Vertiefen, Vereinbaren - und Setup bleibt von oben erreichbar", () => {
  const page = source(PAGE);
  const at = (needle: string) => {
    const index = page.indexOf(needle);
    assert.ok(index > 0, `nicht gefunden: ${needle}`);
    return index;
  };

  const header = at('aria-labelledby="team-founders-title"');
  const status = at("<TeamJourneyStatus");
  const understand = at('t("groups.understand.title")');
  const deepen = at('t("groups.discover.title")');
  const agree = at('t("groups.commit.title")');
  const resources = at('t("groups.resources.title")');
  const history = at('id="team-alignment"');
  const advisor = at("<FounderRelationshipAdvisorPanel");

  // Die Ebenen in der Reihenfolge, in der ein Team sie benutzt.
  assert.ok(header < status && status < understand, "Kopf und Statuszeile stehen oben");
  assert.ok(understand < deepen && deepen < agree, "die drei Ebenen stehen nicht in Reihenfolge");
  assert.ok(agree < resources && resources < history && history < advisor, "Nachschlagen und Rueckblick stehen nicht am Ende");

  // Jedes Angebot sitzt in seiner Ebene.
  for (const entry of ["/workstyle`}", "ventureHref(team.id, journey.venture)", "/roles`}"]) {
    assert.ok(at(entry) > understand && at(entry) < deepen, `${entry} steht nicht unter Verstehen`);
  }
  for (const entry of ['aria-labelledby="commitment-lab-title"', "<ReadMyMindHomebaseCard", "<FounderInTheWildHomebaseCard"]) {
    assert.ok(at(entry) > deepen && at(entry) < agree, `${entry} steht nicht unter Vertiefen`);
  }
  assert.ok(at('aria-labelledby="team-setup-title"') > agree && at('aria-labelledby="team-setup-title"') < resources);
  assert.ok(at("<FounderLibraryHomebaseCard") > resources && at("<FounderLibraryHomebaseCard") < history);
  assert.ok(at('t("agreements.title")') > history, "historische Notizen stehen ausserhalb des Rueckblicks");

  // Die Zusage aus Phase 9.2 bleibt: Founder Setup ist vor den optionalen
  // Vertiefungen erreichbar - ueber die Statuszeile im Kopf und die
  // Teamnavigation, beide oberhalb von "Vertiefen".
  assert.match(source("src/features/teams/TeamJourneyStatus.tsx"), /href: `\/teams\/\$\{team\}\/setup`/);
  assert.match(source("src/features/teams/FounderTeamNavigation.tsx"), /key: "setup" as const/);
  // Phase 11.7B: Die Teamnavigation steht im kompakten Teamkopf ganz oben.
  assert.match(source("src/features/teams/TeamPageHeader.tsx"), /<FounderTeamNavigation/);
  assert.ok(at("<TeamPageHeader") < header, "der Teamkopf steht nicht ganz oben");
  // Teamfreigabe direkt unter dem Kopf, Team verlassen ganz am Ende.
  assert.ok(at("<TeamShareCard") > status && at("<TeamShareCard") < understand, "die Teamfreigabe steht nicht oben");
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
    assert.deepEqual(Object.keys(journey.items), ["work", "venture", "report", "setup"]);
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
