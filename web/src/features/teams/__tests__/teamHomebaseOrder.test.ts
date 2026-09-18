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
test("die Seite fuehrt von kennenlernen ueber verstehen zu verbindlich werden", () => {
  const page = source(PAGE);
  const at = (needle: string) => {
    const index = page.indexOf(needle);
    assert.ok(index > 0, `nicht gefunden: ${needle}`);
    return index;
  };

  const discover = at('t("groups.discover.title")');
  const understand = at('t("groups.understand.title")');
  const commit = at('t("groups.commit.title")');

  assert.ok(discover < understand, "verstehen steht vor kennenlernen");
  assert.ok(understand < commit, "verbindlich werden steht vor verstehen");

  // Und die Angebote sitzen in ihrer Gruppe.
  assert.ok(at("<ReadMyMindHomebaseCard") > discover);
  assert.ok(at("<FounderInTheWildHomebaseCard") > discover);
  assert.ok(at("<FounderInTheWildHomebaseCard") < understand, "ein Lab steht im falschen Abschnitt");
  assert.ok(at('id="team-alignment"') > understand);
  assert.ok(at('id="team-alignment"') < commit);
  assert.ok(at('aria-labelledby="commitment-lab-title"') > commit);
  assert.ok(at('aria-labelledby="team-setup-title"') > commit);
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
  assert.match(page, /!setupState\?\.started/);
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
