import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AREAS,
  PRODUCT_ITEMS,
  distinctNames,
  teamPatterns,
  type ProductMember,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import {
  areaPattern,
  individualNarratives,
  teamAreaFinding,
  type TeamMemberInput,
} from "@/features/reporting/workstyle/narrative";
import { readoutText } from "@/features/reporting/workstyle/alignmentModel";
import { currentPathForLegacyQuestionnaire, CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";

/**
 * Phase 10 - Berichtsqualitaet.
 *
 * Die Texte entstehen deterministisch aus den Antworten. Geprueft wird hier,
 * dass sie nur sagen, was die Antworten tragen: keine Richtung bei
 * gemischtem Muster, Interaktionshypothesen nur bei echten Gegenpolen,
 * Aehnlichkeit nicht als Vorteil, keine Mehrheitssprache bei 3-4 Foundern
 * und nirgends ein Wert, eine Prozentzahl oder ein Typ.
 */

type Values = Record<string, number | "A" | "B">;

/** Ein Profil, in dem alle Ordinal-Items `fallback` haben, ausser den genannten. */
function profile(id: string, fallback: number, overrides: Values = {}): ProductProfile {
  return {
    person_id: id,
    assessment_id: `a-${id}`,
    instrument_id: "founder-workstyle-pretest-8-5a-v3",
    manifest_version: "3.0.0",
    item_version: "8.4-v0.4",
    completed_at: "2026-10-04",
    answers: PRODUCT_ITEMS.map((i) => {
      const v = overrides[i.item_key] ?? fallback;
      return {
        item_key: i.item_key,
        item_version: i.item_version,
        value:
          i.response_format === "comparative"
            ? { optionId: v === "B" || (typeof v === "number" && v >= 3) ? "lean_b" : "lean_a" }
            : { scale: typeof v === "number" ? v : 3 },
        missing_reason: null,
      };
    }),
  } as ProductProfile;
}

const person = (id: string, name: string, p: ProductProfile): TeamMemberInput => ({ person_id: id, name, profile: p });
const evi = PRODUCT_ITEMS.filter((i) => i.area_key === "EVI").map((i) => i.item_key);

/** Alles, was ein Bericht an Text erzeugt - fuer die Negativpruefungen. */
function allText(people: TeamMemberInput[]) {
  const parts: string[] = [];
  for (const p of people)
    for (const { narrative: n } of individualNarratives(p.profile))
      parts.push(n.core, n.exception ?? "", n.note ?? "", n.question ?? "", ...n.itemNotes.map((x) => x.text), ...n.situations.map((s) => s.label));
  for (const a of AREAS) {
    const f = teamAreaFinding(people, a.key);
    parts.push(f.summary, f.hypothesis ?? "", f.question ?? "", ...f.situations.flatMap((s) => [s.label, ...s.groups.flatMap((g) => g.answers)]));
  }
  return parts.join("\n");
}

test("ein gemischtes Antwortmuster bekommt keine Richtung, sondern die Situationen", () => {
  const p = profile("1", 3, { [evi[0]]: 1, [evi[1]]: 5, [evi[2]]: 1, [evi[3]]: 5 });
  const pattern = areaPattern(p, "EVI");
  assert.equal(pattern.kind, "mixed");
  const n = individualNarratives(p).find((x) => x.area.key === "EVI")!.narrative;
  assert.ok(n.situations.length >= 2, "die konkreten Situationen fehlen");
  assert.equal(n.exception, null, "bei gemischtem Muster keine Ausnahme von einer Richtung");
});

test("eine getragene Richtung braucht mehrere gleichgerichtete Antworten", () => {
  const all = profile("1", 5);
  assert.deepEqual(areaPattern(all, "EVI"), { kind: "direction", band: "upper", strength: "all", exception: null });
  // Eine einzelne Gegenantwort kippt "most" in "mixed".
  const opposite = profile("2", 5, { [evi[0]]: 1 });
  assert.equal(areaPattern(opposite, "EVI").kind, "mixed");
});

test("Interaktionshypothesen nur bei echten Gegenpolen - und immer als Moeglichkeit", () => {
  const similar = [person("1", "Anna", profile("1", 4)), person("2", "Ben", profile("2", 5))];
  for (const a of AREAS) assert.notEqual(teamAreaFinding(similar, a.key).kind, "opposite");

  const nuance = [person("1", "Anna", profile("1", 3)), person("2", "Ben", profile("2", 5))];
  const f = teamAreaFinding(nuance, "EVI");
  assert.equal(f.kind, "nuance");
  assert.equal(f.hypothesis, null, "eine Nuance ist kein Konflikt");
  assert.equal(f.question, null);

  const opposite = [person("1", "Anna", profile("1", 1)), person("2", "Ben", profile("2", 5))];
  for (const a of AREAS) {
    const o = teamAreaFinding(opposite, a.key);
    assert.equal(o.kind, "opposite", a.key);
    assert.match(o.hypothesis ?? "", /könnte|kann/, `${a.key}: die Hypothese ist keine Moeglichkeit`);
    assert.match(o.question ?? "", /\?$/, `${a.key}: keine Gespraechsfrage`);
  }
});

test("Unterschied und Komplement entstehen nur aus Gegenpolen", () => {
  const m = (n: number, v: number): ProductMember => ({
    person_id: String(n), name: `P${n}`, capabilities: [], alignment: null, workstyle: profile(String(n), v),
  });
  // Mitte gegen klare Antwort: kein Komplement.
  assert.ok(teamPatterns([m(1, 3), m(2, 5)]).every((p) => !p.complement));
  // Gegenpole: Komplement moeglich.
  assert.ok(teamPatterns([m(1, 1), m(2, 5)]).some((p) => p.complement));
});

test("bei drei und vier Foundern keine Mehrheits- oder Lagersprache", () => {
  for (const n of [3, 4]) {
    const people = Array.from({ length: n }, (_, i) =>
      person(String(i), `Founder ${i}`, profile(String(i), i === 0 ? 1 : 5)),
    );
    const text = allText(people);
    assert.doesNotMatch(text, /Mehrheit|mehrheitlich|Minderheit|gegen \d|\d gegen|überstimm|Lager|Ausreißer|die meisten von euch/i);
    // Die Gruppen stehen in Skalenreihenfolge, nicht nach Groesse.
    const f = teamAreaFinding(people, "EVI");
    const first = f.situations[0].groups[0];
    assert.deepEqual(first.names, ["Founder 0"], "die Einzelantwort steht nicht an ihrem Skalenplatz");
  }
});

test("kein Wert, keine Prozentzahl, kein Typ, keine Diagnose im erzeugten Text", () => {
  const people = [
    person("1", "Anna", profile("1", 1)),
    person("2", "Ben", profile("2", 5)),
    person("3", "Cem", profile("3", 3)),
  ];
  const text = allText(people);
  assert.doesNotMatch(text, /\d\s*%|Prozent|Score|Punktzahl|Punktwert|Gesamtwert|Fit\b|Kompatib|Passung|Typ\b|Persönlichkeit(styp)?:|Diagnose|Ampel|besser als|schlechter als/i);
  // Aehnlichkeit wird nicht automatisch zum Vorteil.
  assert.doesNotMatch(text, /Vorteil|Stärke des Teams|perfekt|ideal/i);
});

test("gleiche Namen werden unterscheidbar gemacht", () => {
  const out = distinctNames([{ name: "Founder" }, { name: "Founder" }, { name: "Mia" }]);
  assert.deepEqual(out.map((p) => p.name), ["Founder 1", "Founder 2", "Mia"]);
});

test("Venture-Antworten werden kurz wiedergegeben, ohne die Frage zu wiederholen", () => {
  assert.equal(readoutText(null), null);
});

test("Cutover: fruehere Fragebogen-Einstiege fuehren in den aktuellen Weg", () => {
  assert.equal(currentPathForLegacyQuestionnaire(null), CURRENT_WORKSTYLE_HREF);
  assert.equal(currentPathForLegacyQuestionnaire("  "), CURRENT_WORKSTYLE_HREF);
  assert.equal(currentPathForLegacyQuestionnaire("inv 1"), "/join/start?invitationId=inv%201");
  assert.doesNotMatch(currentPathForLegacyQuestionnaire("x"), /\/me\/base|\/me\/values|pilot/);
});

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("Teamreport: eine Agenda, Einzelantworten im Anhang, keine Bewertungsgrafik", () => {
  const report = code("src/features/reporting/workstyle/TeamWorkstyleReport.tsx");
  // Die Agenda steht einmal - nicht zusaetzlich am Ende wiederholt.
  assert.equal((report.match(/id="agenda"/g) ?? []).length, 1);
  assert.ok(report.indexOf('id="agenda"') < report.indexOf('id="arbeitsweisen"'), "die Agenda steht nicht vorn");
  // Alle 29 Einzelantworten nur im Anhang.
  assert.match(report, /<details className="ws-appendix[^"]*" open=\{full\}>[\s\S]*?<WorkstyleSignature/);
  assert.doesNotMatch(report, /ReportViewV21/);
  assert.doesNotMatch(report, /score|percent|Prozent|ranking|Ampel|radar|spider|teamHealth/i);
  // Vereinbart ist nur, was alle aktuellen Mitglieder bestaetigt haben.
  assert.match(report, /team\.setup\.map/);
  assert.match(report, /alle aktuellen Mitglieder/);
});

test("Druck: Anhang nur in der ausfuehrlichen Fassung", () => {
  const css = src("src/features/reporting/workstyle/report.css");
  assert.match(css, /\.ws-report \.ws-appendix \{\s*display: none !important;\s*\}/);
  assert.match(css, /\.ws-report\.ws-print-full \.ws-appendix \{\s*display: block !important;/);
  for (const page of [
    "src/app/me/profile/workstyle/page.tsx",
    "src/app/(product)/teams/[teamId]/workstyle/page.tsx",
  ]) {
    const p = src(page);
    assert.match(p, /query\.ansicht === "ausfuehrlich"/, page);
    assert.match(p, /full=\{full\}/, page);
    // EN: Hinweis, dass der Bericht nur auf Deutsch vorliegt - kein Sprachmix.
    assert.match(p, /locale !== "de" && \(/, page);
    assert.match(p, /t\("germanOnly"\)/, page);
  }
});

test("Leerzustand fuehrt in den aktuellen Bogen", () => {
  const p = src("src/app/me/profile/workstyle/page.tsx");
  assert.match(p, /href=\{CURRENT_WORKSTYLE_HREF\}/);
  assert.match(p, /t\("emptyIndividualCta"\)/);
  for (const locale of ["de", "en"]) {
    const m = JSON.parse(src(`messages/${locale}/report.json`)).workstyle;
    assert.ok(m.emptyIndividualCta && m.germanOnly, locale);
  }
  assert.equal(JSON.parse(src("messages/de/report.json")).workstyle.emptyIndividualCta, "Wie du arbeitest ausfüllen");
});

test("Begriffe: Teamaenderung heisst 'erneut zu bestaetigen', nicht 'in Klaerung'", () => {
  const status = code("src/features/teams/TeamJourneyStatus.tsx");
  assert.match(status, /setup\.items\.some\(\(x\) => x\.rosterConfirmationMissing\)\s*\?\s*"reconfirm"/);
  for (const locale of ["de", "en"]) {
    const teams = JSON.parse(src(`messages/${locale}/teams.json`));
    assert.ok(teams.homebase.journey.setup.reconfirm, locale);
    // Eine Bezeichnung fuer die Team-Faehigkeitensicht - in Navigation, Kachel und Seite.
    const capability = JSON.parse(src(`messages/${locale}/capability.json`));
    assert.equal(teams.teamNavigation.roles, capability.team.title, locale);
    assert.equal(teams.homebase.understand.roles.title, capability.team.title, locale);
  }
});
