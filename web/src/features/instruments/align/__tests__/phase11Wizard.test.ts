import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { alignmentDisplayText, alignmentSectionTitle } from "@/features/instruments/align/display";
import { followUpApplies } from "@/features/instruments/align/followUps";
import { buildSections } from "@/features/instruments/align/questionnaireData";
import { getItemsV22, getItemV22 } from "@/features/instruments/align/registries";
import { screenSet, stepOf } from "@/features/instruments/align/screens";
import { missingAnswersText, revealQuestion, scrollViewportToTop } from "@/features/instruments/align/wizardNavigation";
import { completenessV21, isIsoDate, validateAnswerV21 } from "@/features/instruments/v21/answersV21";
import { answerableOf } from "@/features/instruments/align/questionnaireData";

/**
 * Phase 1.1 - Vorhaben-Abgleich beim realen Ausfuellen.
 */

const read = (...path: string[]) => readFileSync(join(...path), "utf8");
const QUESTIONNAIRE = read("src", "features", "instruments", "align", "Questionnaire.tsx");
const FIELD = read("src", "features", "instruments", "v21", "AnswerFieldV21.tsx");
/** Ohne Kommentare - der Erklaertext nennt `<NumberRange />` ausdruecklich. */
const FIELD_CODE = FIELD.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---------------------------------------------------------------------------
// 1. Nach oben - bei JEDEM Schrittwechsel
// ---------------------------------------------------------------------------
test("scrollViewportToTop: ohne Animation, und der Wert steht danach wirklich auf 0", () => {
  const calls: unknown[] = [];
  const doc = { documentElement: { scrollTop: 640 }, body: { scrollTop: 640 } };
  scrollViewportToTop({ scrollTo: ((options: unknown) => calls.push(options)) as Window["scrollTo"], document: doc as unknown as Document });
  assert.deepEqual(calls, [{ top: 0, left: 0, behavior: "instant" }]);
  assert.equal(doc.documentElement.scrollTop, 0);
  assert.equal(doc.body.scrollTop, 0);
});

test("jeder Schrittwechsel laeuft ueber denselben Weg - nach dem Rendern", () => {
  // Alle Knoepfe (Weiter, Zurueck, Einleitung) gehen ueber `zuSchritt`; der
  // Sprung selbst sitzt im Layout-Effekt auf `step` - also nach dem Rendern
  // JEDES neuen Schritts, nicht davor.
  assert.match(QUESTIONNAIRE, /const zuSchritt = \(naechster: number\) => setStep\(naechster\);/);
  assert.match(QUESTIONNAIRE, /useLayoutEffect\(\(\) => \{[\s\S]*?scrollViewportToTop\(\);\s*kopf\.current\?\.focus\(\{ preventScroll: true \}\);\s*\}, \[step, sprung\]\);/);
  assert.match(QUESTIONNAIRE, /onClick=\{\(\) => zuSchritt\(schirm\.step \+ 1\)\}/);
  assert.match(QUESTIONNAIRE, /onClick=\{\(\) => zuSchritt\(schirm\.step - 1\)\}/);
  assert.equal((QUESTIONNAIRE.match(/window\.scrollTo/g) ?? []).length, 0, "kein zweiter, frueherer Sprung");
  // Die Kopfzeile ist fokussierbar, ohne selbst zu springen.
  assert.match(QUESTIONNAIRE, /ref=\{\(node\) => \{ kopf\.current = node; \}\} tabIndex=\{-1\}/);
  // Alle neun Schritte des Vorhabens haben Fragen - jeder Wechsel 1→2 … 8→9 nimmt diesen Weg.
  const venture = screenSet("venture_alignment", (itemId) => Boolean(getItemV22(itemId)));
  assert.deepEqual(venture.screens.map((s) => s.step), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  // `globals.css` setzt weiterhin smooth - deshalb muss `instant` ausdruecklich dastehen.
  assert.match(read("src", "app", "globals.css"), /scroll-behavior: smooth/);
  assert.match(read("src", "features", "instruments", "align", "wizardNavigation.ts"), /behavior: "instant"/);
});

// ---------------------------------------------------------------------------
// 2. Tippen: kein Neuaufbau, kein Speichern pro Taste
// ---------------------------------------------------------------------------
test("die Eingabefelder werden aufgerufen, nicht bei jedem Render neu als Komponente angelegt", () => {
  // Als <NumberRange /> entstand bei jedem Tastendruck ein neuer Komponententyp,
  // das <input> wurde ersetzt, der Fokus war weg.
  for (const name of ["SingleChoice", "MultiChoice", "ValueCase", "MoneyRange", "NumberRange", "PerPerson", "TimeWindows", "DateField", "SingleText", "RepeatableText", "PerEntryText", "FollowUpChoices"]) {
    assert.doesNotMatch(FIELD_CODE, new RegExp(`<${name}\\s*/>`), `${name} wird wieder als Komponente gerendert`);
  }
  assert.match(FIELD, /case "number_range":\s*return NumberRange\(\);/);
  assert.match(FIELD, /case "structured_text":\s*return SingleText\(\);/);
  // Keine Hooks in den inneren Feldern - sonst waere der Aufruf unzulaessig.
  const inner = FIELD.slice(FIELD.indexOf("function SingleChoice()"), FIELD.indexOf("function MissingChoices"));
  assert.doesNotMatch(inner, /\buse[A-Z]\w*\(/);
});

test("gespeichert wird nach einer Pause oder beim Verlassen - der Entwurf bleibt lokal", () => {
  assert.match(QUESTIONNAIRE, /TIPPEN\.has\(answerable\[itemId\]\?\.answerFormat \?\? ""\) \? 900 : 600/);
  for (const format of ["structured_text", "number_range", "money_range", "free_text_repeatable", "date"]) {
    assert.match(QUESTIONNAIRE, new RegExp(`"${format}",`), format);
  }
  // Tastendruck -> lokaler Zustand -> verzoegertes Speichern; das Speichern
  // schreibt den Entwurf NICHT zurueck (kein Ueberschreiben waehrend des Tippens).
  assert.match(QUESTIONNAIRE, /setAnswers\(\(current\) => \(\{ \.\.\.current, \[item\.itemId\]: next \}\)\);\s*persist\(item\.itemId, next\);/);
  const persist = QUESTIONNAIRE.slice(QUESTIONNAIRE.indexOf("const persist = useCallback"), QUESTIONNAIRE.indexOf("const jetztSpeichern"));
  assert.doesNotMatch(persist, /setAnswers/);
  assert.match(persist, /clearTimeout\(timers\.current\[itemId\]\)/);
  assert.equal((QUESTIONNAIRE.match(/onBlur=\{\(\) => jetztSpeichern\(item\.itemId\)\}/g) ?? []).length, 2);
  // Rueckmeldung bleibt dezent.
  assert.match(QUESTIONNAIRE, /t\("Gespeichert"\)/);
});

// ---------------------------------------------------------------------------
// 3. R02: Erwartung je andere Founder:in, numerisch, ohne Namen
// ---------------------------------------------------------------------------
test("R02 ist eine Zahl mit Einheit - und die Datenbank nimmt sie an", () => {
  const r02 = getItemV22("R02")!;
  assert.equal(r02.prompt, "Wie viele Stunden pro Woche sollten andere Founder:innen aus deiner Sicht in den nächsten zwölf Wochen pro Person verlässlich einbringen können?");
  assert.equal(r02.answerFormat, "number_range");
  assert.equal(r02.unit, "Stunden pro Woche");
  assert.doesNotMatch(r02.prompt, /\[Name\]/);
  // Keine Namen, auch wenn ein Partnername uebergeben wuerde.
  const view = buildSections("venture_alignment", "Tim & Maria Test").flatMap((s) => s.items).find((i) => i.itemId === "R02")!;
  assert.doesNotMatch(view.prompt, /Tim|Maria/);
  assert.equal(view.answerFormat, "number_range");
  assert.equal(view.unit, "Stunden pro Woche");
  // Der Wert, den das Feld schreibt ({ number, unit }), erfuellt die Pruefung -
  // und die DB-Regel alignment_answers_number_needs_unit (unit nicht leer).
  const value = { number: 15, unit: r02.unit };
  assert.equal(completenessV21("R02", value, answerableOf(r02)), "complete");
  assert.deepEqual(validateAnswerV21({ blockId: "R02", value }, answerableOf(r02)), { ok: true });
  assert.ok(String(value.unit).trim().length > 0);
  // Vorher: { perPerson: [...] } ohne unit - genau das lehnte die DB mit 23514 ab.
  assert.match(FIELD, /patch\(\{\s*number: event\.target\.value === "" \? undefined : Number\(event\.target\.value\),\s*unit,\s*\}\)/);
  // EN hat eine eigene Fassung.
  assert.notEqual(alignmentDisplayText(r02.prompt, "en"), r02.prompt);
  // Die Seite reicht keinen Namen mehr hinein.
  assert.match(read("src", "app", "(product)", "founder-alignment", "vorhaben", "page.tsx"), /sections=\{buildSections\("venture_alignment"\)\}/);
});

// ---------------------------------------------------------------------------
// 4. Anschlussfragen sofort - und nur, wo sie passen
// ---------------------------------------------------------------------------
test("„ab Datum“ zeigt sofort ein Datumsfeld; R05 nur bei einem Zeitpunkt", () => {
  const r04 = getItemV22("R04")!;
  assert.equal(r04.options.find((o) => o.optionId === "R04_o2")?.requiresDate, true);
  assert.match(FIELD, /\{option\.requiresDate && chosen === option\.optionId && \(\s*<input\s*type="date"/);
  // Ohne Datum ist „ab Datum" noch nicht fertig (kein Speichern einer halben Antwort) ...
  assert.equal(completenessV21("R04", { optionId: "R04_o2" }, answerableOf(r04)), "incomplete");
  assert.equal(completenessV21("R04", { optionId: "R04_o2", date: "2027-03-01" }, answerableOf(r04)), "complete");
  // ... aber ein frueherer Entwurf ohne Datum bleibt gueltig, ein kaputtes Datum nicht.
  assert.deepEqual(validateAnswerV21({ blockId: "R04", value: { optionId: "R04_o2" } }, answerableOf(r04)), { ok: true });
  assert.equal(validateAnswerV21({ blockId: "R04", value: { optionId: "R04_o2", date: "2027-02-30" } }, answerableOf(r04)).ok, false);
  assert.equal(isIsoDate("2027-03-01"), true);
  assert.equal(isIsoDate("01.03.2027"), false);

  const r05 = getItemV22("R05")!;
  const mit = (optionId: string) => (id: string) => (id === "R04" ? { value: { optionId } } : undefined);
  assert.equal(followUpApplies(r05, mit("R04_o1")), true);
  assert.equal(followUpApplies(r05, mit("R04_o2")), true);
  assert.equal(followUpApplies(r05, mit("R04_o3")), false);
  // Sichtbarkeit aus dem LOKALEN Zustand - nicht nach dem Speichern.
  assert.match(QUESTIONNAIRE, /followUpApplies\(\s*\{ showAfter: item\.basisItemId, showAfterOptions: item\.basisOptionIds \?\? null \},\s*\(itemId\) => answers\[itemId\],/);
  const view = buildSections("venture_alignment").flatMap((s) => s.items).find((i) => i.itemId === "R05")!;
  assert.deepEqual(view.basisOptionIds, ["R04_o1", "R04_o2"]);
  // Die uebrigen Anschlussfragen haengen weiterhin an jeder inhaltlichen Antwort.
  for (const item of getItemsV22("venture_alignment").filter((i) => i.showAfter && i.itemId !== "R05")) {
    assert.equal(item.showAfterOptions, undefined, item.itemId);
  }
});

test("L01 nennt Beispiele - als Hinweis, nicht als Antwortoptionen", () => {
  const l01 = getItemV22("L01")!;
  assert.match(l01.hint ?? "", /^Zum Beispiel bestimmte Finanzierungsformen, persönliche Bürgschaften/);
  assert.equal(l01.answerFormat, "free_text_repeatable");
  assert.equal(l01.options.length, 0);
  assert.notEqual(alignmentDisplayText(l01.hint!, "en"), l01.hint);
});

// ---------------------------------------------------------------------------
// 5. Fehlende Antworten: welche, und der Weg dorthin
// ---------------------------------------------------------------------------
test("Singular und Plural - DE und EN", () => {
  assert.equal(missingAnswersText(1, "de"), "Es fehlt noch 1 Antwort.");
  assert.equal(missingAnswersText(3, "de"), "Es fehlen noch 3 Antworten.");
  assert.equal(missingAnswersText(1, "en"), "1 answer is still missing.");
  assert.equal(missingAnswersText(2, "en"), "2 answers are still missing.");
});

test("„Zur Frage“ fuehrt auf den richtigen Schritt, zur Frage und ins Feld", () => {
  const venture = screenSet("venture_alignment", (itemId) => Boolean(getItemV22(itemId)));
  // Jede Frage, die fehlen kann, liegt auf genau einem Schritt.
  for (const item of getItemsV22("venture_alignment").filter((i) => !i.retired)) {
    assert.ok(stepOf(venture, item.itemId) !== null, `${item.itemId} hat keinen Schritt`);
  }
  assert.equal(stepOf(venture, "R02"), 4);
  assert.equal(stepOf(venture, "L03"), 9);
  assert.match(QUESTIONNAIRE, /const naechster = stepOf\(sourceScreens, itemId\);\s*if \(naechster !== null && naechster !== step\) setStep\(naechster\);\s*else setSprung\(\(zaehler\) => zaehler \+ 1\);/);
  assert.match(QUESTIONNAIRE, /if \(itemId && revealQuestion\(itemId\)\) return;/);
  assert.match(QUESTIONNAIRE, /onClick=\{\(\) => zurFrage\(itemId\)\}/);
  assert.match(QUESTIONNAIRE, /\{missingAnswersText\(missingAfterSubmit\.length, locale\)\}/);
  // Die Markierung an der Frage bleibt, und der Hinweis aufs Nichtbeantworten auch.
  assert.match(QUESTIONNAIRE, /missingAfterSubmit\.includes\(item\.itemId\)/);
  assert.match(QUESTIONNAIRE, /t\("Für jede Frage gibt es auch eine Antwort, die das Nichtbeantworten benennt/);
  assert.ok(alignmentDisplayText("Zur Frage", "en") !== "Zur Frage");

  // revealQuestion: scrollt die Karte an den Anfang und fokussiert ihr erstes Feld - ohne zweiten Sprung.
  const log: string[] = [];
  const field = { focus: (o: unknown) => log.push(`focus ${JSON.stringify(o)}`) };
  const card = {
    scrollIntoView: (o: unknown) => log.push(`scroll ${JSON.stringify(o)}`),
    querySelector: () => field,
    focus: () => log.push("card"),
  };
  const doc = { querySelector: (selector: string) => (selector === '[data-item-id="R02"]' ? card : null) };
  assert.equal(revealQuestion("R02", doc as unknown as Document), true);
  assert.deepEqual(log, ['scroll {"block":"start","behavior":"instant"}', 'focus {"preventScroll":true}']);
  assert.equal(revealQuestion("R02\"] *", doc as unknown as Document), false, "nur echte IDs");
});

// ---------------------------------------------------------------------------
// 6. Keine Blockcodes in sichtbaren Ueberschriften
// ---------------------------------------------------------------------------
test("Abschnittstitel ohne U/K-, S-, R- … Kuerzel - DE und EN; die Schluessel bleiben", () => {
  const sections = [...new Set(getItemsV22("venture_alignment").map((item) => item.section))];
  assert.ok(sections.some((s) => s.startsWith("U/K – ")), "der Schluessel selbst bleibt unveraendert");
  for (const locale of ["de", "en"] as const) {
    for (const section of sections) {
      const title = alignmentSectionTitle(section, locale);
      assert.doesNotMatch(title, /^[A-Z](\/[A-Z])*\s+[–-]/, `${locale}: ${title}`);
      assert.ok(title.length > 3);
    }
  }
  assert.equal(alignmentSectionTitle("U/K – Zusammenarbeit: Spielraum und Information", "de"), "Zusammenarbeit: Spielraum und Information");
  assert.equal(alignmentSectionTitle("S – Ziele & strategische Richtung", "de"), "Ziele & strategische Richtung");
  // Alle sichtbaren Stellen nutzen die Funktion.
  for (const path of [
    ["src", "features", "instruments", "v21", "ReportViewV21.tsx"],
    ["src", "features", "instruments", "v21", "ComparisonViewV21.tsx"],
    ["src", "features", "instruments", "align", "AlignMaps.tsx"],
    ["src", "features", "reporting", "workstyle", "TeamWorkstyleReport.tsx"],
  ]) {
    const source = read(...path);
    assert.match(source, /alignmentSectionTitle\(/, path.at(-1));
    // Sichtbarer Inhalt (nicht React-`key`): kein roher Abschnittsname mehr.
    assert.doesNotMatch(source, />\s*\{(t|copy)\(group\.section\)\}|>\s*\{t\(entry\.section\)\}/, path.at(-1));
  }
});

// ---------------------------------------------------------------------------
// 7. Vergleich mit FIND-Kontakten: erst im gemeinsamen Vorhaben
// ---------------------------------------------------------------------------
test("der Vorhaben-Vergleich erscheint nur im gemeinsamen Vorhaben", () => {
  const page = read("src", "app", "(product)", "founder-alignment", "vergleich", "[partnerId]", "page.tsx");
  assert.match(page, /const vorhaben = venture && zusammenImVorhaben\s*\? await buildScopeComparison\(\s*"venture_alignment", auth\.user\.id, partnerId, venture\.id,/);
  // Und die Antworten der anderen Person werden nur zu DIESEM Vorhaben gelesen.
  assert.match(read("src", "features", "instruments", "align", "comparisonData.ts"), /await suche\.eq\("venture_id", ventureId\)\.maybeSingle\(\)/);
});
